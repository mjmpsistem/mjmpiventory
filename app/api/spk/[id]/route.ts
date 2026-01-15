/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseReservedStock } from "@/lib/stock";
import { UserRole, SpkStatus, FulfillmentMethod, FulfillmentStatus } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { id } = await params;

    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        lead: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spkItems: {
          include: {
            salesOrder: true,
            item: {
              include: {
                itemType: true,
                unit: true,
              },
            },
            materialUsages: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    if (!spk) {
      return NextResponse.json({ error: "SPK tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ spk });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get SPK detail error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil detail SPK" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const { id } = await params;
    const body = await request.json();
    const { status, deadline, catatan } = body;

    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        spkItems: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!spk) {
      return NextResponse.json({ error: "SPK tidak ditemukan" }, { status: 404 });
    }

    // Handle status change to IN_PROGRESS
    if (status === SpkStatus.IN_PROGRESS && spk.status !== SpkStatus.IN_PROGRESS) {
      return await handleSpkInProgress(spk, authUser.userId);
    }

    // Handle status change to CANCELLED
    if (status === SpkStatus.CANCELLED && spk.status !== SpkStatus.CANCELLED) {
      return await handleSpkCancelled(spk, authUser.userId);
    }

    // Handle other status updates
    const updatedSpk = await prisma.spk.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(catatan !== undefined && { catatan }),
      },
      include: {
        lead: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spkItems: {
          include: {
            salesOrder: true,
            item: true,
          },
        },
      },
    });

    return NextResponse.json({ spk: updatedSpk });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Update SPK error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan saat mengupdate SPK" },
      { status: 500 }
    );
  }
}

/**
 * Handle SPK status change to IN_PROGRESS
 * SESUAI RULE BARU:
 * - Reservasi stok dilakukan saat SPK dibuat (status QUEUE)
 * - Perubahan ke IN_PROGRESS TIDAK mengubah stok, hanya mengubah status SPK
 */
async function handleSpkInProgress(spk: any, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Hanya update status SPK menjadi IN_PROGRESS (stok sudah di-reserve saat QUEUE)
    const updatedSpk = await tx.spk.update({
      where: { id: spk.id },
      data: { status: SpkStatus.IN_PROGRESS },
      include: {
        lead: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spkItems: {
          include: {
            salesOrder: true,
            item: true,
          },
        },
      },
    });

    return NextResponse.json({ spk: updatedSpk });
  });
}

/**
 * Handle SPK status change to CANCELLED
 * Release reserved stock untuk item dengan fulfillmentMethod = FROM_STOCK
 */
async function handleSpkCancelled(spk: any, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Release reserved stock untuk semua item FROM_STOCK yang masih RESERVED
    for (const spkItem of spk.spkItems) {
      if (
        spkItem.fulfillmentMethod === FulfillmentMethod.FROM_STOCK &&
        spkItem.itemId &&
        spkItem.fulfillmentStatus === FulfillmentStatus.RESERVED
      ) {
        // Release reserved stock
        await releaseReservedStock(
          spkItem.itemId,
          spkItem.qty,
          userId,
          `Release reserved stock untuk SPK ${spk.spkNumber} yang dibatalkan - Item: ${spkItem.namaBarang}`,
          tx
        );

        // Update fulfillment status
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
        });
      }
    }

    // Update SPK status
    const updatedSpk = await tx.spk.update({
      where: { id: spk.id },
      data: { status: SpkStatus.CANCELLED },
      include: {
        lead: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spkItems: {
          include: {
            salesOrder: true,
            item: true,
          },
        },
      },
    });

    return NextResponse.json({ spk: updatedSpk });
  });
}
