import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const requests = await prisma.productionRequest.findMany({
    where: { spkReturNumber: 'SPK-20260302-001-1' },
    include: {
      user: true,
      spk: { include: { lead: true, spkItems: true } },
      spkRetur: {
        include: {
          parentSpk: { include: { lead: true } },
          returnItems: {
            include: { item: true, originalSpkItem: { include: { salesOrder: true } } }
          }
        }
      },
      items: { include: { item: true } }
    }
  })
  
  console.dir(JSON.parse(JSON.stringify(requests)), { depth: null })
}

main().catch(console.error).finally(() => prisma.$disconnect())
