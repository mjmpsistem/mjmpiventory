const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const so = await prisma.salesOrder.findFirst();
  console.log(JSON.stringify(so, null, 2));
}

main();
