/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, FulfillmentStatus, TransactionType, TransactionSource, SpkStatus, FulfillmentMethod } from "@/lib/constants";

/**
 * API untuk melaporkan hasil produksi per item SPK secara bertahap.
 * Ini akan menambah saldo producedQty dan readyQty (Siap Kirim).
 */
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

    const { id: spkId } = await params;
    const { spkItemId, additionalQty } = await request.json();

    if (!spkItemId || additionalQty == null || additionalQty <= 0) {
      return NextResponse.json(
        { error: "Data tidak lengkap atau kuantitas tidak valid" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Ambil detail item SPK
      const item = await tx.spkItem.findUnique({
        where: { id: spkItemId },
      });

      if (!item || item.spkId !== spkId) {
        throw new Error("Item SPK tidak ditemukan");
      }

      // 2) Fallback: Jika itemId Master Data belum ada, cari berdasarkan nama
      let itemId = item.itemId;
      if (!itemId) {
        const matchedItem = await tx.item.findFirst({
          where: {
            name: { contains: item.namaBarang, mode: "insensitive" },
            category: "BARANG_JADI",
          },
        });
        
        if (matchedItem) {
          itemId = matchedItem.id;
        } else {
          // AUTO-CREATE: Jika benar-benar tidak ada di Master Data, buat otomatis
          console.log(`[AUTO-CREATE] Creating missing item: ${item.namaBarang}`);
          
          // Cari Unit yang cocok
          const units = await tx.unit.findMany();
          const targetUnit = units.find(u => u.name.toUpperCase() === (item.satuan || "").toUpperCase()) || units[0];
          
          // Cari ItemType default (Barang Jadi)
          const itemTypes = await tx.itemType.findMany({ where: { category: "BARANG_JADI" } });
          const targetType = itemTypes[0]; // Ambil yang ada saja jika tidak ada "General"

          const newItem = await tx.item.create({
            data: {
              code: `AUTO-${item.id.substring(0, 8).toUpperCase()}`,
              name: item.namaBarang,
              category: "BARANG_JADI",
              unitId: targetUnit?.id || "7d4d93cb-0a2c-4f72-b537-25b4feeabbc5", // Fallback to PCS ID if needed
              itemTypeId: targetType?.id || "51ec32b2-debc-441b-affb-f339a6bcf8a7", // Fallback to PE Bening ID
              currentStock: 0,
              isActive: true,
            }
          });
          itemId = newItem.id;
          console.log(`[AUTO-CREATE] New Item ID: ${itemId}`);
        }
      }

      // 3) Update Saldo
      const newProducedQty = (item.producedQty || 0) + additionalQty;
      const newReadyQty = (item.readyQty || 0) + additionalQty;
      
      // Update item status jika sudah mencapai target
      const isDone = newProducedQty >= item.qty;

      const updatedItem = await tx.spkItem.update({
        where: { id: spkItemId },
        data: {
          producedQty: newProducedQty,
          readyQty: newReadyQty,
          itemId: itemId, // Sinkronisasi ID jika ditemukan
          fulfillmentStatus: isDone ? "DONE" : item.fulfillmentStatus,
        },
      });

      // 3.1) Update Physical Stock & Record Transaction (MASUK from PRODUCTION)
      if (itemId) {
        const memo = `Hasil produksi masuk: ${item.namaBarang} (SPK #${spkId.substring(0, 8)})`;
        
        // Buat record transaksi agar muncul di laporan Barang Masuk
        const transaction = await tx.transaction.create({
          data: {
            date: new Date(),
            type: TransactionType.MASUK,
            source: TransactionSource.PRODUKSI,
            itemId: itemId,
            quantity: additionalQty,
            memo: memo,
            userId: authUser.userId,
          }
        });

        // Update stok fisik di Master Data
        const { updateStock } = await import("@/lib/stock");
        await updateStock(
          itemId,
          additionalQty,
          TransactionType.MASUK,
          authUser.userId,
          memo,
          transaction.id,
          tx
        );
      }

      // 3.2) SAFETY CHECK: Jika SPK masih QUEUE, pindahkan ke IN_PROGRESS
      const spk = await tx.spk.findUnique({
        where: { id: spkId },
        include: { spkItems: true }
      });

      if (spk && spk.status === SpkStatus.QUEUE) {
        console.log(`[SAFETY] Moving SPK #${spk.spkNumber} to IN_PROGRESS upon progress report`);
        const updatedSpk = await tx.spk.update({
          where: { id: spk.id },
          data: { 
            status: SpkStatus.IN_PROGRESS,
            inventoryApproved: true,
            inventoryApprovedAt: new Date(),
          },
          include: { spkItems: true }
        });

        // Pastikan item stok juga ikut siap
        for (const sItem of updatedSpk.spkItems) {
          if (sItem.fulfillmentMethod === FulfillmentMethod.FROM_STOCK && sItem.readyQty === 0) {
            await tx.spkItem.update({
              where: { id: sItem.id },
              data: { 
                readyQty: sItem.qty,
                fulfillmentStatus: FulfillmentStatus.RESERVED 
              },
            });
          }
        }
      }

      return updatedItem;
    });

    // 4) Notifikasi ke Gudang bahwa ada barang baru yang siap kirim
    try {
      await prisma.notification.create({
        data: {
          title: "Hasil Produksi Masuk",
          message: `${additionalQty} unit ${result.namaBarang} baru saja selesai dan siap dikirim.`,
          type: "INFO",
          targetUrl: "/approval-barang-jadi",
        },
      });
    } catch (e) {
      console.error("Notification error", e);
    }

    return NextResponse.json({ 
      message: "Progres produksi berhasil dicatat",
      item: result 
    });

  } catch (error: any) {
    console.error("Production progress error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat mencatat progres" },
      { status: 500 }
    );
  }
}
