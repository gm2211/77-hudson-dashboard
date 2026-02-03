-- AlterTable
ALTER TABLE "Advisory" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "deletedAt" DATETIME;
