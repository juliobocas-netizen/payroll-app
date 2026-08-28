-- Store per-day clock-in and clock-out times for time-based payroll calculation.
ALTER TABLE "PayrollInput"
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT,
ADD COLUMN "breakMinutes" INTEGER;
