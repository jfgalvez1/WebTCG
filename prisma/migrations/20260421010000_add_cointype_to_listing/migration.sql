-- CreateEnum
CREATE TYPE "CoinType" AS ENUM ('STANDARD', 'PREMIUM');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "coinType" "CoinType" NOT NULL DEFAULT 'STANDARD';
