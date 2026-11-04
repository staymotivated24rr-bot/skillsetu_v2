CREATE TABLE "DiagnosticSession" (
 "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiagnosticSession_tokenHash_key" ON "DiagnosticSession"("tokenHash");
CREATE TABLE "DiagnosticRun" (
 "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "roleId" TEXT NOT NULL,
 "bankId" TEXT NOT NULL, "engineVersion" TEXT NOT NULL, "bankSnapshot" TEXT NOT NULL,
 "bankDigest" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'in_progress',
 "currentQuestionId" TEXT, "currentRationale" TEXT NOT NULL,
 "hintUsed" BOOLEAN NOT NULL DEFAULT false, "draft" TEXT NOT NULL DEFAULT '{}',
 "report" TEXT, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "DiagnosticRun_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DiagnosticRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DiagnosticSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DiagnosticRun_sessionId_startedAt_idx" ON "DiagnosticRun"("sessionId", "startedAt");
CREATE TABLE "DiagnosticResponse" (
 "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "questionId" TEXT NOT NULL,
 "position" INTEGER NOT NULL, "payload" TEXT NOT NULL, "correct" BOOLEAN NOT NULL,
 "assisted" BOOLEAN NOT NULL, "misconception" TEXT, "rationale" TEXT NOT NULL,
 "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DiagnosticResponse_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DiagnosticResponse_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiagnosticRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DiagnosticResponse_runId_questionId_key" ON "DiagnosticResponse"("runId", "questionId");
CREATE UNIQUE INDEX "DiagnosticResponse_runId_position_key" ON "DiagnosticResponse"("runId", "position");
