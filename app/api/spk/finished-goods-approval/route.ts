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
type SpkWithRelations = any;

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
          in: [
            SpkStatus.IN_PROGRESS,
            SpkStatus.READY_TO_SHIP,
            SpkStatus.PARTIAL,
            SpkStatus.SHIPPING,
            SpkStatus.DONE,
          ],
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
            progressHistory: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            status: true,
            isReceived: true,
            kepada: true,
            nomorPO: true,
            items: {
              select: {
                namaBarang: true,
              }
            }
          },
        },
        shipping: {
          select: {
            id: true,
            fotoBuktiUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = spks.map((spk: any) => {
      const fromStockItems = spk.spkItems.filter(
        (i: any) => i.fulfillmentMethod === FulfillmentMethod.FROM_STOCK,
      );

      const productionItems = spk.spkItems.filter(
        (i: any) => i.fulfillmentMethod === FulfillmentMethod.PRODUCTION,
      );

      const tradingItems = spk.spkItems.filter(
        (i: any) => i.fulfillmentMethod === FulfillmentMethod.TRADING,
      );

      // FROM STOCK: COMPLETED / FULFILLED
      const fromStockCompleted =
        fromStockItems.length === 0 ||
        fromStockItems.every(
          (i: any) =>
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
        productionItems.every((i: any) =>
          PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
        );

      // TRADING: PO APPROVED / DONE AND isReceived true
      const tradingApproved =
        tradingItems.length === 0 ||
        spk.purchaseOrders.some(
          (po: any) => (po.status === "APPROVED" || po.status === "DONE") && po.isReceived === true,
        );

      // RULE BARU: SPK bisa di-approve jika ada saldo readyQty > 0 di salah satu itemnya
      // DAN jika ada item TRADING, PO harus sudah APPROVED/DONE
      // DAN jika ada item PRODUCTION, status harus sudah DONE/COMPLETED
      const canApprove =
        spk.spkItems.some((i: any) => i.readyQty > 0) &&
        tradingApproved &&
        productionCompleted;

      return {
        id: spk.id,
        spkNumber: spk.spkNumber,
        status: spk.status,
        warehouseApproved: spk.warehouseApproved,
        tglSpk: spk.tglSpk.toISOString(),
        deadline: spk.deadline?.toISOString() ?? null,
        lead: spk.lead,
        user: spk.user,
        spkItems: spk.spkItems.map((item: any) => ({
          id: item.id,
          namaBarang: item.namaBarang,
          qty: item.qty,
          readyQty: item.readyQty,
          producedQty: item.producedQty,
          shippedQty: item.shippedQty,
          approvedQty: item.approvedQty, // Include approvedQty
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
                spesifikasi_tambahan: item.salesOrder.spesifikasi_tambahan,
              }
            : null,
          lastStage: item.progressHistory?.[0]?.stage || null,
          poInfo: spk.purchaseOrders.find((po: any) => 
            (po.status === "APPROVED" || po.status === "DONE") && 
            po.isReceived &&
            po.items.some((poi: any) => poi.namaBarang.toLowerCase().trim() === item.namaBarang.toLowerCase().trim())
          ) ? {
            nomorPO: spk.purchaseOrders.find((po: any) => 
              (po.status === "APPROVED" || po.status === "DONE") && 
              po.isReceived &&
              po.items.some((poi: any) => poi.namaBarang.toLowerCase().trim() === item.namaBarang.toLowerCase().trim())
            ).nomorPO,
            kepada: spk.purchaseOrders.find((po: any) => 
              (po.status === "APPROVED" || po.status === "DONE") && 
              po.isReceived &&
              po.items.some((poi: any) => poi.namaBarang.toLowerCase().trim() === item.namaBarang.toLowerCase().trim())
            ).kepada
          } : null
        })),
        hasProductionItems: productionItems.length > 0,
        hasTradingItems: tradingItems.length > 0,
        tradingApproved,
        fotoBuktiUrl: spk.shipping?.fotoBuktiUrl || null,
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
