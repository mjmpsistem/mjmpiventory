import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStock } from "@/lib/stock";
import {
  UserRole,
  ProductionRequestStatus,
  TransactionType,
  TransactionSource,
} from "@/lib/constants";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const authUser = await requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const productionRequest = await prisma.productionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!productionRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 }
      );
    }

    if (productionRequest.status !== ProductionRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "Status permintaan tidak valid" },
        { status: 400 }
      );
    }

    // Validasi stok
    for (const reqItem of productionRequest.items) {
      if (reqItem.item.currentStock < reqItem.quantity) {
        return NextResponse.json(
          {
            error: `Stok ${reqItem.item.name} tidak mencukupi. Stok tersedia: ${reqItem.item.currentStock}`,
          },
          { status: 400 }
        );
      }
    }

    const transactions = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.productionRequest.update({
          where: { id },
          data: { status: ProductionRequestStatus.APPROVED },
        });

        const createdTransactions = [];

        for (const reqItem of productionRequest.items) {
          const transaction = await tx.transaction.create({
            data: {
              date: new Date(),
              type: TransactionType.KELUAR,
              source: TransactionSource.BAHAN_BAKU,
              itemId: reqItem.itemId,
              quantity: reqItem.quantity,
              destination: "Produksi",
              spkNumber: productionRequest.spkNumber,
              memo: `Permintaan produksi SPK ${productionRequest.spkNumber}: ${productionRequest.memo}`,
              userId: authUser.userId,
            },
          });

          await updateStock(
            reqItem.itemId,
            reqItem.quantity,
            TransactionType.KELUAR,
            authUser.userId,
            `Permintaan produksi SPK ${productionRequest.spkNumber}: ${productionRequest.memo}`,
            transaction.id,
            tx
          );

          createdTransactions.push(transaction);
        }

        return createdTransactions;
      }
    );

    return NextResponse.json({
      message: "Permintaan produksi berhasil disetujui",
      transactions,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Approve production request error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyetujui permintaan produksi" },
      { status: 500 }
    );
  }
}
