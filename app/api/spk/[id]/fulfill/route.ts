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
} from "@/lib/constants";

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

    if (spk.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "SPK harus IN_PROGRESS" },
        { status: 400 }
      );
    }

    /**
     * 🔒 VALIDASI PRODUKSI
     */
    const hasProduction = spk.spkItems.some(
      (i) => i.fulfillmentMethod === FulfillmentMethod.PRODUCTION
    );

    if (hasProduction) {
      const prs = await prisma.productionRequest.findMany({
        where: { spkNumber: spk.spkNumber },
        select: { status: true },
      });

      const allCompleted =
        prs.length > 0 &&
        prs.every((p) => p.status === ProductionRequestStatus.COMPLETED);

      if (!allCompleted) {
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
