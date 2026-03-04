import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TimesheetCalculationRequest,
  TimesheetCalculationResult
} from '../models/timesheet.model';
import { TimesheetListItem, TimesheetCalcRow, TimeSheetApiResponse, UserApiResponse } from '../models/timesheet-api.model';

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_RESULT: TimesheetCalculationResult = {
  timesheetId: 'mock-001',
  standardHours: 8,
  premiumHours: 2,
  doubleTimeHours: 0,
  unpaidLunchHours: 0.5,
  billedHours: 10.5,
  missedMeals: 1,
  missedMealDollars: 52.5,
  subsistence: 1,
  subsistenceDollars: 50,
  bonus220kvHours: 0,
  bonus220kvDollars: 0,
  bonus75FootHours: 0,
  bonus75FootDollars: 0,
  bonusAerialBasketHours: 0,
  bonusAerialBasketDollars: 0,
  gapTier: 'FRESH_START',
  jobs: [
    {
      jobId: 'job-001',
      beginTime: '2024-01-15T06:00:00',
      endTime: '2024-01-15T16:30:00',
      standardHours: 8,
      premiumHours: 2,
      doubleTimeHours: 0,
      unpaidLunchHours: 0.5,
      missedMeals: 1,
      segments: [
        {
          startTime: '2024-01-15T06:00:00',
          endTime:   '2024-01-15T14:00:00',
          classification: 'ST',
          hours: 8,
          reason: 'Within Standard Time Window'
        },
        {
          startTime: '2024-01-15T14:00:00',
          endTime:   '2024-01-15T14:30:00',
          classification: 'UNPAID',
          hours: 0.5,
          reason: 'Unpaid lunch break'
        },
        {
          startTime: '2024-01-15T14:30:00',
          endTime:   '2024-01-15T16:30:00',
          classification: 'PT',
          hours: 2,
          reason: 'Past Standard Time Window end (2:30 PM with lunch)'
        }
      ]
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly http = inject(HttpClient);
  private readonly useMock = true; // ← flip to false when real calculator API is ready

  calculate(request: TimesheetCalculationRequest): Observable<TimesheetCalculationResult> {
    if (this.useMock) {
      return of(MOCK_RESULT).pipe(delay(600));
    }
    return this.http.post<TimesheetCalculationResult>(
      `${environment.server}/api/timesheet/calculator`,
      request
    );
  }

  getTimesheetCalc(id: number): Observable<TimesheetCalcRow[]> {
    return this.http.post<TimesheetCalcRow[]>(
      `${environment.server}/api/cmd`,
      { parameters: [`@TimeSheetID=${id}`], procedure: 'cmdTimeSheetCalculator' }
    );
  }

  getTimesheet(id: number): Observable<TimeSheetApiResponse> {
    // sid is appended automatically by the auth interceptor
    return this.http.get<TimeSheetApiResponse>(
      `${environment.server}/api/TimeSheets/${id}`
    );
  }

  getUser(employeeId: number): Observable<UserApiResponse[]> {
    return this.http.get<UserApiResponse[]>(
      `${environment.server}/api/User/${employeeId}`
    );
  }

  getTimesheetList(startDate: string, endDate: string, sid: string): Observable<TimesheetListItem[]> {
    return this.http.get<TimesheetListItem[]>(
      `${environment.chatServer}/api/timesheet`,
      { params: { startDate, endDate, sid } }
    );
  }
}
