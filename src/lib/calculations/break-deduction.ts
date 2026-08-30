/**
 * Break Deduction Calculator
 * Handles segment-aware break time deductions
 */

export interface BreakSegmentDeduction {
  segment: "day" | "evening" | "night";
  breakMinutes: number;
  breakStartTime: string;
  breakEndTime: string;
}

const MINUTES_PER_DAY = 24 * 60;

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

/**
 * Calculate which jornada segments a break spans and how many minutes in each
 * @param breakStartTime - Break start in HH:MM format
 * @param breakEndTime - Break end in HH:MM format
 * @returns Array of segment deductions with break minutes per segment
 */
export function getBreakSegmentDeductions(
  breakStartTime: string,
  breakEndTime: string
): BreakSegmentDeduction[] {
  if (!breakStartTime || !breakEndTime) return [];

  let breakStart = parseTime(breakStartTime);
  let breakEnd = parseTime(breakEndTime);

  // Handle overnight breaks
  if (breakEnd <= breakStart) {
    breakEnd += MINUTES_PER_DAY;
  }

  const segmentMinutes: Record<"day" | "evening" | "night", number> = {
    day: 0,
    evening: 0,
    night: 0,
  };

  // Count minutes in each segment
  for (let minute = breakStart; minute < breakEnd; minute++) {
    const segment = segmentForMinute(minute);
    segmentMinutes[segment]++;
  }

  // Build deduction array
  const deductions: BreakSegmentDeduction[] = [];

  if (segmentMinutes.day > 0) {
    deductions.push({
      segment: "day",
      breakMinutes: segmentMinutes.day,
      breakStartTime,
      breakEndTime,
    });
  }

  if (segmentMinutes.evening > 0) {
    deductions.push({
      segment: "evening",
      breakMinutes: segmentMinutes.evening,
      breakStartTime,
      breakEndTime,
    });
  }

  if (segmentMinutes.night > 0) {
    deductions.push({
      segment: "night",
      breakMinutes: segmentMinutes.night,
      breakStartTime,
      breakEndTime,
    });
  }

  return deductions;
}

/**
 * Get the jornada label for display
 */
export function getJornadaLabelForSegment(segment: "day" | "evening" | "night"): string {
  switch (segment) {
    case "day":
      return "Jornada Diurna";
    case "evening":
      return "Jornada Mixta";
    case "night":
      return "Jornada Nocturna";
    default:
      return "Jornada";
  }
}
