ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "userId" TEXT;
DROP INDEX IF EXISTS "Category_name_key";
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "Category_userId_name_key" ON "Category"("userId", "name");
CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "distractionOptions" JSONB;
ALTER TABLE "HourlyBlock" ADD COLUMN IF NOT EXISTS "customDistraction" TEXT;
