-- DropIndex
DROP INDEX "spk_soHeaderId_key";

-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "isReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentSpkId" UUID,
ADD COLUMN     "returnSequence" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_parentSpkId_fkey" FOREIGN KEY ("parentSpkId") REFERENCES "spk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
