/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  SpkStatus,
  FulfillmentMethod,
  FulfillmentStatus,
  TransactionType,
  TransactionSource,
} from "@/lib/constants";
import { updateSpkStatusIfReady } from "@/lib/spk-status";

/**
 * Approve TRADING items untuk SPK
 * Update fulfillmentStatus menjadi FULFILLED untuk item TRADING
 * Tidak perlu mengurangi stok karena barang dari vendor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID SPK tidak valid" },
        { status: 400 },
      );
    }

    const { spkItemIds } = await request.json();

    if (!Array.isArray(spkItemIds) || spkItemIds.length === 0) {
      return NextResponse.json(
        { error: "spkItemIds wajib diisi" },
        { status: 400 },
      );
    }

    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        spkItems: {
          where: {
            id: { in: spkItemIds },
            fulfillmentMethod: FulfillmentMethod.TRADING,
          },
          include: {
            item: true,
          },
        },
        lead: true,
        purchaseOrders: {
          where: {
            status: { in: ["APPROVED", "DONE"] },
          },
        },
      },
    });

    if (!spk) {
      return NextResponse.json(
        { error: "SPK tidak ditemukan" },
        { status: 404 },
      );
    }

    if (
      spk.status !== SpkStatus.IN_PROGRESS &&
      spk.status !== SpkStatus.READY_TO_SHIP
    ) {
      return NextResponse.json(
        {
          error: `SPK harus ${SpkStatus.IN_PROGRESS} atau ${SpkStatus.READY_TO_SHIP}. Status saat ini: ${spk.status}`,
        },
        { status: 400 },
      );
    }

    if (spk.purchaseOrders.length === 0) {
      return NextResponse.json(
        { error: "Purchase Order belum di-approve" },
        { status: 400 },
      );
    }

    // ✅ FIX UTAMA: deklarasi DI SINI
    const missingItems: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of spk.spkItems) {
        const inventoryItem =
          (item.itemId &&
            (await tx.item.findUnique({
              where: { id: item.itemId },
            }))) ||
          (await tx.item.findFirst({
            where: {
              name: {
                contains: item.namaBarang,
                mode: "insensitive",
              },
              isTrading: true,
            },
          }));

        const itemRef = inventoryItem?.id;

        if (itemRef) {
          await tx.transaction.create({
            data: {
              date: new Date(),
              type: TransactionType.KELUAR,
              source: TransactionSource.TRADING,
              itemId: itemRef,
              quantity: item.qty,
              destination: spk.lead.nama_toko || "Customer",
              spkNumber: spk.spkNumber,
              memo: `Barang keluar SPK ${spk.spkNumber} - ${item.namaBarang} (TRADING)`,
              userId: authUser.userId,
            },
          });
        } else {
          missingItems.push(item.namaBarang);
        }

        await tx.spkItem.update({
          where: { id: item.id },
          data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
        });
      }

      await updateSpkStatusIfReady(spk.id, tx);
    });

    // ✅ SEKARANG AMAN
    return NextResponse.json({
      message: `${spk.spkItems.length} item TRADING berhasil di-approve${
        missingItems.length
          ? `. Catatan: ${missingItems.join(
              ", ",
            )} belum tercatat di transaksi karena item tidak ditemukan.`
          : ""
      }`,
    });
  } catch (error) {
    console.error("Approve TRADING error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat approve TRADING" },
      { status: 500 },
    );
  }
}
