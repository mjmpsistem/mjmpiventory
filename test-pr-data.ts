import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const prs = await prisma.productionRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log(prs.map(pr => ({ id: pr.id, spkNumber: pr.spkNumber, spkReturNumber: pr.spkReturNumber })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
