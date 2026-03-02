const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shippedItems = await prisma.spkItem.findMany({
    where: {
      shippedQty: { gt: 0 }
    },
    include: {
      spk: true
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 10
  });

  console.log('--- Recent Shipped SPK Items ---');
  for (const si of shippedItems) {
    console.log(`ID: ${si.id}, SPK: ${si.spk.spkNumber}, Item: ${si.namaBarang}, Shipped: ${si.shippedQty}, ItemID: ${si.itemId}`);
    
    // Check if there is a transaction for this SPK and Item
    if (si.itemId) {
      const transactions = await prisma.transaction.findMany({
        where: {
          spkNumber: si.spk.spkNumber,
          itemId: si.itemId
        }
      });
      console.log(`  Transactions found: ${transactions.length}`);
      for (const t of transactions) {
        console.log(`    - TxID: ${t.id}, Qty: ${t.quantity}, Type: ${t.type}, Date: ${t.date}`);
      }
    } else {
      console.log('  No ItemID linked to this spkItem');
    }
    console.log('-------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
