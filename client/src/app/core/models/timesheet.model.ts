export type PayType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EmployeeState = 'CA' | 'NV';
export type TimeClassification = 'ST' | 'PT' | 'DT' | 'UNPAID';

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  1: 'Planned Work',
  2: 'Routine Emergency – Callout on Day Off',
  3: 'Routine Emergency – Callout on Scheduled Workday',
  4: 'Routine Emergency – Pre-Arranged',
  5: 'Major Emergency – From Regular Show-Up',
  6: 'Major Emergency – First Day Away from Regular Show-Up',
  7: 'Major Emergency – Away from Regular Show-Up, After 1st Day'
};

// ── Request ────────────────────────────────────────────────────────────────

export interface JobRequest {
  jobId?: string;
  beginTime: string;      // ISO 8601 datetime
  endTime: string;        // ISO 8601 datetime
  lunchSkipped: boolean;
  payType: PayType;
}

export interface TimesheetCalculationRequest {
  timesheetId?: string;
  employeeId: string;
  employeeState: EmployeeState;
  employeeClass: string;
  priorTimesheetEndTime?: string | null;   // ISO 8601 datetime — null if no prior timesheet
  isFirstTimesheetOfDay: boolean;
  bonus220kv: boolean;
  bonus75Foot: boolean;
  bonusAerialBasket: boolean;
  jobs: JobRequest[];
}

// ── Response ───────────────────────────────────────────────────────────────

export interface TimeSegment {
  startTime: string;
  endTime: string;
  classification: TimeClassification;
  hours: number;
  reason: string;
}

export interface JobResult {
  jobId: string;
  beginTime: string;
  endTime: string;
  standardHours: number;
  premiumHours: number;
  doubleTimeHours: number;
  unpaidLunchHours: number;
  missedMeals: number;
  segments: TimeSegment[];
}

export interface TimesheetCalculationResult {
  timesheetId: string;

  // Time classification
  standardHours: number;
  premiumHours: number;
  doubleTimeHours: number;
  unpaidLunchHours: number;
  billedHours: number;

  // Missed meals
  missedMeals: number;
  missedMealDollars: number;

  // Subsistence
  subsistence: number;         // 0 or 1
  subsistenceDollars: number;

  // Bonuses
  bonus220kvHours: number;
  bonus220kvDollars: number;
  bonus75FootHours: number;
  bonus75FootDollars: number;
  bonusAerialBasketHours: number;
  bonusAerialBasketDollars: number;

  // Per-job breakdown
  jobs: JobResult[];

  // Gap tier used (informational)
  gapTier: 'LINKED' | 'PT_LOCK' | 'FRESH_START' | 'FIRST';
}
