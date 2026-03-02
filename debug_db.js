const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unitsCount = await prisma.unit.count();
  console.log('Units count:', unitsCount);
  
  const itemTypesCount = await prisma.itemType.count();
  console.log('ItemTypes count:', itemTypesCount);
  
  const itemsCount = await prisma.item.count();
  console.log('Items count:', itemsCount);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
