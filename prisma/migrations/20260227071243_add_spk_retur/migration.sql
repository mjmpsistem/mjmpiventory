/*
  Warnings:

  - You are about to drop the column `isReturn` on the `spk` table. All the data in the column will be lost.
  - You are about to drop the column `parentSpkId` on the `spk` table. All the data in the column will be lost.
  - You are about to drop the column `returnSequence` on the `spk` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[soHeaderId]` on the table `spk` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "spk" DROP CONSTRAINT "spk_parentSpkId_fkey";

-- AlterTable
ALTER TABLE "spk" DROP COLUMN "isReturn",
DROP COLUMN "parentSpkId",
DROP COLUMN "returnSequence";

-- CreateTable
CREATE TABLE "spk_retur" (
    "id" UUID NOT NULL,
    "spkNumber" TEXT NOT NULL,
    "parentSpkId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_retur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_retur_item" (
    "id" UUID NOT NULL,
    "spkReturId" UUID NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "originalSpkItemId" UUID,
    "productReturnId" UUID,
    "itemStatus" TEXT NOT NULL DEFAULT 'QUEUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_retur_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_retur_item_progress" (
    "id" UUID NOT NULL,
    "spkReturItemId" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "resultQty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "wasteQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteUnit" TEXT,
    "operatorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spk_retur_item_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spk_retur_spkNumber_key" ON "spk_retur"("spkNumber");

-- CreateIndex
CREATE INDEX "spk_retur_parentSpkId_idx" ON "spk_retur"("parentSpkId");

-- CreateIndex
CREATE INDEX "spk_retur_item_progress_spkReturItemId_idx" ON "spk_retur_item_progress"("spkReturItemId");

-- CreateIndex
CREATE UNIQUE INDEX "spk_soHeaderId_key" ON "spk"("soHeaderId");

-- AddForeignKey
ALTER TABLE "spk_retur" ADD CONSTRAINT "spk_retur_parentSpkId_fkey" FOREIGN KEY ("parentSpkId") REFERENCES "spk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item" ADD CONSTRAINT "spk_retur_item_spkReturId_fkey" FOREIGN KEY ("spkReturId") REFERENCES "spk_retur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item" ADD CONSTRAINT "spk_retur_item_productReturnId_fkey" FOREIGN KEY ("productReturnId") REFERENCES "return_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item_progress" ADD CONSTRAINT "spk_retur_item_progress_spkReturItemId_fkey" FOREIGN KEY ("spkReturItemId") REFERENCES "spk_retur_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
