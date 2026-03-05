import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const SpkStatus = {
      QUEUE: "QUEUE",
      IN_PROGRESS: "IN_PROGRESS",
      QC_CHECK: "QC_CHECK",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
      READY_TO_SHIP: "READY_TO_SHIP",
      SHIPPING: "SHIPPING",
      PARTIAL: "PARTIAL",
      DONE: "DONE",
    };

    const FulfillmentMethod = {
      FROM_STOCK: "FROM_STOCK",
      PRODUCTION: "PRODUCTION",
      TRADING: "TRADING",
    };

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
      prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      prisma.spk.findMany({
        where: {
          status: SpkStatus.IN_PROGRESS,
          spkItems: { some: { fulfillmentMethod: FulfillmentMethod.TRADING } },
          purchaseOrders: { none: {} }
        },
        select: { id: true }
      }),
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
      (prisma as any).spkRetur.count({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS"] },
          returnItems: {
            some: {
              fulfillmentMethod: "PRODUCTION",
              productionRequestId: null,
            },
          },
        }
      }),
      prisma.productionRequest.count({ where: { status: "PENDING", spkReturNumber: null } }),
      prisma.productionRequest.count({ where: { status: "PENDING", spkReturNumber: { not: null } } }),
      prisma.spk.findMany({
        where: {
          status: { in: [SpkStatus.IN_PROGRESS, SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL] }
        },
        include: {
          spkItems: true,
        }
      }),
      (prisma as any).spkRetur.findMany({
        where: {
          status: { in: ["QUEUE", "IN_PROGRESS", "READY_TO_SHIP", "PARTIAL", "SHIPPING", "DONE"] }
        },
        include: {
          returnItems: true,
        }
      }),
      prisma.wasteStock.count({ where: { quantity: { gt: 0 } } }),
      prisma.spk.count({ where: { warehouseApproved: true, status: { in: [SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL] } } } as any),
      (prisma as any).spkRetur.count({ where: { status: { in: ["READY_TO_SHIP", "PARTIAL"] } } } as any),
      prisma.spk.count({ where: { status: SpkStatus.SHIPPING } } as any),
      (prisma as any).spkRetur.count({ where: { status: "SHIPPING" } } as any)
    ]);

    const canApproveSpk = activeSpks.filter((spk: any) => {
      if (spk.warehouseApproved) return false;
      return spk.spkItems.some((i: any) => i.readyQty > (i.approvedQty || 0));
    }).length;

    const canApproveRetur = activeReturs.filter((sr: any) => {
      return sr.returnItems.some((i: any) => i.readyQty > (i.approvedQty || 0));
    }).length;

    console.log(JSON.stringify({
      productionRequest: prCount,
      productionApprovalNormal: prApprovalCount,
      productionApprovalRetur: prReturApprovalCount,
      gudangApproval: canApproveSpk + canApproveRetur,
      waste: wasteCount,
      shippingReady: shippingReadyCount + shippingReturReadyCount,
      shippingTransit: shippingTransitCount + shippingReturTransitCount,
      productionRetur: returPrCount,
      gudangRetur: canApproveRetur,
      shippingRetur: shippingReturReadyCount
    }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect())
