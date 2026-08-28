-- Identify which manual capture mode produced each payroll input row.
ALTER TABLE "PayrollInput"
ADD COLUMN "captureMode" TEXT NOT NULL DEFAULT 'hours';

UPDATE "PayrollInput"
SET "captureMode" = CASE
  WHEN "startTime" IS NOT NULL OR "endTime" IS NOT NULL THEN 'in-out-times'
  WHEN "inputType" = 'amount' THEN 'amounts'
  ELSE 'hours'
END;
