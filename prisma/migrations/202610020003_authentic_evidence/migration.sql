-- Additive: no legacy assessment, answer, learner or lesson rows are changed or removed.
CREATE TABLE "AssessmentBank" (
  "id" TEXT PRIMARY KEY, "roleId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "version" TEXT NOT NULL, "contentVersion" TEXT NOT NULL, "content" TEXT NOT NULL, "digest" TEXT NOT NULL
);
ALTER TABLE "AssessmentAttempt" ADD COLUMN "bankId" TEXT;
ALTER TABLE "AssessmentAttempt" ADD COLUMN "assessmentVersion" TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE "AssessmentAttempt" ADD COLUMN "contentVersion" TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE "AssessmentAttempt" ADD COLUMN "roleIdSnapshot" TEXT;
ALTER TABLE "AssessmentAttempt" ADD COLUMN "skillSnapshot" TEXT;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "AssessmentBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SkillScore" ADD COLUMN "quality" TEXT;
CREATE TABLE "TaskEvidence" (
 "id" TEXT PRIMARY KEY, "attemptId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "payload" TEXT NOT NULL,
 "score" DOUBLE PRECISION NOT NULL, "response" TEXT NOT NULL, "taskType" TEXT NOT NULL,
 "scenario" TEXT NOT NULL, "transfer" BOOLEAN NOT NULL, "mappings" TEXT NOT NULL,
 "bankId" TEXT NOT NULL, "assessmentVersion" TEXT NOT NULL, "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TaskEvidence_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TaskEvidence_attemptId_taskId_key" ON "TaskEvidence"("attemptId", "taskId");
CREATE TABLE "RepairRun" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "skillId" TEXT NOT NULL, "moduleVersion" TEXT NOT NULL,
 "contentSnapshot" TEXT NOT NULL, "mode" TEXT NOT NULL DEFAULT 'interactive', "run" INTEGER NOT NULL DEFAULT 1,
 "status" TEXT NOT NULL DEFAULT 'started',
 CONSTRAINT "RepairRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RepairRun_userId_skillId_key" ON "RepairRun"("userId", "skillId");
CREATE TABLE "RepairAnswer" (
 "id" TEXT PRIMARY KEY, "repairId" TEXT NOT NULL, "run" INTEGER NOT NULL, "taskId" TEXT NOT NULL,
 "payload" TEXT NOT NULL, "score" DOUBLE PRECISION NOT NULL, "first" BOOLEAN NOT NULL, "response" TEXT NOT NULL,
 "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RepairAnswer_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
