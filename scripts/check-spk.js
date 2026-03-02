const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const spks = await prisma.spk.findMany({
    include: {
      spkItems: {
        include: {
          materialUsages: true
        }
      }
    }
  });
  console.log(JSON.stringify(spks, null, 2));
}

main();
