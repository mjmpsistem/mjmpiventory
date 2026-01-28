/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SpkStatus, FulfillmentMethod } from "@/lib/constants";

/**
 * Get SPK dengan status IN_PROGRESS yang memiliki item dengan fulfillmentMethod = TRADING
 * dan belum punya Purchase Order
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    // Ambil SPK dengan status IN_PROGRESS yang punya item TRADING
    // Bisa multiple PO per SPK, jadi tidak perlu filter yang sudah punya PO
    const spks = await prisma.spk.findMany({
      where: {
        status: SpkStatus.IN_PROGRESS,
        spkItems: {
          some: {
            fulfillmentMethod: FulfillmentMethod.TRADING,
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
        spkItems: {
          where: {
            fulfillmentMethod: FulfillmentMethod.TRADING,
          },
          include: {
            salesOrder: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            nomorPO: true,
            kepada: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format response untuk frontend
    const formattedSpks = spks.map((spk) => ({
      id: spk.id,
      spkNumber: spk.spkNumber,
      status: spk.status,
      tglSpk: spk.tglSpk.toISOString(),
      deadline: spk.deadline ? spk.deadline.toISOString() : null,
      lead: spk.lead,
      user: spk.user,
      spkItems: spk.spkItems.map((item) => ({
        id: item.id,
        namaBarang: item.namaBarang,
        qty: item.qty,
        satuan: item.satuan,
      })),
      purchaseOrders: spk.purchaseOrders.map((po) => ({
        id: po.id,
        nomorPO: po.nomorPO,
        kepada: po.kepada,
        status: po.status,
      })),
    }));

    return NextResponse.json({ spks: formattedSpks });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get SPK trading needed error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 }
    );
  }
}
