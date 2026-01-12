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

    const { id } = await params; // ✅ UNWRAP PARAMS

    const body = await request.json();
    const { name, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama satuan harus diisi" },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.update({
      where: { id }, // ✅ id sudah string
      data: {
        name,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ unit });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Satuan sudah ada" }, { status: 400 });
    }

    console.error("Update unit error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
