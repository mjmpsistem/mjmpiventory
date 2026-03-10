/*
  Warnings:

  - A unique constraint covering the columns `[spkReturItemId]` on the table `spk_item_hpp` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "spk_item_hpp" ADD COLUMN     "isMergedWithReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spkReturItemId" UUID,
ALTER COLUMN "spkItemId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "spk_item_hpp_spkReturItemId_key" ON "spk_item_hpp"("spkReturItemId");

-- AddForeignKey
ALTER TABLE "spk_item_hpp" ADD CONSTRAINT "spk_item_hpp_spkReturItemId_fkey" FOREIGN KEY ("spkReturItemId") REFERENCES "spk_retur_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
