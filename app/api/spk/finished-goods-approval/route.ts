import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  SpkStatus,
  FulfillmentMethod,
  FulfillmentStatus,
} from "@/lib/constants";

/* =========================
   TYPE AMAN (ANTI TS ERROR)
========================= */
type SpkWithRelations = Awaited<ReturnType<typeof prisma.spk.findMany>>[number];

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const spks: SpkWithRelations[] = await prisma.spk.findMany({
      where: {
        status: {
          in: [SpkStatus.IN_PROGRESS, SpkStatus.READY_TO_SHIP],
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
          include: {
            item: {
              include: { unit: true },
            },
            salesOrder: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = spks.map((spk) => {
      const fromStockItems = spk.spkItems.filter(
        (i) => i.fulfillmentMethod === FulfillmentMethod.FROM_STOCK,
      );

      const productionItems = spk.spkItems.filter(
        (i) => i.fulfillmentMethod === FulfillmentMethod.PRODUCTION,
      );

      const tradingItems = spk.spkItems.filter(
        (i) => i.fulfillmentMethod === FulfillmentMethod.TRADING,
      );

      // FROM STOCK: COMPLETED / FULFILLED
      const fromStockCompleted =
        fromStockItems.length === 0 ||
        fromStockItems.every(
          (i) =>
            i.fulfillmentStatus === FulfillmentStatus.COMPLETED ||
            i.fulfillmentStatus === FulfillmentStatus.FULFILLED,
        );

      // PRODUCTION: DONE, COMPLETED, atau FULFILLED (sesuai dengan lib/spk-status.ts)
      const PRODUCTION_DONE_STATUSES = [
        "DONE",
        FulfillmentStatus.COMPLETED,
        FulfillmentStatus.FULFILLED,
      ];
      const productionCompleted =
        productionItems.length === 0 ||
        productionItems.every((i) =>
          PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
        );

      // TRADING: PO APPROVED / DONE
      const tradingApproved =
        tradingItems.length === 0 ||
        spk.purchaseOrders.some(
          (po) => po.status === "APPROVED" || po.status === "DONE",
        );

      // RULE FINAL
      const canApprove =
        fromStockCompleted && productionCompleted && tradingApproved;

      return {
        id: spk.id,
        spkNumber: spk.spkNumber,
        status: spk.status,
        tglSpk: spk.tglSpk.toISOString(),
        deadline: spk.deadline?.toISOString() ?? null,
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
                unit: { name: item.item.unit.name },
              }
            : null,
          salesOrder: item.salesOrder
            ? {
                spesifikasi_barang: item.salesOrder.spesifikasi_barang,
              }
            : null,
        })),
        hasProductionItems: productionItems.length > 0,
        hasTradingItems: tradingItems.length > 0,
        tradingApproved,
        canApprove,
      };
    });

    return NextResponse.json({ spks: result });
  } catch (error) {
    console.error("Finished goods approval error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 },
    );
  }
}
