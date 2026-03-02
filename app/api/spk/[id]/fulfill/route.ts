/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fulfillReservedStock } from "@/lib/stock";
import {
  UserRole,
  FulfillmentMethod,
  FulfillmentStatus,
  TransactionType,
  TransactionSource,
  ProductionRequestStatus,
  SpkStatus,
} from "@/lib/constants";
import { updateSpkStatusIfReady } from "@/lib/spk-status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { id } = await params;
    const body = await request.json();

    // Support both new { items: [...] } and old { spkItemIds: [...] } formats
    let itemsToProcess: Array<{ spkItemId: string; quantity: number }> = [];

    if (body.items && Array.isArray(body.items)) {
      itemsToProcess = body.items;
    } else if (body.spkItemIds && Array.isArray(body.spkItemIds)) {
      // Backward compatibility: treat as full readyQty ship
      itemsToProcess = body.spkItemIds.map((sid: string) => ({
        spkItemId: sid,
        quantity: -1, // signal to use full readyQty
      }));
    }

    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada item untuk diproses" },
        { status: 400 }
      );
    }

    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        lead: true,
        spkItems: true,
      },
    });

    if (!spk) {
      return NextResponse.json({ error: "SPK tidak ditemukan" }, { status: 404 });
    }

    // 🚀 START TRANSACTION
    return await prisma.$transaction(async (tx) => {
      let totalUnitsShipped = 0;

      for (const entry of itemsToProcess) {
        const itemInDb = spk.spkItems.find((i) => i.id === entry.spkItemId);
        if (!itemInDb) continue;

        // Tentukan jumlah yang dikirim
        const shipQty = entry.quantity === -1 ? itemInDb.readyQty : entry.quantity;

        if (shipQty <= 0) continue;
        if (shipQty > itemInDb.readyQty) {
          throw new Error(`Kuantitas kirim ${itemInDb.namaBarang} melebihi saldo Siap Kirim (${itemInDb.readyQty})`);
        }

        const memo = `Pengiriman parsial SPK ${spk.spkNumber} - ${itemInDb.namaBarang}`;

        // 1) Ambil atau Cari itemId (Fallback Search)
        let currentItemId = itemInDb.itemId;

        if (!currentItemId) {
          // Cari di Master Data berdasarkan nama dan kategori BARANG_JADI
          const matchedItem = await tx.item.findFirst({
            where: {
              name: { contains: itemInDb.namaBarang, mode: "insensitive" },
              category: "BARANG_JADI",
            },
          });

          if (matchedItem) {
            currentItemId = matchedItem.id;
          } else {
            // AUTO-CREATE: Jika benar-benar tidak ada di Master Data, buat otomatis
            console.log(`[AUTO-CREATE] Creating missing item for fulfillment: ${itemInDb.namaBarang}`);
            
            // Cari Unit yang cocok
            const units = await tx.unit.findMany();
            const targetUnit = units.find(u => u.name.toUpperCase() === (itemInDb.satuan || "").toUpperCase()) || units[0];
            
            // Cari ItemType default (Barang Jadi)
            const itemTypes = await tx.itemType.findMany({ where: { category: "BARANG_JADI" } });
            const targetType = itemTypes[0];

            const newItem = await tx.item.create({
              data: {
                code: `AUTO-${itemInDb.id.substring(0, 8).toUpperCase()}`,
                name: itemInDb.namaBarang,
                category: "BARANG_JADI",
                unitId: targetUnit?.id || "7d4d93cb-0a2c-4f72-b537-25b4feeabbc5", 
                itemTypeId: targetType?.id || "51ec32b2-debc-441b-affb-f339a6bcf8a7", 
                currentStock: 0,
                isActive: true,
              }
            });
            currentItemId = newItem.id;
            console.log(`[AUTO-CREATE] New Item ID: ${currentItemId}`);
          }

          if (currentItemId) {
            // Sinkronisasi permanen ke spk_item agar transaksi selanjutnya lancar
            await tx.spkItem.update({
              where: { id: itemInDb.id },
              data: { itemId: currentItemId },
            });
            console.log(`[SYNC] Linked ${itemInDb.namaBarang} to itemId: ${currentItemId}`);
          }
        }

        // 1.1) Safety Check: Auto-fill stock for PRODUCTION/TRADING if physical stock is lacking
        // Ini mencegah error "Stock tidak boleh minus" jika user lupa Lapor Hasil tapi barang sudah siap kirim.
        if (currentItemId && (itemInDb.fulfillmentMethod === FulfillmentMethod.PRODUCTION || itemInDb.fulfillmentMethod === FulfillmentMethod.TRADING)) {
          const itemMaster = await tx.item.findUnique({ 
            where: { id: currentItemId },
            select: { currentStock: true } 
          });
          
          if (itemMaster && itemMaster.currentStock < shipQty) {
            const diff = shipQty - itemMaster.currentStock;
            console.log(`[SAFETY] Auto-filling stock for ${itemInDb.namaBarang}: +${diff}`);
            
            const fillMemo = `Penyesuaian stok otomatis (Safety) untuk pengiriman SPK #${spk.spkNumber}`;
            const fillTx = await tx.transaction.create({
              data: {
                date: new Date(),
                type: TransactionType.MASUK,
                source: itemInDb.fulfillmentMethod === FulfillmentMethod.PRODUCTION 
                  ? TransactionSource.PRODUKSI 
                  : TransactionSource.TRADING,
                itemId: currentItemId,
                quantity: diff,
                memo: fillMemo,
                userId: authUser.userId,
              }
            });

            const { updateStock } = await import("@/lib/stock");
            await updateStock(
              currentItemId,
              diff,
              TransactionType.MASUK,
              authUser.userId,
              fillMemo,
              fillTx.id,
              tx
            );
          }
        }

        // 2) Update Saldo Item SPK
        // Di alur baru ini: Approval murni verifikasi & gatekeeping.
        // - Untuk PRODUCTION: ReadyQty sudah bertambah di production-progress.
        // - Untuk FROM_STOCK: ReadyQty sudah diset di handleSpkInProgress.
        // - Untuk TRADING: ReadyQty mungkin baru bertambah di sini saat barang vendor datang.
        
        let newReadyQty = itemInDb.readyQty;
        // Jika TRADING dan belum ready, atau jika kita ingin menambah saldo ready secara manual lewat approval
        if (itemInDb.fulfillmentMethod === FulfillmentMethod.TRADING) {
          newReadyQty = (itemInDb.readyQty || 0) + shipQty;
        } else {
           // Untuk Production/Stock, pastikan readyQty minimal sebesar yang di-approve
           newReadyQty = Math.max(itemInDb.readyQty || 0, shipQty);
        }

        const newApprovedQty = (itemInDb.approvedQty || 0) + shipQty;

        await tx.spkItem.update({
          where: { id: itemInDb.id },
          data: {
            readyQty: newReadyQty,
            approvedQty: newApprovedQty,
            fulfillmentStatus: FulfillmentStatus.READY
          },
        });

        totalUnitsShipped += shipQty;
      }

       // 4) Update Status SPK (READY_TO_SHIP / PARTIAL)
       // Cek apakah ini pengiriman total atau parsial (berdasarkan otorisasi/izin)
       const allSpkItems = await tx.spkItem.findMany({ where: { spkId: spk.id } });
       const totalRequired = allSpkItems.reduce((sum: number, item: any) => sum + item.qty, 0);
       const totalApproved = allSpkItems.reduce((sum: number, item: any) => sum + (item.approvedQty || 0), 0);
 
       let nextStatus: any = SpkStatus.READY_TO_SHIP;
       
       // Jika yang "jauh" (approved) masih kurang dari total yang diminta, berarti PARTIAL
       if (totalApproved < totalRequired - 0.01) {
         nextStatus = SpkStatus.PARTIAL;
       }

      if (spk.status === SpkStatus.DONE || spk.status === SpkStatus.SHIPPING) {
         nextStatus = spk.status as any;
      }

      if (nextStatus !== spk.status || !(spk as any).warehouseApproved) {
        await tx.spk.update({
          where: { id: spk.id },
          data: { 
            status: nextStatus as any,
            warehouseApproved: true,
            warehouseApprovedAt: new Date()
          } as any
        });
      }

      // 5) Notifikasi
      try {
        await tx.notification.create({
          data: {
            title: "Barang Siap Dikirim",
            message: `SPK #${spk.spkNumber}: ${totalUnitsShipped} unit telah siap di gudang pengiriman.`,
            type: "SUCCESS",
            targetUrl: "/shipping",
          },
        });
      } catch (e) {
        console.error("Failed to notify", e);
      }

      return NextResponse.json({
        message: `Berhasil menyiapkan ${totalUnitsShipped} unit untuk dikirim. Silakan proses di halaman Pengiriman.`,
      });
    });

  } catch (error: any) {
    console.error("Fulfill partial error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat proses pengiriman" },
      { status: 500 }
    );
  }
}
