import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const [
      prCount, 
      returPrCount,
      prApprovalCount, 
    ] = await Promise.all([
      prisma.spk.count({
        where: {
          status: "IN_PROGRESS",
          spkItems: {
            some: {
              fulfillmentMethod: "PRODUCTION",
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
      prisma.productionRequest.count({ where: { status: "PENDING" } }),
    ]);

    console.log({
      productionRequest: prCount + returPrCount,
      productionApproval: prApprovalCount,
      productionRetur: returPrCount,
      prCount,
      returPrCount
    });
}

main().catch(console.error).finally(() => prisma.$disconnect())
