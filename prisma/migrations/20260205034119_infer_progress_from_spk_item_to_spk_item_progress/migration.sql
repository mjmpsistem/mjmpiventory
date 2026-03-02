/*
  Warnings:

  - You are about to drop the column `actualQty` on the `spk_item` table. All the data in the column will be lost.
  - You are about to drop the column `wasteQty` on the `spk_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "spk_item" DROP COLUMN "actualQty",
DROP COLUMN "wasteQty";

-- CreateTable
CREATE TABLE "spk_item_progress" (
    "id" UUID NOT NULL,
    "spkItemId" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "resultQty" DOUBLE PRECISION NOT NULL,
    "wasteQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spk_item_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spk_item_progress_spkItemId_idx" ON "spk_item_progress"("spkItemId");

-- AddForeignKey
ALTER TABLE "spk_item_progress" ADD CONSTRAINT "spk_item_progress_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
