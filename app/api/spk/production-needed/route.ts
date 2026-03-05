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
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const [rawSpks, spkReturs] = await Promise.all([
      prisma.spk.findMany({
        where: {
          status: { in: [SpkStatus.IN_PROGRESS, SpkStatus.PARTIAL] },
          spkItems: {
            some: {
              fulfillmentMethod: FulfillmentMethod.PRODUCTION,
              productionRequestId: null,
            },
          },
        },
        include: {
          lead: { select: { id: true, nama_toko: true, nama_owner: true, nama_pic: true } },
          user: { select: { id: true, name: true, username: true } },
          materialUsages: { include: { material: { include: { itemType: true, unit: true } } } },
          spkItems: {
            where: { fulfillmentMethod: FulfillmentMethod.PRODUCTION, productionRequestId: null },
            include: { salesOrder: { select: { id: true, nama_barang: true, spesifikasi_tambahan: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).spkRetur.findMany({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS"] },
          returnItems: {
            some: { fulfillmentMethod: "PRODUCTION", productionRequestId: null },
          },
        },
        include: {
          parentSpk: {
            include: {
              lead: { select: { id: true, nama_toko: true, nama_owner: true, nama_pic: true } },
              user: true
            }
          },
          returnItems: {
            where: { fulfillmentMethod: "PRODUCTION", productionRequestId: null },
            include: { originalSpkItem: { include: { salesOrder: true } } }
          },
          materialUsages: { include: { material: { include: { itemType: true, unit: true } } } },
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Filter SPK Induk: Jika item produksinya sudah "dimigrasikan" ke SpkReturItem, jangan munculkan lagi di Induk
    const mappedSpks = await Promise.all(rawSpks.map(async (s) => {
      const productionItems = await Promise.all(s.spkItems.map(async (item: any) => {
        // Cek apakah ada SpkReturItem yang merujuk ke item ini untuk produksi
        const hasReturProduction = await (prisma as any).spkReturItem.findFirst({
          where: { 
            originalSpkItemId: item.id,
            fulfillmentMethod: FulfillmentMethod.PRODUCTION
            // Jika SpkRetur tersebut masih aktif (belum DONE), maka Induk tidak perlu handle lagi
          }
        });
        return hasReturProduction ? null : item;
      }));
      
      const filteredItems = productionItems.filter(i => i !== null);
      if (filteredItems.length === 0) return null;

      return {
        ...s,
        isRetur: false,
        spkItems: filteredItems
      };
    }));

    const finalSpks = mappedSpks.filter(s => s !== null);

    const mappedReturs = spkReturs.map((sr: any) => ({
      id: sr.id,
      isRetur: true,
      spkNumber: sr.spkNumber,
      status: sr.status,
      createdAt: sr.createdAt,
      lead: sr.parentSpk.lead,
      user: sr.parentSpk.user,
      materialUsages: sr.materialUsages,
      spkItems: sr.returnItems.map((item: any) => ({
        id: item.id,
        namaBarang: item.namaBarang,
        qty: item.qty,
        satuan: item.satuan,
        fulfillmentMethod: item.fulfillmentMethod,
        salesOrder: item.originalSpkItem?.salesOrder ? {
          id: item.originalSpkItem.salesOrder.id,
          nama_barang: item.namaBarang,
          spesifikasi_tambahan: item.originalSpkItem.salesOrder.spesifikasi_tambahan
        } : null
      }))
    }));

    return NextResponse.json({ spks: [...finalSpks, ...mappedReturs] });
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
