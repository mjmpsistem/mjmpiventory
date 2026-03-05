import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const requests = await prisma.productionRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.dir(JSON.parse(JSON.stringify(requests)), { depth: null })
}

main().catch(console.error).finally(() => prisma.$disconnect())
