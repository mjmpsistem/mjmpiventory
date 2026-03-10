import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SpkStatus, FulfillmentMethod, FulfillmentStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch data for complex logic
    // 1. Fetch data for complex logic
    const [
      poPendingCount, 
      tradingNeededSpks, 
      prCount, 
      returPrCount,
      prApprovalCount, 
      prReturApprovalCount,
      activeSpks, 
      activeReturs,
      wasteCount, 
      shippingReadyCount, 
      shippingReturReadyCount,
      shippingTransitCount,
      shippingReturTransitCount
    ] = await Promise.all([
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

      // SPKs needing production documentation
      prisma.spk.count({
        where: {
          status: SpkStatus.IN_PROGRESS,
          spkItems: {
            some: {
              fulfillmentMethod: FulfillmentMethod.PRODUCTION,
              productionRequestId: null,
            },
          },
        }
      }),
      // SpkReturs needing production documentation
      (prisma as any).spkRetur.count({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS"] },
          returnItems: {
            some: {
              fulfillmentMethod: FulfillmentMethod.PRODUCTION,
              productionRequestId: null,
            },
          },
        }
      }),

      // Production Requests pending approval
      prisma.productionRequest.count({ where: { status: "PENDING", spkReturNumber: null } }),
      prisma.productionRequest.count({ where: { status: "PENDING", spkReturNumber: { not: null } } }),

      // SPKs for Finished Goods Approval
      prisma.spk.findMany({
        where: {
          status: { in: [SpkStatus.IN_PROGRESS, SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL] }
        },
        include: {
          spkItems: true,
        }
      }),
      // SpkReturs for Finished Goods Approval
      (prisma as any).spkRetur.findMany({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS", "READY_TO_SHIP", "PARTIAL", "SHIPPING", "DONE"] }
        },
        include: {
          returnItems: true,
        }
      }),

      // Waste Monitoring
      prisma.wasteStock.count({ where: { quantity: { gt: 0 } } }),

      // Shipping - Ready to Ship
      prisma.spk.count({ where: { warehouseApproved: true, status: { in: [SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL] } } } as any),
      (prisma as any).spkRetur.count({ where: { status: { in: ["READY_TO_SHIP", "PARTIAL"] } } } as any),

      // Shipping - In Transit
      prisma.spk.count({ where: { status: SpkStatus.SHIPPING } } as any),
      (prisma as any).spkRetur.count({ where: { status: "SHIPPING" } } as any)
    ]);

    // 2. Calculate Finished Goods Approval Count
    const canApproveSpk = activeSpks.filter((spk: any) => {
      if (spk.warehouseApproved) return false;
      return spk.spkItems.some((i: any) => i.readyQty > (i.approvedQty || 0));
    }).length;

    const canApproveRetur = activeReturs.filter((sr: any) => {
      // Logic: Retur items that have readyQty > approvedQty
      return sr.returnItems.some((i: any) => i.readyQty > (i.approvedQty || 0));
    }).length;

    return NextResponse.json({
      purchaseOrder: poPendingCount + tradingNeededSpks.length,
      poPending: poPendingCount,
      tradingNeeded: tradingNeededSpks.length,
      productionRequest: prCount,
      productionApproval: prApprovalCount,
      productionApprovalNormal: prApprovalCount, // for backward compatibility or direct use
      productionApprovalRetur: prReturApprovalCount,
      gudangApproval: canApproveSpk + canApproveRetur,
      waste: wasteCount,
      shippingReady: shippingReadyCount + shippingReturReadyCount,
      shippingTransit: shippingTransitCount + shippingReturTransitCount,
      // Specific Retur Counts for detailed badges
      productionRetur: returPrCount,
      gudangRetur: canApproveRetur,
      shippingRetur: shippingReturReadyCount
    });
  } catch (error) {
    console.error("Error fetching notification counts:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
