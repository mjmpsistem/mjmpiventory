import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const returPrCount = await (prisma as any).spkRetur.count({
    where: {
      status: { in: ["QUEUE", "IN_PROGRESS"] },
      returnItems: {
        some: {
          fulfillmentMethod: "PRODUCTION",
          productionRequestId: null,
        },
      },
    }
  });

  const allRetursNeedingPr = await (prisma as any).spkRetur.findMany({
    where: {
      status: { in: ["QUEUE", "IN_PROGRESS"] },
      returnItems: {
        some: {
          fulfillmentMethod: "PRODUCTION",
          productionRequestId: null,
        },
      },
    },
    include: {
      returnItems: true
    }
  });

  console.log("Count for badge:", returPrCount);
  console.dir(allRetursNeedingPr, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect())
