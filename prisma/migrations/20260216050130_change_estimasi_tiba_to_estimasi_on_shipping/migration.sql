/*
  Warnings:

  - You are about to drop the column `estimasiTiba` on the `shipping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shipping" DROP COLUMN "estimasiTiba",
ADD COLUMN     "estimasi" TIMESTAMP(3);
