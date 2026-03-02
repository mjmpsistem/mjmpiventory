const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: {
      reservedStock: { gt: 0 }
    },
    include: {
      itemType: true,
      unit: true
    }
  });

  console.log('--- Items with Reserved Stock ---');
  console.log(JSON.stringify(items, null, 2));

  const histories = await prisma.stockHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      item: true,
      user: {
        select: { name: true }
      }
    }
  });

  console.log('\n--- Recent Stock History ---');
  histories.forEach(h => {
    console.log(`${h.createdAt.toISOString()} | ${h.item.name} | Qty: ${h.quantity} | Prev: ${h.previousStock} | New: ${h.newStock} | Reason: ${h.reason}`);
  });

  const productionRequests = await prisma.productionRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
        items: {
            include: {
                item: true
            }
        }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\n--- Recent Approved Production Requests ---');
  console.log(JSON.stringify(productionRequests, null, 2));
}

main();
