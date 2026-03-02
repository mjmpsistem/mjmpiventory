const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const units = await prisma.unit.findMany();
  console.log('--- Units ---');
  units.forEach(u => console.log(`[${u.id}] ${u.name}`));

  const itemTypes = await prisma.itemType.findMany({
    where: { category: 'BARANG_JADI' }
  });
  console.log('--- ItemTypes (BARANG_JADI) ---');
  itemTypes.forEach(it => console.log(`[${it.id}] ${it.name}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
