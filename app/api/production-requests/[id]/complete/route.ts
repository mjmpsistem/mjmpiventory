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

    await requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG]);

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

    const updated = await prisma.productionRequest.update({
      where: { id },
      data: {
        status: ProductionRequestStatus.COMPLETED,
        updatedAt: new Date(),
      },
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
