import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SpkStatus, FulfillmentMethod, FulfillmentStatus } from "@/lib/constants";

export async function GET() {
  try {
    // 1. Fetch data for complex logic
    const [poPendingCount, tradingNeededSpks, prCount, prApprovalCount, activeSpks, wasteCount, shippingReadyCount, shippingTransitCount] = await Promise.all([
      // PO Pending Approval
      prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      
      // SPK Trading that needs PO
      prisma.spk.findMany({
        where: {
          status: SpkStatus.IN_PROGRESS,
          spkItems: { some: { fulfillmentMethod: FulfillmentMethod.TRADING } },
          purchaseOrders: { none: {} }
        },
        select: { id: true }
      }),

      // SPKs needing production documentation (status IN_PROGRESS, has item PRODUCTION, no productionRequestId)
      prisma.spk.count({
        where: {
          status: { in: [SpkStatus.IN_PROGRESS] },
          spkItems: {
            some: {
              fulfillmentMethod: FulfillmentMethod.PRODUCTION,
              productionRequestId: null,
            },
          },
        }
      }),
      // Production Requests pending approval
      prisma.productionRequest.count({ where: { status: "PENDING" } }),

      // SPKs for Finished Goods Approval
      prisma.spk.findMany({
        where: {
          status: { in: [SpkStatus.IN_PROGRESS, SpkStatus.READY_TO_SHIP] }
        },
        include: {
          spkItems: true,
          purchaseOrders: { select: { status: true } }
        }
      }),

      // Waste Monitoring
      prisma.wasteStock.count({ where: { quantity: { gt: 0 } } }),

      // Shipping - Ready to Ship
      prisma.spk.count({ where: { warehouseApproved: true, status: { in: [SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL] } } } as any),

      // Shipping - In Transit
      prisma.spk.count({ where: { warehouseApproved: true, status: "SHIPPING" } } as any)
    ]);

    // 2. Calculate Finished Goods Approval Count (matching frontend "Waiting" filter)
    const canApproveCount = activeSpks.filter((spk: any) => {
      // Logic harus 100% sinkron dengan Baris 321 di app/approval-barang-jadi/page.tsx
      const allShipped = spk.spkItems.every((item: any) => (item.shippedQty || 0) >= item.qty);
      const isPartial = !allShipped && spk.spkItems.some((i: any) => (i.shippedQty || 0) > 0);
      const isApprovedOrProcessed = spk.status === "DONE" || spk.status === "SHIPPING" || isPartial || spk.warehouseApproved;
      
      if (isApprovedOrProcessed) return false;
      return spk.spkItems.some((i: any) => i.readyQty > 0);
    }).length;

    return NextResponse.json({
      purchaseOrder: poPendingCount + tradingNeededSpks.length,
      poPending: poPendingCount,
      tradingNeeded: tradingNeededSpks.length,
      productionRequest: prCount,
      productionApproval: prApprovalCount,
      gudangApproval: canApproveCount,
      waste: wasteCount,
      shippingReady: shippingReadyCount,
      shippingTransit: shippingTransitCount
    });
  } catch (error) {
    console.error("Error fetching notification counts:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
