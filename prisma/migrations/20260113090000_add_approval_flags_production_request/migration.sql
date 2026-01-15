-- AlterTable
ALTER TABLE "production_request"
ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvedAt" TIMESTAMP(3);

