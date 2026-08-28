export type ShiftType = "day" | "mixed" | "night";

export interface TimeSegment {
  segment: "day" | "evening" | "night";
  hours: number;
  overtimeHours: number;
  multiplier: number;
  pay: number;
}

export interface TimePayrollResult {
  totalHours: number;
  dayHours: number;
  eveningHours: number;
  nightHours: number;
  overtimeHours: number;
  shiftType: ShiftType;
  baseRate: number;
  totalPay: number;
  premiums: number;
  breakdown: TimeSegment[];
}

const MINUTES_PER_DAY = 24 * 60;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseTime(value: string): number {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value);
  if (!match) throw new Error(`Invalid time: ${value}`);
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function segmentForMinute(minute: number): "day" | "evening" | "night" {
  const normalized = minute % MINUTES_PER_DAY;
  if (normalized >= 6 * 60 && normalized < 14 * 60) return "day";
  if (normalized >= 14 * 60 && normalized < 22 * 60) return "evening";
  return "night";
}

function baseMultiplier(segment: "day" | "evening" | "night"): number {
  if (segment === "evening") return 1.125;
  if (segment === "night") return 1.25;
  return 1;
}

function overtimeMultiplier(shiftType: ShiftType): number {
  if (shiftType === "night") return 1.75;
  if (shiftType === "mixed") return 1.5;
  return 1.25;
}

export function calculateTimePayroll({
  startTime,
  endTime,
  breakMinutes = 0,
  baseRate,
  isSunday = false,
  isHoliday = false,
}: {
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  baseRate: number;
  isSunday?: boolean;
  isHoliday?: boolean;
}): TimePayrollResult {
  let start = parseTime(startTime);
  let end = parseTime(endTime);
  if (end <= start) end += MINUTES_PER_DAY;

  const breakTime = Math.max(0, Math.min(breakMinutes, end - start));
  const workedMinutes = Math.max(0, end - start - breakTime);
  const rawMinutesBySegment = { day: 0, evening: 0, night: 0 };

  for (let minute = start; minute < end; minute++) {
    const breakOffset = minute - start;
    if (breakOffset >= workedMinutes && breakOffset < workedMinutes + breakTime) continue;
    rawMinutesBySegment[segmentForMinute(minute)] += 1;
  }

  const totalHours = workedMinutes / 60;
  const nightHours = rawMinutesBySegment.night / 60;
  const shiftType: ShiftType = rawMinutesBySegment.day === workedMinutes
    ? "day"
    : nightHours >= 3
      ? "night"
      : "mixed";
  const legalMaximum = shiftType === "day" ? 8 : shiftType === "mixed" ? 7.5 : 7;
  const overtimeHours = Math.max(0, totalHours - legalMaximum);
  const overtimeRate = overtimeMultiplier(shiftType);
  const specialMultiplier = isHoliday ? 2.5 : isSunday ? 1.5 : 1;
  const regularHours = Math.max(0, totalHours - overtimeHours);
  const breakdown: TimeSegment[] = [];
  let regularRemaining = regularHours;

  for (const segment of ["day", "evening", "night"] as const) {
    const segmentHours = rawMinutesBySegment[segment] / 60;
    const regularSegmentHours = Math.min(segmentHours, regularRemaining);
    const segmentOvertimeHours = Math.max(0, segmentHours - regularSegmentHours);
    regularRemaining -= regularSegmentHours;

    if (regularSegmentHours > 0) {
      const multiplier = specialMultiplier * baseMultiplier(segment);
      breakdown.push({
        segment,
        hours: round(regularSegmentHours),
        overtimeHours: 0,
        multiplier,
        pay: round(regularSegmentHours * baseRate * multiplier),
      });
    }
    if (segmentOvertimeHours > 0) {
      const multiplier = specialMultiplier + (overtimeRate - 1);
      breakdown.push({
        segment,
        hours: 0,
        overtimeHours: round(segmentOvertimeHours),
        multiplier,
        pay: round(segmentOvertimeHours * baseRate * multiplier),
      });
    }
  }

  const totalPay = round(breakdown.reduce((sum, item) => sum + item.pay, 0));
  const regularPay = round(regularHours * baseRate);
  return {
    totalHours: round(totalHours),
    dayHours: round(rawMinutesBySegment.day / 60),
    eveningHours: round(rawMinutesBySegment.evening / 60),
    nightHours: round(nightHours),
    overtimeHours: round(overtimeHours),
    shiftType,
    baseRate: round(baseRate),
    totalPay,
    premiums: round(totalPay - regularPay),
    breakdown,
  };
}
