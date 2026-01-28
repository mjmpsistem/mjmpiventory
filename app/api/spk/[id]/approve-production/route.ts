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
 * Approve PRODUCTION items untuk SPK
 * ✅ DONE (produksi) → COMPLETED (barang jadi)
 * ✅ Catat transaksi barang keluar
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
        lead: true,
        spkItems: {
          where: {
            id: { in: spkItemIds },
            fulfillmentMethod: FulfillmentMethod.PRODUCTION,
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

    // Debug: Log status SPK
    console.log("🔍 DEBUG approve-production route:", {
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
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const spkItem of spk.spkItems) {
        // 🔒 Validasi: hanya boleh approve yang DONE
        if (spkItem.fulfillmentStatus !== "DONE") {
          throw new Error(`Item ${spkItem.namaBarang} belum DONE di produksi`);
        }

        // Cari item barang jadi
        const inventoryItem = await tx.item.findFirst({
          where: {
            name: {
              contains: spkItem.namaBarang,
              mode: "insensitive",
            },
            category: "BARANG_JADI",
          },
        });

        if (!inventoryItem) continue;

        // Catat transaksi barang keluar
        await tx.transaction.create({
          data: {
            date: new Date(),
            type: TransactionType.KELUAR,
            source: TransactionSource.PRODUKSI,
            itemId: inventoryItem.id,
            quantity: spkItem.qty,
            destination: spk.lead.nama_toko || "Customer",
            spkNumber: spk.spkNumber,
            memo: `Barang keluar SPK ${spk.spkNumber} - ${spkItem.namaBarang} (PRODUCTION)`,
            userId: authUser.userId,
          },
        });

        // 🔥 INI KUNCI FIX BUG
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: {
            fulfillmentStatus: FulfillmentStatus.COMPLETED,
          },
        });
      }

      // Update status SPK kalau semua item sudah beres
      await updateSpkStatusIfReady(spk.id, tx);
    });

    return NextResponse.json({
      message: `${spk.spkItems.length} item PRODUCTION berhasil di-approve`,
    });
  } catch (error: any) {
    console.error("Approve PRODUCTION error:", error);

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || "Gagal approve PRODUCTION" },
      { status: 500 },
    );
  }
}
