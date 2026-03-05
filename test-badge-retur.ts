import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const activeReturs = await (prisma as any).spkRetur.findMany({
    where: {
      status: { in: ["QUEUE", "IN_PROGRESS", "READY_TO_SHIP"] }
    },
    include: {
      returnItems: true,
    }
  });

  console.dir(activeReturs, { depth: null });

  const canApproveRetur = activeReturs.filter((sr: any) => {
    return sr.returnItems.some((i: any) => i.readyQty > (i.approvedQty || 0));
  }).length;
  
  console.log("Calculated count:", canApproveRetur);
}

main().catch(console.error).finally(() => prisma.$disconnect())
