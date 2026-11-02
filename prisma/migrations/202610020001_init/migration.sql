-- Initial PostgreSQL schema. Prisma schema is the model source; add future SQL migrations without editing applied files.

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL
);

CREATE TABLE "SkillCategory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);

CREATE TABLE "SkillNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "prerequisites" TEXT NOT NULL,
  FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "RoleSkillRequirement" (
  "roleId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "target" INTEGER NOT NULL,
  "importance" INTEGER NOT NULL,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("skillId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("roleId", "skillId")
);

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roleId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Scenario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assessmentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "stakeholder" TEXT NOT NULL,
  "stakeholderRole" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AssessmentQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scenarioId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "phase" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "options" TEXT NOT NULL,
  "correct" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL,
  FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "QuestionSkillMapping" (
  "questionId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("skillId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("questionId", "skillId")
);

CREATE TABLE "AssessmentAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "score" INTEGER,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AssessmentAttempt_userId_status_idx" ON "AssessmentAttempt"("userId", "status");

CREATE TABLE "AssessmentAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selected" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssessmentAnswer_attemptId_questionId_key" ON "AssessmentAnswer"("attemptId", "questionId");

CREATE TABLE "SkillScore" (
  "attemptId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "evidence" INTEGER NOT NULL,
  FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("skillId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("attemptId", "skillId")
);

CREATE TABLE "LearningPath" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "skillIds" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LearningPath_attemptId_key" ON "LearningPath"("attemptId");

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "skillId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  FOREIGN KEY ("skillId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Lesson_skillId_key" ON "Lesson"("skillId");

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'interactive',
  "run" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'started',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

CREATE TABLE "PracticeAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "progressId" TEXT NOT NULL,
  "run" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL,
  "selected" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "first" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("progressId") REFERENCES "LessonProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReadinessReport" (
  "attemptId" TEXT NOT NULL PRIMARY KEY,
  "indicator" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "College" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);

CREATE TABLE "Cohort" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "collegeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CohortMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "diagnosed" BOOLEAN NOT NULL,
  "initialScores" TEXT NOT NULL,
  "currentScores" TEXT NOT NULL,
  "modulesCompleted" INTEGER NOT NULL,
  "modulesAssigned" INTEGER NOT NULL,
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "EmployerProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roleId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "EmployerSkillRequirement" (
  "profileId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "target" INTEGER NOT NULL,
  FOREIGN KEY ("profileId") REFERENCES "EmployerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("skillId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("profileId", "skillId")
);
