import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG]);

    // ✅ WAJIB
    const { id } = await params;

    const body = await request.json();
    const { name, category, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama jenis barang harus diisi" },
        { status: 400 }
      );
    }

    const updateData: any = {
      name,
      isActive: isActive ?? true,
    };

    if (category === "BAHAN_BAKU" || category === "BARANG_JADI") {
      updateData.category = category;
    }

    const itemType = await prisma.itemType.update({
      where: { id }, // ✅ sekarang valid
      data: updateData,
    });

    return NextResponse.json({ itemType });
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

    console.error("Update item type error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
