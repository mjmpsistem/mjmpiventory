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
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const [spks, spkReturs] = await Promise.all([
      prisma.spk.findMany({
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
      }),
      (prisma as any).spkRetur.findMany({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS", "READY_TO_SHIP", "PARTIAL", "SHIPPING", "DONE"] }
        },
        include: {
          parentSpk: {
            include: {
              lead: {
                select: {
                  id: true,
                  nama_toko: true,
                  nama_owner: true,
                  nama_pic: true,
                },
              },
              user: true
            }
          },
          returnItems: {
            include: {
              item: { include: { unit: true } },
              originalSpkItem: { include: { salesOrder: true } },
              progressHistory: { orderBy: { createdAt: "desc" }, take: 1 }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const mappedSpks = spks.map((spk: any) => {
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
      const productionCompleted =
        productionItems.length === 0 ||
        productionItems.every((i: any) =>
          ["DONE", FulfillmentStatus.COMPLETED, FulfillmentStatus.FULFILLED].includes(i.fulfillmentStatus),
        );

      // TRADING: PO APPROVED / DONE AND isReceived true
      const tradingApproved =
        tradingItems.length === 0 ||
        spk.purchaseOrders.some(
          (po: any) => (po.status === "APPROVED" || po.status === "DONE") && po.isReceived === true,
        );

      // RULE BARU: SPK bisa di-approve jika ada item yang berstatus siap approve (COMPLETED untuk stock, DONE untuk produksi/trading)
      // dan memiliki saldo readyQty > 0
      const canApprove = spk.spkItems.some((i: any) =>
        (i.readyQty || 0) > (i.approvedQty || 0) &&
        (i.fulfillmentStatus === FulfillmentStatus.COMPLETED || i.fulfillmentStatus === "DONE")
      );

      return {
        id: spk.id,
        isRetur: false,
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
        })),
        hasProductionItems: productionItems.length > 0,
        hasTradingItems: tradingItems.length > 0,
        productionCompleted,
        tradingApproved,
        fotoBuktiUrl: spk.shipping?.fotoBuktiUrl || null,
        canApprove,
      };
    });

    const mappedReturs = spkReturs.map((sr: any) => {
      const canApprove = sr.returnItems.some((i: any) => (i.readyQty || 0) > (i.approvedQty || 0));

      return {
        id: sr.id,
        isRetur: true,
        spkNumber: sr.spkNumber,
        status: sr.status,
        warehouseApproved: false,
        tglSpk: sr.createdAt.toISOString(),
        deadline: sr.parentSpk.deadline?.toISOString() ?? null,
        lead: sr.parentSpk.lead,
        user: sr.parentSpk.user,
        spkItems: sr.returnItems.map((item: any) => ({
          id: item.id,
          namaBarang: item.namaBarang,
          qty: item.qty,
          readyQty: item.readyQty,
          producedQty: item.producedQty,
          shippedQty: item.shippedQty,
          approvedQty: item.approvedQty,
          satuan: item.satuan,
          fulfillmentMethod: item.fulfillmentMethod,
          fulfillmentStatus: item.fulfillmentStatus,
          item: item.item ? { id: item.item.id, name: item.item.name, unit: { name: item.item.unit.name } } : null,
          salesOrder: item.originalSpkItem?.salesOrder ? { spesifikasi_tambahan: item.originalSpkItem.salesOrder.spesifikasi_tambahan } : null,
          lastStage: item.progressHistory?.[0]?.stage || null
        })),
        hasProductionItems: true,
        hasTradingItems: false,
        productionCompleted: sr.status === "DONE",
        tradingApproved: true,
        fotoBuktiUrl: null,
        canApprove,
      };
    });

    return NextResponse.json({ spks: [...mappedSpks, ...mappedReturs] });
  } catch (error) {
    console.error("Finished goods approval error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 },
    );
  }
}
