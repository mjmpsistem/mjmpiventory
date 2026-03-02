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

    const leads = await prisma.lead.findMany({
      include: {
        so_headers: {
          where: {
            hasSpk: false
          },
          include: {
            items: {
              include: {
                inventory_item: {
                  include: {
                    itemType: true,
                    unit: true,
                  },
                },
              },
            }
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json({ leads });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get leads error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data leads" },
      { status: 500 }
    );
  }
}
