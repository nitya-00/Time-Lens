ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
DROP INDEX IF EXISTS "Category_name_key";
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
ALTER TABLE "User" ADD COLUMN "distractionOptions" JSONB;
ALTER TABLE "HourlyBlock" ADD COLUMN "customDistraction" TEXT;
