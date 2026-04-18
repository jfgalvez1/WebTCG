-- Convert any existing CLONE cards to COMMON before removing the enum value
UPDATE "UserInventory" SET "rarity" = 'COMMON' WHERE "rarity" = 'CLONE';

-- Remove CLONE from CardRarity enum
ALTER TYPE "CardRarity" RENAME TO "CardRarity_old";
CREATE TYPE "CardRarity" AS ENUM ('GENESIS', 'COMMON', 'DEAD_LINK');
ALTER TABLE "UserInventory" ALTER COLUMN "rarity" TYPE "CardRarity" USING "rarity"::text::"CardRarity";
DROP TYPE "CardRarity_old";

-- Enforce 1-of-1: each card URL can only be owned by one user globally
-- Remove duplicate rows keeping the oldest per URL before adding constraint
DELETE FROM "UserInventory"
WHERE "instanceId" NOT IN (
  SELECT DISTINCT ON ("url") "instanceId"
  FROM "UserInventory"
  ORDER BY "url", "dateAcquired" ASC
);

-- Add unique constraint on url
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_url_key" UNIQUE ("url");
