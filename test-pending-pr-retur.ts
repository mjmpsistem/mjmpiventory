import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const pendingPrRetur = await prisma.productionRequest.count({
    where: {
      status: "PENDING",
      spkReturNumber: { not: null }
    }
  });

  console.log("Pending PR Retur Count:", pendingPrRetur);
  
  const pendingPrReturList = await prisma.productionRequest.findMany({
    where: {
      status: "PENDING",
      spkReturNumber: { not: null }
    }
  });
  console.dir(pendingPrReturList, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect())
