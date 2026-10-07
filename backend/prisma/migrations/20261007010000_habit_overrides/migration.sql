CREATE TABLE "HabitOverride" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"date" DATE NOT NULL,"habit" TEXT NOT NULL,"completed" BOOLEAN NOT NULL,CONSTRAINT "HabitOverride_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "HabitOverride_userId_date_habit_key" ON "HabitOverride"("userId","date","habit");
ALTER TABLE "HabitOverride" ADD CONSTRAINT "HabitOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
