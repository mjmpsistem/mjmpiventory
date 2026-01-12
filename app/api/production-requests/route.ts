/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStock } from "@/lib/stock";
import {
  UserRole,
  ProductionRequestStatus,
  TransactionType,
} from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.productionRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            item: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get production requests error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG]);

    const body = await request.json();
    const { spkNumber, productName, items, memo } = body;
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    if (
      !spkNumber ||
      !productName ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !memo
    ) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Memo wajib diisi." },
        { status: 400 }
      );
    }

    // Validate stock availability
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.itemId },
      });
      if (!dbItem) {
        return NextResponse.json(
          { error: `Item ${item.itemId} tidak ditemukan` },
          { status: 400 }
        );
      }
      if (dbItem.currentStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Stok ${dbItem.name} tidak mencukupi. Stok tersedia: ${dbItem.currentStock}`,
          },
          { status: 400 }
        );
      }
    }

    // Create production request
    const productionRequest = await prisma.productionRequest.create({
      data: {
        spkNumber,
        productName,
        memo,
        userId: authUser.userId,
        status: ProductionRequestStatus.PENDING,
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            item: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ productionRequest }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nomor SPK sudah ada" },
        { status: 400 }
      );
    }
    console.error("Create production request error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
