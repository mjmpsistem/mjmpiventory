import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const doneSpks = await prisma.spk.findMany({
    where: { status: 'DONE' },
    select: { spkNumber: true, status: true, updatedAt: true, warehouseApproved: true }
  });

  const doneReturs = await (prisma as any).spkRetur.findMany({
    where: { status: 'DONE' },
    select: { spkNumber: true, status: true, updatedAt: true }
  });

  console.log("DONE SPKs:", doneSpks);
  console.log("DONE Returs:", doneReturs);

  // Check and also check PARTIAL that have no authorized stock left
  const partialSpks = await prisma.spk.findMany({
    where: { status: 'PARTIAL' },
    include: { spkItems: true }
  });

  const partialReturs = await (prisma as any).spkRetur.findMany({
    where: { status: 'PARTIAL' },
    include: { returnItems: true }
  });

  console.log("\nPARTIAL SPKs check authorized stock:");
  partialSpks.forEach(s => {
    const hasAuth = s.spkItems.some((si: any) => {
      const avail = (si.approvedQty || 0) - (si.shippedQty || 0) - (si.onTruckQty || 0); // onTruckQty is not in DB but computed
      return avail > 0.001;
    });
    console.log(` - ${s.spkNumber}: hasAuthorizedStock (partial check) = ? (need to compute onTruck)`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect())
