CREATE TABLE "GoalCheckIn" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoalCheckIn_goalId_date_key" ON "GoalCheckIn"("goalId", "date");
CREATE INDEX "GoalCheckIn_date_idx" ON "GoalCheckIn"("date");
ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
