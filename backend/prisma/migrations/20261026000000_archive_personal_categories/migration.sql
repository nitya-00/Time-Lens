ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "categoriesInitialized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Existing per-user category rows came from the first personalization release,
-- so do not seed their defaults again after they remove one.
UPDATE "User" SET "categoriesInitialized" = true
WHERE EXISTS (SELECT 1 FROM "Category" WHERE "Category"."userId" = "User"."id");
