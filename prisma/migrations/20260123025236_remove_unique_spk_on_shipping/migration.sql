/*
  Warnings:

  - You are about to drop the column `spkId` on the `shipping` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "shipping_spkId_key";

-- AlterTable
ALTER TABLE "shipping" DROP COLUMN "spkId";
