import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const spkCount = await prisma.spk.count();
  const returCount = await (prisma as any).spkRetur.count();
  const doneSpk = await prisma.spk.count({ where: { status: 'DONE' } });
  const doneRetur = await (prisma as any).spkRetur.count({ where: { status: 'DONE' } });
  
  console.log({ spkCount, returCount, doneSpk, doneRetur });
}
main().catch(console.error).finally(() => prisma.$disconnect())
