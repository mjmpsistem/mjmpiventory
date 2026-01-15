import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  SpkStatus,
  FulfillmentMethod,
  FulfillmentStatus,
} from "@/lib/constants";

/**
 * List SPK yang tampil di approval barang jadi
 * RULE:
 * - SPK status IN_PROGRESS
 * - Memiliki minimal 1 FROM_STOCK dengan status COMPLETED
 * - SPK campuran (FROM_STOCK + PRODUCTION) TETAP MUNCUL
 * - Approve hanya boleh jika semua PRODUCTION sudah COMPLETED
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const spks = await prisma.spk.findMany({
      where: {
        status: SpkStatus.IN_PROGRESS,
        spkItems: {
          some: {
            fulfillmentMethod: FulfillmentMethod.FROM_STOCK,
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
        // ⛔ JANGAN FILTER DI INCLUDE
        spkItems: {
          include: {
            item: {
              include: { unit: true },
            },
            salesOrder: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const result = spks.map((spk) => {
      // FROM_STOCK harus ada yang COMPLETED
      const fromStockCompleted = spk.spkItems.some(
        (item) =>
          item.fulfillmentMethod === FulfillmentMethod.FROM_STOCK &&
          item.fulfillmentStatus === FulfillmentStatus.COMPLETED
      );

      // cek PRODUCTION
      const productionItems = spk.spkItems.filter(
        (item) => item.fulfillmentMethod === FulfillmentMethod.PRODUCTION
      );

      const productionCompleted =
        productionItems.length === 0 ||
        productionItems.every(
          (item) => item.fulfillmentStatus === FulfillmentStatus.COMPLETED
        );

      const canApprove = fromStockCompleted && productionCompleted;

      return {
        id: spk.id,
        spkNumber: spk.spkNumber,
        status: spk.status,
        tglSpk: spk.tglSpk.toISOString(),
        deadline: spk.deadline ? spk.deadline.toISOString() : null,
        catatan: spk.catatan,
        lead: spk.lead,
        user: spk.user,
        spkItems: spk.spkItems.map((item) => ({
          id: item.id,
          namaBarang: item.namaBarang,
          qty: item.qty,
          satuan: item.satuan,
          fulfillmentMethod: item.fulfillmentMethod,
          fulfillmentStatus: item.fulfillmentStatus,
          item: item.item
            ? {
                id: item.item.id,
                name: item.item.name,
                unit: {
                  name: item.item.unit.name,
                },
              }
            : null,
        })),
        hasProductionItems: productionItems.length > 0,
        canApprove,
      };
    });

    return NextResponse.json({ spks: result });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get SPK finished goods approval error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 }
    );
  }
}
