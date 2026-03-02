const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: {
      category: 'BARANG_JADI'
    },
    select: {
      id: true,
      code: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    },
    take: 50
  });

  console.log('--- BARANG_JADI Items ---');
  for (const item of items) {
    console.log(`[${item.code}] ${item.name} (${item.id})`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
