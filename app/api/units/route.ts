/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const isActive = searchParams.get("isActive");

    const where: any = {};

    if (isActive === "true") {
      where.isActive = true;
    } else if (isActive === "false") {
      where.isActive = false;
    }

    const units = await prisma.unit.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ units });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get units error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG]);

    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Nama satuan harus diisi" },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name: name.toUpperCase(),
      },
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.code === "P2002") {
      return NextResponse.json({ error: "Satuan sudah ada" }, { status: 400 });
    }

    console.error("Create unit error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
