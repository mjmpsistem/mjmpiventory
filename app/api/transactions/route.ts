/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStock } from "@/lib/stock";
import { UserRole, TransactionType } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const itemId = searchParams.get("itemId");
    const category = searchParams.get("category");

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (itemId) {
      where.itemId = itemId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }
    if (category) {
      where.item = {
        category: category,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        item: {
          include: {
            itemType: true,
            unit: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ PANGGIL SEKALI & SIMPAN
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const body = await request.json();

    const {
      date,
      type,
      source,
      itemId,
      quantity,
      price,
      vendor,
      destination,
      spkNumber,
      memo,
    } = body;

    // ✅ VALIDASI BENAR
    if (!date || !type || !itemId || quantity == null || !memo) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Memo wajib diisi." },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity harus lebih dari 0" },
        { status: 400 }
      );
    }

    // 🔍 DEBUG (boleh hapus nanti)
    console.log("DEBUG userId:", authUser.userId);

    // ✅ CREATE TRANSACTION
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        source: source ?? null,
        itemId,
        quantity,
        price: price ?? null,
        vendor: vendor ?? null,
        destination: destination ?? null,
        spkNumber: spkNumber ?? null,
        memo,
        userId: authUser.userId, // 🔥 HARUS UUID
      },
      include: {
        item: {
          include: {
            itemType: true,
            unit: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // ✅ UPDATE STOCK
    try {
      await updateStock(
        itemId,
        quantity,
        type as TransactionType,
        authUser.userId,
        memo,
        transaction.id
      );
    } catch (stockError: any) {
      await prisma.transaction.delete({
        where: { id: transaction.id },
      });

      return NextResponse.json(
        { error: stockError.message || "Gagal update stok" },
        { status: 400 }
      );
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
