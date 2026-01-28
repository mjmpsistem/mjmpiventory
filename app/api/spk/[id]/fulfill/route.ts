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

    // ⬇️ INI KUNCI NYA
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID SPK tidak valid" },
        { status: 400 }
      );
    }

    const { spkItemIds } = await request.json();

    if (!Array.isArray(spkItemIds) || spkItemIds.length === 0) {
      return NextResponse.json(
        { error: "spkItemIds wajib diisi" },
        { status: 400 }
      );
    }

    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        lead: true,
        spkItems: {
          include: { item: true },
        },
      },
    });

    if (!spk) {
      return NextResponse.json(
        { error: "SPK tidak ditemukan" },
        { status: 404 }
      );
    }

    // Debug: Log status SPK
    console.log("🔍 DEBUG fulfill route:", {
      spkId: spk.id,
      spkNumber: spk.spkNumber,
      currentStatus: spk.status,
      statusType: typeof spk.status,
      expectedIN_PROGRESS: SpkStatus.IN_PROGRESS,
      expectedREADY_TO_SHIP: SpkStatus.READY_TO_SHIP,
      isIN_PROGRESS: spk.status === SpkStatus.IN_PROGRESS,
      isREADY_TO_SHIP: spk.status === SpkStatus.READY_TO_SHIP,
    });

    // Validasi status: IN_PROGRESS atau READY_TO_SHIP (sesuai dengan finished-goods-approval)
    if (
      spk.status !== SpkStatus.IN_PROGRESS &&
      spk.status !== SpkStatus.READY_TO_SHIP
    ) {
      console.error("SPK status validation failed:", {
        spkId: spk.id,
        spkNumber: spk.spkNumber,
        currentStatus: spk.status,
        statusType: typeof spk.status,
        expectedStatuses: [SpkStatus.IN_PROGRESS, SpkStatus.READY_TO_SHIP],
      });
      return NextResponse.json(
        {
          error: `SPK harus ${SpkStatus.IN_PROGRESS} atau ${SpkStatus.READY_TO_SHIP}. Status saat ini: ${spk.status}`,
        },
        { status: 400 }
      );
    }

    /**
     * 🔒 VALIDASI PRODUKSI
     * Cek apakah SPK item dengan fulfillmentMethod PRODUCTION sudah DONE/COMPLETED/FULFILLED
     */
    const productionItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === FulfillmentMethod.PRODUCTION
    );

    if (productionItems.length > 0) {
      const PRODUCTION_DONE_STATUSES = [
        "DONE",
        FulfillmentStatus.COMPLETED,
        FulfillmentStatus.FULFILLED,
      ];

      const allProductionDone = productionItems.every((i) =>
        PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus)
      );

      if (!allProductionDone) {
        return NextResponse.json(
          { error: "Produksi belum selesai" },
          { status: 400 }
        );
      }
    }

    /**
     * ✅ ITEM BOLEH APPROVE
     */
    const items = spk.spkItems.filter(
      (i) =>
        spkItemIds.includes(i.id) &&
        i.fulfillmentMethod === FulfillmentMethod.FROM_STOCK &&
        i.fulfillmentStatus === FulfillmentStatus.COMPLETED &&
        i.itemId
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada item yang bisa di-approve" },
        { status: 400 }
      );
    }

    /**
     * 🚀 TRANSACTION
     * - Buat transaksi barang keluar
     * - Fulfill reserved stock (kurangi BOTH currentStock & reservedStock)
     */
    return await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const memo = `Barang keluar SPK ${spk.spkNumber} - ${item.namaBarang}`;

        // 1) Catat transaksi barang keluar
        const transaction = await tx.transaction.create({
          data: {
            date: new Date(),
            type: TransactionType.KELUAR,
            source: TransactionSource.ORDER_CUSTOMER,
            itemId: item.itemId!,
            quantity: item.qty,
            destination: spk.lead.nama_toko || "Customer",
            spkNumber: spk.spkNumber,
            memo,
            userId: authUser.userId,
          },
        });

        // 2) Fulfill reserved stock -> kurangi currentStock & reservedStock sekaligus
        await fulfillReservedStock(
          item.itemId!,
          item.qty,
          authUser.userId,
          memo,
          transaction.id,
          tx
        );

        // 3) Update status item di SPK
        await tx.spkItem.update({
          where: { id: item.id },
          data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
        });
      }

      await updateSpkStatusIfReady(spk.id, tx);

      return NextResponse.json({
        message: `${items.length} item berhasil di-approve`,
      });
    });
  } catch (error) {
    console.error("Approve SPK error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat approve barang jadi" },
      { status: 500 }
    );
  }
}
