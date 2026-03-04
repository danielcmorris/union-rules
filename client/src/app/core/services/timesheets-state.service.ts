import { Injectable } from '@angular/core';
import { TimesheetListItem } from '../models/timesheet-api.model';

@Injectable({ providedIn: 'root' })
export class TimesheetsStateService {
  startDate: Date | null = null;
  endDate: Date | null = null;
  timesheets: TimesheetListItem[] = [];
  searched = false;
}
