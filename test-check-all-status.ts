import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const spks = await prisma.spk.findMany({
    include: { spkItems: true }
  });

  const returs = await (prisma as any).spkRetur.findMany({
    include: { returnItems: true }
  });

  console.log("--- SPKs ---");
  spks.forEach(s => {
    console.log(`[${s.spkNumber}] Status: ${s.status}, warehouseApproved: ${s.warehouseApproved}`);
    s.spkItems.forEach((si: any) => {
      console.log(`  - ${si.namaBarang}: Qty=${si.qty}, Ready=${si.readyQty}, Approved=${si.approvedQty}, Shipped=${si.shippedQty}`);
    });
  });

  console.log("\n--- Returs ---");
  returs.forEach((r: any) => {
    console.log(`[${r.spkNumber}] Status: ${r.status}`);
    r.returnItems.forEach((item: any) => {
      console.log(`  - ${item.namaBarang}: Qty=${item.qty}, Ready=${item.readyQty}, Approved=${item.approvedQty}, Shipped=${item.shippedQty}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect())
