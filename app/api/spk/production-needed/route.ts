/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SpkStatus, FulfillmentMethod } from "@/lib/constants";

/**
 * Get SPK dengan status IN_PROGRESS yang memiliki item dengan fulfillmentMethod = PRODUCTION
 * SPK ini perlu dibuat ProductionRequest-nya
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    // Ambil SPK dengan status IN_PROGRESS yang punya item PRODUCTION
    const spks = await prisma.spk.findMany({
      where: {
        status: { in: [SpkStatus.IN_PROGRESS] },
        spkItems: {
          some: {
            fulfillmentMethod: FulfillmentMethod.PRODUCTION,
            // Hanya ambil yang belum punya ProductionRequest
            productionRequestId: null,
          },
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            nama_toko: true,
            nama_owner: true,
            nama_pic: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        materialUsages: {
          include: {
            material: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
        spkItems: {
          where: {
            fulfillmentMethod: FulfillmentMethod.PRODUCTION,
            productionRequestId: null,
          },
          include: {
            salesOrder: {
              select: {
                id: true,
                nama_barang: true,
                spesifikasi_tambahan: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ spks });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get SPK production needed error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 },
    );
  }
}
