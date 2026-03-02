import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import { reserveStock, releaseReservedStock } from "@/lib/stock";

/**
 * =========================
 * GET DETAIL PRODUCTION REQUEST
 * =========================
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { id } = await params;

    const productionRequest = await prisma.productionRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
        items: {
          include: {
            item: {
              include: { itemType: true, unit: true },
            },
          },
        },
        spk: {
          include: {
            lead: true,
            spkItems: {
              include: { salesOrder: true },
            },
          },
        },
      },
    });

    if (!productionRequest) {
      return NextResponse.json(
        { error: "Permintaan produksi tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ request: productionRequest });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get production request error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

/**
 * =========================
 * UPDATE PRODUCTION REQUEST (DELTA RESERVED)
 * =========================
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const { id } = await params;
    const body = await request.json();
    const { items: newItems, memo } = body;

    if (!Array.isArray(newItems)) {
      return NextResponse.json({ error: "Items tidak valid" }, { status: 400 });
    }

    const existingRequest = await prisma.productionRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Hanya permintaan berstatus PENDING yang dapat diubah" },
        { status: 400 },
      );
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      /**
       * 1. HITUNG DELTA RESERVED
       */
      const existingGrouped = existingRequest.items.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.itemId] = (acc[item.itemId] || 0) + item.quantity;
          return acc;
        },
        {},
      );

      const newGrouped = newItems.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.itemId] = (acc[item.itemId] || 0) + item.quantity;
          return acc;
        },
        {},
      );

      const allItemIds = new Set([
        ...Object.keys(existingGrouped),
        ...Object.keys(newGrouped),
      ]);

      for (const itemId of allItemIds) {
        const oldQty = existingGrouped[itemId] || 0;
        const newQty = newGrouped[itemId] || 0;
        const delta = newQty - oldQty;

        if (delta > 0) {
          await reserveStock(
            itemId,
            delta,
            authUser.userId,
            `Revisi penambahan SPK ${existingRequest.spkNumber}`,
            tx,
          );
        } else if (delta < 0) {
          await releaseReservedStock(
            itemId,
            Math.abs(delta),
            authUser.userId,
            `Revisi pengurangan SPK ${existingRequest.spkNumber}`,
            tx,
          );
        }
      }

      /**
       * 2. REPLACE ITEMS
       */
      await tx.productionRequestItem.deleteMany({
        where: { productionRequestId: id },
      });

      return await tx.productionRequest.update({
        where: { id },
        data: {
          memo,
          items: {
            create: newItems.map((item: any) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              item: {
                include: { itemType: true, unit: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ productionRequest: updatedRequest });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Update production request error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 400 },
    );
  }
}
