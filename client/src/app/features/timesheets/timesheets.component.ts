import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TimesheetService } from '../../core/services/timesheet.service';
import { TimesheetsStateService } from '../../core/services/timesheets-state.service';
import { AuthService } from '../../core/auth/auth.service';
import { TimesheetListItem } from '../../core/models/timesheet-api.model';

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <a mat-icon-button routerLink="/calculator">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div>
            <h1 class="page-title">Time Sheets</h1>
            <p class="page-desc">Search and browse submitted time sheets</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filter-card">
        <div class="filter-row">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="date-field">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>

          <button mat-flat-button color="primary" class="search-btn"
                  (click)="onSearch()" [disabled]="loading()">
            <mat-icon>search</mat-icon>
            Search
          </button>
        </div>
      </mat-card>

      <!-- Results -->
      <mat-card class="results-card">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        @if (error()) {
          <div class="error-msg">
            <mat-icon>error_outline</mat-icon>
            {{ error() }}
          </div>
        }

        @if (!loading() && searched() && timesheets().length === 0 && !error()) {
          <div class="empty-msg">
            <mat-icon>search_off</mat-icon>
            No time sheets found for the selected date range.
          </div>
        }

        @if (timesheets().length > 0) {
          <div class="table-wrap">
            <table mat-table [dataSource]="timesheets()" class="ts-table">

              <ng-container matColumnDef="timesheetId">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let row">{{ row.timesheetId }}</td>
              </ng-container>

              <ng-container matColumnDef="timesheetDate">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let row">{{ row.timesheetDate | date:'M/d/yyyy' }}</td>
              </ng-container>

              <ng-container matColumnDef="foreman">
                <th mat-header-cell *matHeaderCellDef>Foreman</th>
                <td mat-cell *matCellDef="let row">{{ row.foreman }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let row">{{ row.email }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-chip" [attr.data-status]="row.status?.toLowerCase()">
                    {{ row.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="payType">
                <th mat-header-cell *matHeaderCellDef>Pay Type</th>
                <td mat-cell *matCellDef="let row">{{ row.payType ?? '—' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  class="clickable-row" (click)="openTimesheet(row)"></tr>
            </table>
          </div>
          <div class="result-count">{{ timesheets().length }} record(s)</div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      margin: 0;
      line-height: 1.2;
    }

    .page-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin: 0.15rem 0 0;
    }

    /* Filters */
    .filter-card {
      margin-bottom: 1.25rem;
      padding: 1.25rem 1.5rem;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .date-field {
      width: 200px;
    }

    .search-btn {
      height: 56px;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Results */
    .results-card {
      overflow: hidden;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .ts-table {
      width: 100%;
    }

    .ts-table th {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .ts-table td {
      font-size: 0.875rem;
      color: var(--text);
    }

    .clickable-row {
      cursor: pointer;
    }

    .clickable-row:hover {
      background: var(--primary-light);
    }

    .status-chip {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 500;
      background: var(--primary-light);
      color: var(--primary);
    }

    .status-chip[data-status="approved"] {
      background: #e6f4ea;
      color: #1e7e34;
    }

    .status-chip[data-status="pending"] {
      background: #fff8e1;
      color: #b8860b;
    }

    .status-chip[data-status="rejected"] {
      background: #fdecea;
      color: #c62828;
    }

    .result-count {
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }

    .empty-msg, .error-msg {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .error-msg {
      color: #c62828;
    }

    @media (max-width: 600px) {
      .date-field { width: 100%; }
      .filter-row { flex-direction: column; align-items: stretch; }
      .search-btn { width: 100%; justify-content: center; }
    }
  `]
})
export class TimesheetsComponent {
  private readonly timesheetService = inject(TimesheetService);
  private readonly stateService = inject(TimesheetsStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);

  readonly timesheets = signal<TimesheetListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searched = signal(false);

  readonly displayedColumns = ['timesheetId', 'timesheetDate', 'foreman', 'email', 'status', 'payType'];

  startDate: Date;
  endDate: Date;

  constructor() {
    // Restore from state service if available, otherwise default to last 7 days
    if (this.stateService.startDate && this.stateService.endDate) {
      this.startDate = this.stateService.startDate;
      this.endDate = this.stateService.endDate;
      this.timesheets.set(this.stateService.timesheets);
      this.searched.set(this.stateService.searched);
    } else {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      this.startDate = weekAgo;
      this.endDate = today;
    }
  }

  openTimesheet(row: TimesheetListItem): void {
    this.router.navigate(['/timesheets', row.timesheetId]);
  }

  onSearch(): void {
    const start = this.datePipe.transform(this.startDate, 'M/d/yyyy');
    const end = this.datePipe.transform(this.endDate, 'M/d/yyyy');

    const sid = this.authService.sid();
    if (!start || !end || !sid) return;

    this.loading.set(true);
    this.error.set(null);
    this.searched.set(true);

    this.timesheetService.getTimesheetList(start, end, sid).subscribe({
      next: (data) => {
        this.timesheets.set(data);
        this.loading.set(false);

        // Persist to state service
        this.stateService.startDate = this.startDate;
        this.stateService.endDate = this.endDate;
        this.stateService.timesheets = data;
        this.stateService.searched = true;
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load time sheets. Please try again.');
        this.timesheets.set([]);
        this.loading.set(false);
      }
    });
  }
}
