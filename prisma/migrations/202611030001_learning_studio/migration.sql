-- CreateTable
CREATE TABLE "LearningModuleVersion" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "evaluatorVersion" TEXT NOT NULL,
    "reviewState" TEXT NOT NULL,

    CONSTRAINT "LearningModuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLearningPlan" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "kind" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "mappingVersion" TEXT NOT NULL,
    "reportDigest" TEXT,
    "recommendationSnapshot" TEXT NOT NULL,
    "recommendationDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticLearningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLearningTarget" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "moduleVersionId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,

    CONSTRAINT "DiagnosticLearningTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLearningRun" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "currentStepId" TEXT NOT NULL,
    "draft" TEXT NOT NULL DEFAULT '{}',
    "draftRevision" INTEGER NOT NULL DEFAULT 0,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DiagnosticLearningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLearningSubmission" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "assisted" BOOLEAN NOT NULL,
    "first" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticLearningSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLearningEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticLearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningModuleVersion_sourceId_version_key" ON "LearningModuleVersion"("sourceId", "version");

-- CreateIndex
CREATE INDEX "DiagnosticLearningPlan_sessionId_createdAt_idx" ON "DiagnosticLearningPlan"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningPlan_sourceRunId_mappingVersion_key" ON "DiagnosticLearningPlan"("sourceRunId", "mappingVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningTarget_planId_position_key" ON "DiagnosticLearningTarget"("planId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningRun_targetId_ordinal_key" ON "DiagnosticLearningRun"("targetId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningSubmission_runId_idempotencyKey_key" ON "DiagnosticLearningSubmission"("runId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningSubmission_runId_stepId_attempt_key" ON "DiagnosticLearningSubmission"("runId", "stepId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningEvent_runId_sequence_key" ON "DiagnosticLearningEvent"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLearningEvent_runId_idempotencyKey_key" ON "DiagnosticLearningEvent"("runId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "DiagnosticLearningPlan" ADD CONSTRAINT "DiagnosticLearningPlan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DiagnosticSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningPlan" ADD CONSTRAINT "DiagnosticLearningPlan_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "DiagnosticRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningTarget" ADD CONSTRAINT "DiagnosticLearningTarget_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiagnosticLearningPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningTarget" ADD CONSTRAINT "DiagnosticLearningTarget_moduleVersionId_fkey" FOREIGN KEY ("moduleVersionId") REFERENCES "LearningModuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningRun" ADD CONSTRAINT "DiagnosticLearningRun_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DiagnosticLearningTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningSubmission" ADD CONSTRAINT "DiagnosticLearningSubmission_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiagnosticLearningRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLearningEvent" ADD CONSTRAINT "DiagnosticLearningEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiagnosticLearningRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only one first submitted response per learning step, even under concurrency.
CREATE UNIQUE INDEX "DiagnosticLearningSubmission_first_step_key" ON "DiagnosticLearningSubmission"("runId", "stepId") WHERE "first" = true;
