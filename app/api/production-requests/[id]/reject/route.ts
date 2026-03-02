import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ProductionRequestStatus, SpkStatus } from "@/lib/constants";
import { releaseReservedStock } from "@/lib/stock";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Ambil ulang data DI DALAM transaction (anti race condition)
      const productionRequest = await tx.productionRequest.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!productionRequest) {
        throw new Error("NOT_FOUND");
      }

      if (productionRequest.status !== ProductionRequestStatus.PENDING) {
        throw new Error("INVALID_STATUS");
      }

      // 2️⃣ Ambil SPK
      const spk = await tx.spk.findUnique({
        where: { spkNumber: productionRequest.spkNumber },
      });

      if (!spk) {
        throw new Error("SPK_NOT_FOUND");
      }

      // 3️⃣ Release reserved stock (GROUPING BIAR TIDAK DOUBLE)
      const groupedItems = productionRequest.items.reduce(
        (acc: Record<string, number>, item) => {
          acc[item.itemId] = (acc[item.itemId] || 0) + item.quantity;
          return acc;
        },
        {},
      );

      for (const [itemId, quantity] of Object.entries(groupedItems)) {
        await releaseReservedStock(
          itemId,
          quantity,
          authUser.userId,
          `Penolakan permintaan produksi SPK ${productionRequest.spkNumber}`,
          tx,
        );
      }

      // 4️⃣ HAPUS production request
      // ⬅️ INI KUNCI supaya:
      // - tidak double reserve
      // - SPK bisa masuk lagi ke tab "perlu produksi"
      await tx.productionRequest.delete({
        where: { id },
      });

      // 5️⃣ Kembalikan SPK ke QUEUE
      if (spk.status !== SpkStatus.QUEUE) {
        await tx.spk.update({
          where: { id: spk.id },
          data: { status: SpkStatus.QUEUE },
        });
      }
    });

    return NextResponse.json({
      message: "Permintaan produksi berhasil ditolak",
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (error.message === "INVALID_STATUS") {
      return NextResponse.json(
        { error: "Status permintaan tidak valid" },
        { status: 400 },
      );
    }

    if (error.message === "SPK_NOT_FOUND") {
      return NextResponse.json(
        { error: "SPK tidak ditemukan" },
        { status: 404 },
      );
    }

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Reject production request error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menolak permintaan produksi" },
      { status: 500 },
    );
  }
}
