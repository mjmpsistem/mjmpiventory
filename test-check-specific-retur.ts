import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const retur = await (prisma as any).spkRetur.findFirst({
    where: { spkNumber: 'SPK-20260302-001-1' },
    include: { returnItems: true }
  });

  if (retur) {
    console.log("Retur found:", retur.spkNumber, "Status:", retur.status);
    retur.returnItems.forEach((item: any) => {
      console.log(` - Item: ${item.namaBarang}, Qty: ${item.qty}, Ready: ${item.readyQty}, Approved: ${item.approvedQty}, Shipped: ${item.shippedQty}`);
    });
  } else {
    console.log("SPK-20260302-001-1 not found");
  }

  const allActiveReturs = await (prisma as any).spkRetur.findMany({
    where: { status: { not: 'DONE' } },
    include: { returnItems: true }
  });

  console.log("\nAll Active Returs:");
  allActiveReturs.forEach((r: any) => {
    console.log(`[${r.spkNumber}] Status: ${r.status}`);
    r.returnItems.forEach((item: any) => {
      console.log(`   - ${item.namaBarang}: Ready=${item.readyQty}, Approved=${item.approvedQty}, Shipped=${item.shippedQty}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect())
