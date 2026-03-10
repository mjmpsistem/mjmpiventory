import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductionRequestStatus, UserRole } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID permintaan produksi tidak valid" },
        { status: 400 },
      );
    }

    const authUser = await requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY]);

    const productionRequest = await prisma.productionRequest.findUnique({
      where: { id },
    });

    if (!productionRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (productionRequest.status !== ProductionRequestStatus.APPROVED) {
      return NextResponse.json(
        { error: "Hanya permintaan APPROVED yang dapat diselesaikan" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.productionRequest.update({
        where: { id },
        data: {
          status: ProductionRequestStatus.COMPLETED,
          updatedAt: new Date(),
        },
      });

      // If it's a Manual PR (has targetItemId), add to general stock
      const manualRes = res as any;
      if (manualRes.targetItemId && (manualRes.targetQuantity || 0) > 0) {
        const item = await tx.item.findUnique({ 
          where: { id: manualRes.targetItemId },
          include: { unit: true }
        });
        
        const memo = `Hasil produksi manual selesai: ${item?.name || manualRes.productName} (${manualRes.targetQuantity} ${item?.unit.name || ''})`;
        
        const transaction = await tx.transaction.create({
          data: {
            date: new Date(),
            type: "MASUK",
            source: "PRODUKSI",
            itemId: manualRes.targetItemId,
            quantity: manualRes.targetQuantity || 0,
            memo: memo,
            userId: authUser.userId,
          }
        });

        const { updateStock } = await import("@/lib/stock");
        await updateStock(manualRes.targetItemId, manualRes.targetQuantity || 0, "MASUK" as any, authUser.userId, memo, transaction.id, tx);
      }

      return res;
    });

    return NextResponse.json({ productionRequest: updated });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Complete production request error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyelesaikan permintaan produksi" },
      { status: 500 },
    );
  }
}
