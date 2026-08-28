-- Add a salary basis discriminator while preserving existing monthly employees.
ALTER TABLE "Employee"
ADD COLUMN "salaryType" TEXT NOT NULL DEFAULT 'monthly';
