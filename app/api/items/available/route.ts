/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableStock } from "@/lib/stock";
import { UserRole } from "@/lib/constants";

/**
 * Get items with available stock (currentStock - reservedStock)
 * Untuk digunakan saat membuat SPK dengan fulfillmentMethod = FROM_STOCK
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // BARANG_JADI untuk FROM_STOCK

    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        itemType: true,
        unit: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Add availableStock to each item
    const itemsWithAvailableStock = await Promise.all(
      items.map(async (item) => {
        const availableStock = item.currentStock - item.reservedStock;
        return {
          ...item,
          availableStock,
        };
      })
    );

    return NextResponse.json({ items: itemsWithAvailableStock });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get available items error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data items" },
      { status: 500 }
    );
  }
}
