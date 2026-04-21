-- Rename baseHealth to baseDef (copy data, then drop old column)
ALTER TABLE "CardGlobal" ADD COLUMN "baseDef" INTEGER NOT NULL DEFAULT 0;
UPDATE "CardGlobal" SET "baseDef" = "baseHealth";
ALTER TABLE "CardGlobal" DROP COLUMN "baseHealth";

-- Add baseConnection column with default value of 30
ALTER TABLE "CardGlobal" ADD COLUMN "baseConnection" INTEGER NOT NULL DEFAULT 30;
