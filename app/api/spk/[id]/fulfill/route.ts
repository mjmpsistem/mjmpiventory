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
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

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
      include: { lead: true, spkItems: true },
    });

    let spkRetur: any = null;
    if (!spk) {
      spkRetur = await (prisma as any).spkRetur.findUnique({
        where: { id },
        include: { parentSpk: { include: { lead: true } }, returnItems: true },
      });
    }

    if (!spk && !spkRetur) {
      return NextResponse.json({ error: "SPK tidak ditemukan" }, { status: 404 });
    }

    const isRetur = !!spkRetur;
    const itemsInDb = isRetur ? spkRetur!.returnItems : spk!.spkItems;
    const spkNumber = isRetur ? spkRetur!.spkNumber : spk!.spkNumber;

    // 🚀 START TRANSACTION
    return await prisma.$transaction(async (tx) => {
      let totalUnitsShipped = 0;

      for (const entry of itemsToProcess) {
        const itemInDb = itemsInDb.find((i: any) => i.id === entry.spkItemId);
        if (!itemInDb) continue;

        const shipQty = entry.quantity === -1 ? itemInDb.readyQty : entry.quantity;
        if (shipQty <= 0) continue;
        if (shipQty > itemInDb.readyQty) {
          throw new Error(`Kuantitas kirim ${itemInDb.namaBarang} melebihi saldo Siap Kirim (${itemInDb.readyQty})`);
        }

        const memo = `Pengiriman parsial ${isRetur ? "Retur" : "SPK"} ${spkNumber} - ${itemInDb.namaBarang}`;

        let currentItemId = itemInDb.itemId;
        if (!currentItemId) {
          const matchedItem = await tx.item.findFirst({
            where: { name: { contains: itemInDb.namaBarang, mode: "insensitive" }, category: "BARANG_JADI" },
          });

          if (matchedItem) {
            currentItemId = matchedItem.id;
          } else {
            const units = await tx.unit.findMany();
            const targetUnit = units.find(u => u.name.toUpperCase() === (itemInDb.satuan || "").toUpperCase()) || units[0];
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
          }

          if (currentItemId) {
            if (!isRetur) {
              await tx.spkItem.update({ where: { id: itemInDb.id }, data: { itemId: currentItemId } });
            } else {
              await (tx as any).spkReturItem.update({ where: { id: itemInDb.id }, data: { itemId: currentItemId } });
            }
          }
        }

        // Safety Stock adjustment removed for PRODUCTION as per user request
        // Production results stay in virtual 'readyQty' for the specific SPK
        if (currentItemId && itemInDb.fulfillmentMethod === FulfillmentMethod.TRADING) {
          const itemMaster = await tx.item.findUnique({ where: { id: currentItemId }, select: { currentStock: true } });
          if (itemMaster && itemMaster.currentStock < shipQty) {
            const diff = shipQty - itemMaster.currentStock;
            const fillMemo = `Penyesuaian stok otomatis (Safety) untuk pengiriman ${isRetur ? "Retur" : "SPK"} #${spkNumber}`;
            const fillTx = await tx.transaction.create({
              data: {
                date: new Date(),
                type: TransactionType.MASUK,
                source: TransactionSource.TRADING,
                itemId: currentItemId,
                quantity: diff,
                memo: fillMemo,
                userId: authUser.userId,
              }
            });
            const { updateStock } = await import("@/lib/stock");
            await updateStock(currentItemId, diff, TransactionType.MASUK, authUser.userId, fillMemo, fillTx.id, tx);
          }
        }
        
        const newApprovedQty = (itemInDb.approvedQty || 0) + shipQty;
        const newReadyQty = itemInDb.fulfillmentMethod === FulfillmentMethod.TRADING ? (itemInDb.readyQty || 0) + shipQty : Math.max(itemInDb.readyQty || 0, shipQty);

        if (!isRetur) {
          await tx.spkItem.update({
            where: { id: itemInDb.id },
            data: { readyQty: newReadyQty, approvedQty: newApprovedQty, fulfillmentStatus: FulfillmentStatus.READY },
          });
        } else {
          await (tx as any).spkReturItem.update({
            where: { id: itemInDb.id },
            data: { readyQty: newReadyQty, approvedQty: newApprovedQty, fulfillmentStatus: "READY" },
          });
        }

        totalUnitsShipped += shipQty;
      }

       // 4) Update Status SPK/Retur
       const finalItemsToCalculate = isRetur ? await (tx as any).spkReturItem.findMany({ where: { spkReturId: id } }) : await tx.spkItem.findMany({ where: { spkId: id } });
       const totalRequired = finalItemsToCalculate.reduce((sum: number, item: any) => sum + item.qty, 0);
       const totalApproved = finalItemsToCalculate.reduce((sum: number, item: any) => sum + (item.approvedQty || 0), 0);
 
       let nextStatus: any = isRetur ? "READY_TO_SHIP" : SpkStatus.READY_TO_SHIP;
       if (totalApproved < totalRequired - 0.01) {
         nextStatus = isRetur ? "PARTIAL" : SpkStatus.PARTIAL;
       }

       const currentStatus = isRetur ? spkRetur!.status : spk!.status;
       const warehouseApproved = isRetur ? false : (spk as any)?.warehouseApproved;

       if (nextStatus !== currentStatus || !warehouseApproved) {
         if (!isRetur) {
           await tx.spk.update({
             where: { id },
             data: { status: nextStatus, warehouseApproved: true, warehouseApprovedAt: new Date() } as any
           });
         } else {
           await (tx as any).spkRetur.update({
             where: { id },
             data: { status: nextStatus }
           });
         }
       }

      // 5) Notifikasi
      try {
        await tx.notification.create({
          data: {
            title: "Barang Siap Dikirim",
            message: `${isRetur ? "Retur" : "SPK"} #${spkNumber}: ${totalUnitsShipped} unit telah siap di gudang pengiriman.`,
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
