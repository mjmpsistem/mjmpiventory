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
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const { id: spkId } = await params;
    const { spkItemId, additionalQty } = await request.json();

    if (!spkItemId || additionalQty == null || additionalQty <= 0) {
      return NextResponse.json(
        { error: "Data tidak lengkap atau kuantitas tidak valid" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Ambil detail item (bisa SpkItem atau SpkReturItem)
      let item = await tx.spkItem.findUnique({
        where: { id: spkItemId },
      }) as any;

      let isRetur = false;
      if (!item) {
        item = await (tx as any).spkReturItem.findUnique({
          where: { id: spkItemId },
        });
        isRetur = true;
      }

      if (!item) {
        throw new Error("Item SPK tidak ditemukan");
      }

      // 1.1) Cek Approval Bahan Baku
      if (item.productionRequestId) {
        const pr = await tx.productionRequest.findUnique({
          where: { id: item.productionRequestId },
          select: { status: true }
        });
        if (pr && pr.status === "PENDING") {
          throw new Error("Produksi belum bisa dicatat karena permintaan bahan baku belum di-approve oleh Admin Gudang.");
        }
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
          // AUTO-CREATE
          const units = await tx.unit.findMany();
          const targetUnit = units.find(u => u.name.toUpperCase() === (item.satuan || "").toUpperCase()) || units[0];
          const itemTypes = await tx.itemType.findMany({ where: { category: "BARANG_JADI" } });
          const targetType = itemTypes[0];

          const newItem = await tx.item.create({
            data: {
              code: `AUTO-${item.id.substring(0, 8).toUpperCase()}`,
              name: item.namaBarang,
              category: "BARANG_JADI",
              unitId: targetUnit?.id || "7d4d93cb-0a2c-4f72-b537-25b4feeabbc5",
              itemTypeId: targetType?.id || "51ec32b2-debc-441b-affb-f339a6bcf8a7",
              currentStock: 0,
              isActive: true,
            }
          });
          itemId = newItem.id;
        }
      }

      // 3) Update Saldo
      const newProducedQty = (item.producedQty || 0) + additionalQty;
      const newReadyQty = (item.readyQty || 0) + additionalQty;
      const isDone = newProducedQty >= item.qty;

      let updatedItem;
      if (!isRetur) {
        updatedItem = await tx.spkItem.update({
          where: { id: spkItemId },
          data: {
            producedQty: newProducedQty,
            readyQty: newReadyQty,
            itemId: itemId,
            fulfillmentStatus: isDone ? "DONE" : item.fulfillmentStatus,
          },
        });
      } else {
        updatedItem = await (tx as any).spkReturItem.update({
          where: { id: spkItemId },
          data: {
            producedQty: newProducedQty,
            readyQty: newReadyQty,
            itemId: itemId,
            fulfillmentStatus: isDone ? "DONE" : item.fulfillmentStatus,
          },
        });
      }

      // 3.1) Update Physical Stock & Record Transaction ONLY for Manual Production
      // SPK-based production does NOT enter general stock (it stays in readyQty)
      const isManual = !spkId || (!isRetur && spkId.startsWith("manual-")); // Placeholder logic for now
      
      // Better: Check if the PR linked to this item is manual
      let isPRManual = false;
      if (item.productionRequestId) {
        const pr = await tx.productionRequest.findUnique({
          where: { id: item.productionRequestId },
          select: { spkNumber: true, spkReturNumber: true }
        });
        if (pr && !pr.spkNumber && !pr.spkReturNumber) {
          isPRManual = true;
        }
      }

      if (itemId && isPRManual) {
        const memo = `Hasil produksi masuk (Manual): ${item.namaBarang}`;
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

        const { updateStock } = await import("@/lib/stock");
        await updateStock(itemId, additionalQty, TransactionType.MASUK, authUser.userId, memo, transaction.id, tx);
      }

      // 3.2) SAFETY CHECK: Move to IN_PROGRESS
      if (!isRetur) {
        const spk = await tx.spk.findUnique({
          where: { id: spkId },
        });
        if (spk && spk.status === SpkStatus.QUEUE) {
          await tx.spk.update({
            where: { id: spk.id },
            data: { status: SpkStatus.IN_PROGRESS, inventoryApproved: true, inventoryApprovedAt: new Date() },
          });
        }
      } else {
        const spkRetur = await (tx as any).spkRetur.findUnique({
          where: { id: spkId },
        });
        if (spkRetur && spkRetur.status === "QUEUE") {
          await (tx as any).spkRetur.update({
            where: { id: spkRetur.id },
            data: { status: "IN_PROGRESS" },
          });
        }
      }

      return updatedItem;
    });

    // 4) Notifikasi ke Gudang bahwa ada barang baru yang siap kirim
    try {
      const isComplete = result.fulfillmentStatus === "DONE";
      await prisma.notification.create({
        data: {
          title: isComplete ? "Produksi Selesai" : "Hasil Produksi Masuk",
          message: isComplete 
            ? `Produksi ${result.namaBarang} (SPK #${result.spkId.substring(0, 8)}) telah selesai. Siap di-approve!`
            : `${additionalQty} unit ${result.namaBarang} baru saja selesai dan siap dikirim.`,
          type: isComplete ? "SUCCESS" : "INFO",
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
