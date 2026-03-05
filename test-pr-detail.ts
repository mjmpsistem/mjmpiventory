import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const pr = await prisma.productionRequest.findFirst({
    where: { spkReturNumber: 'SPK-20260302-001-1' },
    include: {
      spkRetur: {
        include: { returnItems: true }
      }
    }
  })
  console.dir(pr, { depth: null })
}

main().catch(console.error).finally(() => prisma.$disconnect())
