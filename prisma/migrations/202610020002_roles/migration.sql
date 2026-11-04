ALTER TABLE "User" ADD COLUMN "selectedRoleId" TEXT NOT NULL DEFAULT 'data-analyst';
ALTER TABLE "Cohort" ADD COLUMN "roleId" TEXT NOT NULL DEFAULT 'data-analyst';
