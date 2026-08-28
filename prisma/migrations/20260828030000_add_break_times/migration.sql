-- Preserve the first break boundaries imported from timesheets.
ALTER TABLE "PayrollInput"
ADD COLUMN "breakStartTime" TEXT,
ADD COLUMN "breakEndTime" TEXT;
