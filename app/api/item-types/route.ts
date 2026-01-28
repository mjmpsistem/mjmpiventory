import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (category) {
      where.category = category;
    }

    const itemTypes = await prisma.itemType.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ itemTypes });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get item types error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG]);

    const { name, category } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nama jenis barang harus diisi" },
        { status: 400 }
      );
    }

    if (
      !category ||
      (category !== "BAHAN_BAKU" && category !== "BARANG_JADI")
    ) {
      return NextResponse.json(
        { error: "Kategori harus dipilih (BAHAN_BAKU atau BARANG_JADI)" },
        { status: 400 }
      );
    }

    const itemType = await prisma.itemType.create({
      data: { name, category },
    });

    return NextResponse.json({ itemType }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Jenis barang sudah ada" },
        { status: 400 }
      );
    }
    console.error("Create item type error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
