import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import {
  FormBuilder,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

import { TimesheetService } from '../../core/services/timesheet.service';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/auth/auth.service';
import { UNION_PAY_RULES } from '../../core/constants/rules.constant';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import {
  PAY_TYPE_LABELS,
  PayType,
  TimesheetCalculationResult,
  TimeClassification
} from '../../core/models/timesheet.model';
import { TimesheetCalcRow } from '../../core/models/timesheet-api.model';

// ── Employee class mapping ──────────────────────────────────────────────────
const CLASS_MAP: Record<string, string> = {
  'GF': 'General Foreman',
  'F':  'Foreman',
  'FM': 'Foreman',
  'JL': 'Journeyman Lineman',
  'AL': 'Apprentice Lineman',
  'GM': 'Groundman',
};

const EMPLOYEE_CLASSES = Object.values(CLASS_MAP);


@Component({
  selector: 'app-calculator',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatDatepickerModule,
    MarkdownPipe,
  ],
  template: `
    <div class="calculator-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Timesheet Calculator</h1>
          <p class="page-desc">Enter job details to calculate pay classifications.</p>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="main-layout">

        <!-- Load Timesheet -->
        <mat-card class="page-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">download</mat-icon>
              Load from Timesheet
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="load-row">
              <mat-form-field appearance="outline" class="ts-id-field">
                <mat-label>Timesheet ID</mat-label>
                <input matInput type="number" [formControl]="timesheetIdControl"
                       placeholder="e.g. 3154"/>
              </mat-form-field>
              <button mat-flat-button color="accent" type="button"
                      (click)="loadTimesheet()" [disabled]="loadingTs()">
                @if (loadingTs()) {
                  <mat-spinner diameter="18" class="btn-spinner-sm"></mat-spinner>
                } @else {
                  <mat-icon>search</mat-icon>
                }
                Load
              </button>
            </div>

            @if (loadError()) {
              <div class="load-error">{{ loadError() }}</div>
            }

            @if (calcRows()) {
              <div class="ts-meta">
                <span class="ts-date">{{ tsDateDisplay() }}</span>
                <span class="ts-badge">{{ calcRows()![0].yard }}</span>
                <span class="ts-paytype">{{ calcRows()![0].tradeUnion }}</span>
              </div>
              <div class="crew-list">
                @for (c of uniqueCrew(); track c.name) {
                  <button type="button"
                          class="crew-card"
                          [class.selected]="selectedCrewName() === c.name"
                          (click)="selectCrewMember(c.name)">
                    <span class="crew-name">{{ c.name }}</span>
                    <span class="crew-class">{{ c.cls }}</span>
                  </button>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        @if (result()) {

          <!-- Summary -->
          <mat-card class="page-card results-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon success-icon">check_circle</mat-icon>
                Summary
              </mat-card-title>
              @if (hasSegments()) {
                <span class="gap-tier-badge">{{ result()!.gapTier }}</span>
              }
            </mat-card-header>
            <mat-card-content>
              <div class="summary-grid">
                <div class="summary-tile st-tile">
                  <span class="tile-value">{{ result()!.standardHours | number:'1.1-2' }}</span>
                  <span class="tile-label">ST Hours</span>
                </div>
                <div class="summary-tile pt-tile">
                  <span class="tile-value">{{ result()!.premiumHours | number:'1.1-2' }}</span>
                  <span class="tile-label">PT Hours</span>
                </div>
                <div class="summary-tile meal-tile">
                  <span class="tile-value">{{ result()!.missedMeals }}</span>
                  <span class="tile-label">Missed Meals</span>
                </div>
                <div class="summary-tile subsistence-tile">
                  <span class="tile-value">{{ result()!.subsistence > 0 ? 1 : 0 }}</span>
                  <span class="tile-label">Subsistence</span>
                </div>
              </div>

              @if (lastWorkTime()) {
                <div class="gap-info" [class.gap-short]="(gapHours() ?? 99) < 8">
                  <mat-icon>schedule</mat-icon>
                  <span>
                    Last work: {{ lastWorkTime() | date:'MMM d, h:mm a' }}
                    &nbsp;·&nbsp;
                    <strong>{{ gapHours() }}h gap</strong>
                    @if ((gapHours() ?? 99) < 8) {
                      <span class="gap-warn">&nbsp;— gap &lt; 8h, may affect ST/PT</span>
                    }
                  </span>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Ask VertexAI -->
          <mat-card class="page-card chat-inline-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon" style="color:#1a73e8">search</mat-icon>
                Ask VertexAI about {{ selectedCrewName() ?? 'this timesheet' }}
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>

              @if (vertexMessages().length > 0) {
                <div class="inline-chat-msgs">
                  @for (msg of vertexMessages(); track $index) {
                    <div class="inline-msg" [class.user-msg]="msg.role === 'user'" [class.asst-msg]="msg.role === 'assistant'">
                      <div class="inline-bubble markdown-body" [innerHTML]="msg.content | markdown"></div>
                    </div>
                  }
                  @if (vertexLoading()) {
                    <div class="inline-msg asst-msg">
                      <div class="inline-bubble typing-bubble">
                        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                      </div>
                    </div>
                  }
                </div>
              }

              <div class="inline-input-row">
                <mat-form-field appearance="outline" class="inline-field">
                  <mat-label>Ask about pay rules, this timesheet, or a crew member...</mat-label>
                  <input matInput [(ngModel)]="vertexInput"
                         (keydown.enter)="onVertexSend()"
                         [disabled]="vertexLoading()"
                         autocomplete="off"/>
                </mat-form-field>
                <button mat-flat-button color="primary" class="inline-send-btn"
                        (click)="onVertexSend()"
                        [disabled]="vertexLoading() || !vertexInput.trim()">
                  <mat-icon>send</mat-icon>
                </button>
              </div>

            </mat-card-content>
          </mat-card>

          <!-- Per-Job Breakdown -->
          <mat-card class="page-card results-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon">work</mat-icon>
                Per-Job Breakdown
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="job-breakdown-table-wrapper">
                <table class="job-breakdown-table">
                  <thead>
                    <tr>
                      <th class="col-job">Job</th>
                      <th class="col-time">Start</th>
                      <th class="col-time">End</th>
                      <th>ST</th>
                      <th>PT</th>
                      <th>DT</th>
                      <th>MM</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (job of result()!.jobs; track job.jobId; let i = $index) {
                      <tr>
                        <td class="job-id-cell">{{ jobLabels()[i] ?? ('Job ' + (i + 1)) }}</td>
                        <td class="time-cell">{{ jobStartTimes()[i] }}</td>
                        <td class="time-cell">{{ jobEndTimes()[i] }}</td>
                        <td class="hours-cell st-hours">{{ job.standardHours | number:'1.1-2' }}</td>
                        <td class="hours-cell pt-hours">{{ job.premiumHours | number:'1.1-2' }}</td>
                        <td class="hours-cell dt-hours">{{ job.doubleTimeHours | number:'1.1-2' }}</td>
                        <td class="hours-cell">{{ job.missedMeals }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Segment Timeline (only shown for manually-calculated results) -->
          @if (hasSegments()) {
          <mat-card class="page-card results-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="section-icon">timeline</mat-icon>
                Segment Timeline
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (job of result()!.jobs; track job.jobId; let i = $index) {
                @if (result()!.jobs.length > 1) {
                  <div class="timeline-job-header">{{ jobLabels()[i] ?? ('Job ' + (i + 1)) }}</div>
                }
                <div class="timeline">
                  @for (seg of job.segments; track seg.startTime) {
                    <div class="timeline-segment" [ngClass]="getSegmentClass(seg.classification)">
                      <div class="segment-badge" [ngClass]="getBadgeClass(seg.classification)">
                        {{ seg.classification }}
                      </div>
                      <div class="segment-body">
                        <div class="segment-time">
                          {{ formatTime(seg.startTime) }} – {{ formatTime(seg.endTime) }}
                        </div>
                        <div class="segment-hours">{{ seg.hours | number:'1.1-2' }} hrs</div>
                        <div class="segment-reason">{{ seg.reason }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
          } <!-- end @if segments -->

        } <!-- end @if result() -->

        <!-- Hidden form (kept for manual calculation fallback) -->
        <div style="display:none">
        <form [formGroup]="form" (ngSubmit)="onCalculate()">

            <!-- Employee Info -->
            <mat-card class="form-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon">person</mat-icon>
                  Employee Information
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="field-grid">

                  <mat-form-field appearance="outline">
                    <mat-label>Employee Email</mat-label>
                    <input matInput type="email" formControlName="employeeId"
                           placeholder="e.g. john@company.com"/>
                    @if (form.get('employeeId')?.hasError('required') && form.get('employeeId')?.touched) {
                      <mat-error>Email is required</mat-error>
                    }
                    @if (form.get('employeeId')?.hasError('email') && form.get('employeeId')?.touched) {
                      <mat-error>Enter a valid email address</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Employee State</mat-label>
                    <mat-select formControlName="employeeState">
                      <mat-option value="CA">California (CA)</mat-option>
                      <mat-option value="NV">Nevada (NV)</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Employee Class</mat-label>
                    <mat-select formControlName="employeeClass">
                      @for (cls of employeeClasses; track cls) {
                        <mat-option [value]="cls">{{ cls }}</mat-option>
                      }
                    </mat-select>
                    @if (form.get('employeeClass')?.hasError('required') && form.get('employeeClass')?.touched) {
                      <mat-error>Employee class is required</mat-error>
                    }
                  </mat-form-field>

                </div>

                <div class="checkbox-row">
                  <mat-checkbox formControlName="isFirstTimesheetOfDay" color="primary">
                    This is the first timesheet of the day
                  </mat-checkbox>
                </div>

                @if (!form.get('isFirstTimesheetOfDay')?.value) {
                  <div class="prior-section">
                    <div class="prior-label">Prior Timesheet End Time</div>
                    <div class="time-row">
                      <mat-form-field appearance="outline" class="date-field">
                        <mat-label>Date</mat-label>
                        <input matInput [matDatepicker]="priorPicker" formControlName="priorDate"/>
                        <mat-datepicker-toggle matIconSuffix [for]="priorPicker"></mat-datepicker-toggle>
                        <mat-datepicker #priorPicker></mat-datepicker>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="hr-field">
                        <mat-label>Hr</mat-label>
                        <mat-select formControlName="priorHour">
                          @for (h of hours; track h) {
                            <mat-option [value]="h">{{ h }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="min-field">
                        <mat-label>Min</mat-label>
                        <mat-select formControlName="priorMinute">
                          @for (m of minutes; track m) {
                            <mat-option [value]="m">:{{ m }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="ampm-field">
                        <mat-label>AM/PM</mat-label>
                        <mat-select formControlName="priorAmPm">
                          <mat-option value="AM">AM</mat-option>
                          <mat-option value="PM">PM</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                }

              </mat-card-content>
            </mat-card>

            <!-- Bonus Flags -->
            <mat-card class="form-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon">star</mat-icon>
                  Bonus Flags
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="bonus-grid">
                  <mat-checkbox formControlName="bonus220kv" color="primary">
                    <span class="bonus-label">
                      <strong>220kV Bonus</strong>
                      <span class="bonus-desc">Work on 220kV energized lines</span>
                    </span>
                  </mat-checkbox>
                  <mat-checkbox formControlName="bonus75Foot" color="primary">
                    <span class="bonus-label">
                      <strong>75-Foot Bonus</strong>
                      <span class="bonus-desc">Work at heights over 75 feet</span>
                    </span>
                  </mat-checkbox>
                  <mat-checkbox formControlName="bonusAerialBasket" color="primary">
                    <span class="bonus-label">
                      <strong>Aerial Basket Bonus</strong>
                      <span class="bonus-desc">Use of aerial basket equipment</span>
                    </span>
                  </mat-checkbox>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Jobs -->
            <mat-card class="form-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon">work</mat-icon>
                  Jobs
                </mat-card-title>
                <div class="card-header-action">
                  <button mat-flat-button color="primary" type="button" (click)="addJob()" class="add-job-btn">
                    <mat-icon>add</mat-icon>
                    Add Job
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                @for (job of jobsArray.controls; track $index) {
                  <div class="job-entry" [class.not-first]="$index > 0">
                    <div class="job-header">
                      <span class="job-label">
                        {{ jobLabels()[$index] ?? ('Job ' + ($index + 1)) }}
                      </span>
                      @if (jobsArray.length > 1) {
                        <button mat-icon-button type="button" color="warn"
                                (click)="removeJob($index)"
                                matTooltip="Remove this job">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </div>

                    <div [formGroup]="getJobGroup($index)">

                      <!-- Begin Time -->
                      <div class="time-row-wrapper">
                        <span class="time-row-label">Begin</span>
                        <div class="time-row">
                          <mat-form-field appearance="outline" class="date-field">
                            <mat-label>Date</mat-label>
                            <input matInput [matDatepicker]="beginPicker" formControlName="beginDate"/>
                            <mat-datepicker-toggle matIconSuffix [for]="beginPicker"></mat-datepicker-toggle>
                            <mat-datepicker #beginPicker></mat-datepicker>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="hr-field">
                            <mat-label>Hr</mat-label>
                            <mat-select formControlName="beginHour">
                              @for (h of hours; track h) {
                                <mat-option [value]="h">{{ h }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="min-field">
                            <mat-label>Min</mat-label>
                            <mat-select formControlName="beginMinute">
                              @for (m of minutes; track m) {
                                <mat-option [value]="m">:{{ m }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="ampm-field">
                            <mat-label>AM/PM</mat-label>
                            <mat-select formControlName="beginAmPm">
                              <mat-option value="AM">AM</mat-option>
                              <mat-option value="PM">PM</mat-option>
                            </mat-select>
                          </mat-form-field>
                        </div>
                      </div>

                      <!-- End Time -->
                      <div class="time-row-wrapper">
                        <span class="time-row-label">End</span>
                        <div class="time-row">
                          <mat-form-field appearance="outline" class="date-field">
                            <mat-label>Date</mat-label>
                            <input matInput [matDatepicker]="endPicker" formControlName="endDate"/>
                            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                            <mat-datepicker #endPicker></mat-datepicker>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="hr-field">
                            <mat-label>Hr</mat-label>
                            <mat-select formControlName="endHour">
                              @for (h of hours; track h) {
                                <mat-option [value]="h">{{ h }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="min-field">
                            <mat-label>Min</mat-label>
                            <mat-select formControlName="endMinute">
                              @for (m of minutes; track m) {
                                <mat-option [value]="m">:{{ m }}</mat-option>
                              }
                            </mat-select>
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="ampm-field">
                            <mat-label>AM/PM</mat-label>
                            <mat-select formControlName="endAmPm">
                              <mat-option value="AM">AM</mat-option>
                              <mat-option value="PM">PM</mat-option>
                            </mat-select>
                          </mat-form-field>
                        </div>
                      </div>

                      <!-- Pay Type & Lunch -->
                      <div class="job-bottom-row">
                        <mat-form-field appearance="outline" class="pay-type-field">
                          <mat-label>Pay Type</mat-label>
                          <mat-select formControlName="payType">
                            @for (entry of payTypeEntries; track entry.key) {
                              <mat-option [value]="entry.key">{{ entry.key }} – {{ entry.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-checkbox formControlName="lunchSkipped" color="primary" class="lunch-check">
                          Lunch skipped
                        </mat-checkbox>
                      </div>

                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- Submit -->
            <div class="submit-row">
              @if (error()) {
                <div class="error-banner">
                  <mat-icon>error_outline</mat-icon>
                  <span>{{ error() }}</span>
                </div>
              }
              <button mat-flat-button color="primary" type="submit"
                      class="calculate-btn" [disabled]="loading()">
                @if (loading()) {
                  <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
                  Calculating...
                } @else {
                  <ng-container>
                    <mat-icon>calculate</mat-icon>
                    Calculate
                  </ng-container>
                }
              </button>
            </div>

          </form>
          </div><!-- end hidden -->

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Page ─────────────────────────────────────── */

    .calculator-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 3rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.2rem;
    }

    .page-desc  { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
    .chat-link-btn { white-space: nowrap; flex-shrink: 0; }

    /* ── Layout ───────────────────────────────────── */

    .main-layout { display: flex; flex-direction: column; gap: 1.25rem; }

    /* ── Cards ────────────────────────────────────── */

    .page-card, .form-card, .results-card {
      background: var(--surface);
      box-shadow: var(--shadow-sm) !important;
      border-radius: var(--radius) !important;
      border: 1px solid var(--border);
    }

    .page-card mat-card-header,
    .form-card mat-card-header,
    .results-card mat-card-header {
      padding-bottom: 0.4rem;
    }

    .page-card mat-card-title,
    .form-card mat-card-title,
    .results-card mat-card-title {
      display: flex !important;
      align-items: center !important;
      gap: 0.45rem !important;
      font-size: 0.95rem !important;
      font-weight: 600 !important;
      color: var(--text) !important;
    }

    .section-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--primary);
    }

    .card-header-action { margin-left: auto; }

    mat-form-field { width: 100%; }

    /* ── Employee fields ──────────────────────────── */

    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.875rem; }

    @media (max-width: 540px) { .field-grid { grid-template-columns: 1fr; } }

    .full-width { grid-column: 1 / -1; }

    .checkbox-row { margin: 0.1rem 0 0.4rem; }

    /* ── Load Timesheet ──────────────────────────── */

    .load-row { display: flex; gap: 0.75rem; align-items: flex-start; }
    .ts-id-field { flex: 1; }

    .load-row button {
      margin-top: 4px;
      height: 56px;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
    }

    .btn-spinner-sm { display: inline-block; }

    .load-error {
      margin-top: 0.5rem;
      color: #a0392e;
      font-size: 0.82rem;
      background: #fdf0ee;
      border: 1px solid #e8c4be;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
    }

    .ts-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.6rem 0 0.4rem;
      font-size: 0.83rem;
      color: var(--text-secondary);
    }

    .ts-date { font-weight: 600; color: var(--text); }

    .ts-badge {
      background: var(--primary-light);
      color: var(--primary);
      border-radius: 999px;
      padding: 0.13rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ts-paytype { color: var(--text-muted); font-size: 0.8rem; }

    .crew-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }

    .crew-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0.45rem 0.8rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }

    .crew-card:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .crew-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
      box-shadow: 0 0 0 2px rgba(58,109,199,0.25);
    }

    .crew-name { font-weight: 600; font-size: 0.85rem; color: var(--text); }

    .crew-class {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 0.1rem;
    }

    /* ── Prior timesheet ──────────────────────────── */

    .prior-section {
      margin-top: 0.6rem;
      padding: 0.7rem 0.85rem;
      background: #f8f9fb;
      border-radius: 8px;
      border: 1px dashed var(--border);
    }

    .prior-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* ── Time rows ────────────────────────────────── */

    .time-row-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }

    .time-row-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-top: 1rem;
      min-width: 34px;
      flex-shrink: 0;
    }

    /* Desktop: date + 3 dropdowns in one row */
    .time-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 0.45rem;
      flex: 1;
    }

    /* Mobile: date full-width, then hr/min/ampm row */
    @media (max-width: 600px) {
      .time-row-wrapper { flex-direction: column; gap: 0.15rem; }

      .time-row-label { padding-top: 0; }

      .time-row {
        grid-template-columns: 1fr 1fr 1fr;
        width: 100%;
      }

      .date-field { grid-column: 1 / -1; }
    }

    /* ── Bonus flags ──────────────────────────────── */

    .bonus-grid { display: flex; flex-direction: column; gap: 0.9rem; }

    .bonus-label { display: flex; flex-direction: column; line-height: 1.3; margin-left: 0.2rem; }

    .bonus-desc { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; margin-top: 0.1rem; }

    /* ── Jobs ─────────────────────────────────────── */

    .job-entry { padding-bottom: 1.1rem; }
    .job-entry.not-first { border-top: 1px solid var(--border); padding-top: 1.1rem; }

    .job-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.6rem;
    }

    .job-label { font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); }

    .job-bottom-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      margin-top: 0.15rem;
      flex-wrap: wrap;
    }

    .pay-type-field { flex: 1; min-width: 160px; }
    .lunch-check    { white-space: nowrap; padding-bottom: 1rem; }
    .add-job-btn    { font-size: 0.83rem; }

    /* ── Submit ───────────────────────────────────── */

    .submit-row { display: flex; flex-direction: column; align-items: stretch; gap: 0.6rem; }

    .calculate-btn {
      height: 46px;
      font-size: 0.95rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
    }

    .btn-spinner { display: inline-block; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fdf0ee;
      border: 1px solid #e8c4be;
      color: #a0392e;
      border-radius: 6px;
      padding: 0.55rem 0.9rem;
      font-size: 0.84rem;
    }

    /* ── Results ──────────────────────────────────── */

    .results-column { display: flex; flex-direction: column; gap: 1rem; }

    .results-card mat-card-header {
      padding-bottom: 0.4rem;
      display: flex;
      align-items: center;
    }

    .success-icon { color: #3a7a48 !important; }

    .gap-tier-badge {
      margin-left: auto;
      font-size: 0.66rem;
      font-weight: 700;
      background: var(--primary-light);
      color: var(--primary);
      border-radius: 999px;
      padding: 0.18rem 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Summary tiles ────────────────────────────── */

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.6rem;
      margin-bottom: 0.9rem;
    }

    @media (max-width: 480px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }

    .summary-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.9rem 0.4rem;
      border-radius: 8px;
      text-align: center;
    }

    .tile-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }

    .tile-label {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 0.28rem;
    }

    /* Soft, desaturated tile colors */
    .st-tile          { background: #eef5ef; color: #2d6b3f; }
    .pt-tile          { background: #fdf5e8; color: #7a5220; }
    .meal-tile        { background: #f3f0fa; color: #4e3d87; }
    .subsistence-tile { background: #edf5f8; color: #235f71; }

    /* ── Bonus flags (results) ────────────────────── */

    .bonus-flags-result {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      border-top: 1px solid var(--border);
      padding-top: 0.7rem;
    }

    .bonus-flag-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .bonus-flag-row mat-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--text-muted);
    }

    .bonus-flag-row.flag-on          { color: #2d6b3f; }
    .bonus-flag-row.flag-on mat-icon { color: #3a7a48 !important; }

    /* ── Gap info ─────────────────────────────────── */

    .gap-info {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: #f4f6f9;
      border-radius: 6px;
      padding: 0.45rem 0.7rem;
      margin-bottom: 0.75rem;
    }

    .gap-info mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; flex-shrink: 0; }

    .gap-info.gap-short {
      background: #fff8ec;
      color: #7a4f10;
    }

    .gap-warn { color: #b85c00; font-weight: 500; }

    /* ── Per-job table ────────────────────────────── */

    .job-breakdown-table-wrapper { overflow-x: auto; }

    .job-breakdown-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }

    .job-breakdown-table th {
      text-align: right;
      padding: 0.45rem 0.7rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }

    .job-breakdown-table .col-job  { text-align: left; }
    .job-breakdown-table .col-time { text-align: left; }

    .job-breakdown-table td {
      padding: 0.55rem 0.7rem;
      border-bottom: 1px solid #f0f2f5;
      text-align: right;
      color: var(--text);
    }

    .job-breakdown-table tr:last-child td { border-bottom: none; }

    .job-id-cell { text-align: left; font-weight: 600; color: var(--text); white-space: nowrap; }
    .time-cell   { text-align: left; color: var(--text-secondary); white-space: nowrap; font-size: 0.82rem; }
    .st-hours    { color: #2d6b3f; font-weight: 600; }
    .pt-hours    { color: #7a5220; font-weight: 600; }
    .dt-hours    { color: #7a2840; font-weight: 600; }

    /* ── Timeline ─────────────────────────────────── */

    .timeline-job-header {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      padding: 0.2rem 0 0.45rem;
      margin-bottom: 0.45rem;
      border-bottom: 1px solid var(--border);
    }

    .timeline { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 0.9rem; }
    .timeline:last-child { margin-bottom: 0; }

    .timeline-segment {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.55rem 0.7rem;
      border-radius: 7px;
      border-left: 3px solid transparent;
    }

    .segment-st     { background: #f1f7f2; border-left-color: #5a8a68; }
    .segment-pt     { background: #fdf8ee; border-left-color: #b89040; }
    .segment-dt     { background: #fdf0f3; border-left-color: #b04060; }
    .segment-unpaid { background: #f5f6f8; border-left-color: #a0aab8; }

    .segment-badge {
      flex-shrink: 0;
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.18rem 0.45rem;
      border-radius: 4px;
      margin-top: 0.1rem;
    }

    .badge-st     { background: #5a8a68; color: white; }
    .badge-pt     { background: #b89040; color: white; }
    .badge-dt     { background: #b04060; color: white; }
    .badge-unpaid { background: #a0aab8; color: white; }

    .segment-body  { flex: 1; min-width: 0; }
    .segment-time  { font-size: 0.8rem; font-weight: 600; color: var(--text); }
    .segment-hours { font-size: 0.75rem; color: var(--text-secondary); }
    .segment-reason { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem; line-height: 1.4; }

    /* ── Global responsive tweaks ─────────────────── */

    @media (max-width: 600px) {
      .calculator-page { padding: 1rem 0.75rem 2rem; }
      .page-title      { font-size: 1.25rem; }
      .page-header     { margin-bottom: 1rem; }
    }

    /* ── Inline Gemini chat ───────────────────────────── */

    .chat-inline-card { padding-bottom: 0.25rem !important; }

    .inline-chat-msgs {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-height: 360px;
      overflow-y: auto;
      padding: 0.25rem 0 0.75rem;
    }

    .inline-msg { display: flex; }
    .user-msg   { justify-content: flex-end; }
    .asst-msg   { justify-content: flex-start; }

    .inline-bubble {
      max-width: 82%;
      padding: 0.55rem 0.8rem;
      border-radius: 12px;
      font-size: 0.85rem;
      line-height: 1.55;
      word-break: break-word;
    }

    /* Markdown content styles inside assistant bubbles */
    .inline-bubble.markdown-body p  { margin: 0 0 0.5em; }
    .inline-bubble.markdown-body p:last-child { margin-bottom: 0; }
    .inline-bubble.markdown-body ul,
    .inline-bubble.markdown-body ol  { margin: 0.3em 0 0.5em 1.2em; padding: 0; }
    .inline-bubble.markdown-body li  { margin-bottom: 0.2em; }
    .inline-bubble.markdown-body strong { font-weight: 700; }
    .inline-bubble.markdown-body em  { font-style: italic; }
    .inline-bubble.markdown-body code {
      font-family: monospace;
      font-size: 0.82em;
      background: rgba(0,0,0,0.08);
      border-radius: 3px;
      padding: 0.1em 0.35em;
    }
    .inline-bubble.markdown-body pre {
      background: rgba(0,0,0,0.06);
      border-radius: 6px;
      padding: 0.5em 0.7em;
      overflow-x: auto;
      margin: 0.4em 0;
    }
    .inline-bubble.markdown-body pre code { background: none; padding: 0; }
    .inline-bubble.markdown-body h1,
    .inline-bubble.markdown-body h2,
    .inline-bubble.markdown-body h3 {
      font-size: 0.9em;
      font-weight: 700;
      margin: 0.5em 0 0.25em;
    }
    .inline-bubble.markdown-body table {
      border-collapse: collapse;
      font-size: 0.82em;
      margin: 0.4em 0;
      width: 100%;
    }
    .inline-bubble.markdown-body th,
    .inline-bubble.markdown-body td {
      border: 1px solid rgba(0,0,0,0.15);
      padding: 0.25em 0.5em;
    }
    .inline-bubble.markdown-body th { font-weight: 700; background: rgba(0,0,0,0.05); }

    .user-msg .inline-bubble {
      background: #3a6dc7;
      color: #fff;
      border-bottom-right-radius: 3px;
    }

    .asst-msg .inline-bubble {
      background: #f2f4f7;
      color: var(--text);
      border-bottom-left-radius: 3px;
    }

    .typing-bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0.55rem 0.9rem;
    }

    .dot {
      width: 6px; height: 6px;
      background: var(--text-muted);
      border-radius: 50%;
      animation: dotBounce 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%           { transform: translateY(-5px); }
    }

    .inline-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.25rem;
    }

    .inline-field { flex: 1; margin-bottom: -1.25em; }

    .inline-send-btn {
      height: 44px; width: 44px; min-width: 44px;
      border-radius: 50% !important;
      flex-shrink: 0;
      padding: 0 !important;
      display: flex; align-items: center; justify-content: center;
    }
  `]
})
export class CalculatorComponent implements OnInit {
  private readonly fb                = inject(FormBuilder);
  private readonly timesheetService  = inject(TimesheetService);
  private readonly chatService       = inject(ChatService);
  private readonly http              = inject(HttpClient);
  readonly authService               = inject(AuthService);

  // ── Calculator state ────────────────────────────────────────────────────
  readonly result  = signal<TimesheetCalculationResult | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  // ── Inline Gemini chat ──────────────────────────────────────────────────
  readonly chatMessages   = signal<{ role: 'user' | 'assistant'; content: string }[]>([]);
  readonly chatLoading    = signal(false);
  readonly rulesContent   = signal<string>('');
  chatInput = '';

  // ── Inline VertexAI search ───────────────────────────────────────────────
  readonly vertexMessages = signal<{ role: 'user' | 'assistant'; content: string }[]>([]);
  readonly vertexLoading  = signal(false);
  vertexInput = '';

  // ── Load timesheet state ────────────────────────────────────────────────
  readonly timesheetIdControl = new FormControl<number | null>(null);
  readonly calcRows           = signal<TimesheetCalcRow[] | null>(null);
  readonly selectedCrewName   = signal<string | null>(null);
  readonly lastWorkTime       = signal<string | null>(null);
  readonly loadingTs          = signal(false);
  readonly loadError          = signal<string | null>(null);

  // ── Job labels and times (set when crew member is selected) ────────────────
  readonly jobLabels     = signal<string[]>([]);
  readonly jobStartTimes = signal<string[]>([]);
  readonly jobEndTimes   = signal<string[]>([]);

  // ── Unique crew from SP rows ─────────────────────────────────────────────
  readonly uniqueCrew = computed(() => {
    const rows = this.calcRows();
    if (!rows) return [];
    const seen = new Set<string>();
    const result: { name: string; cls: string }[] = [];
    for (const row of rows) {
      if (!seen.has(row.crewMember)) {
        seen.add(row.crewMember);
        result.push({ name: row.crewMember, cls: row.class });
      }
    }
    return result;
  });

  readonly gapHours = computed(() => {
    const lwt = this.lastWorkTime();
    const rows = this.calcRows();
    if (!lwt || !rows?.[0]) return null;
    const gap = (new Date(rows[0].timeSheetDate).getTime() - new Date(lwt).getTime()) / 3600000;
    return Math.round(gap * 10) / 10;
  });

  readonly hasSegments = computed(() =>
    this.result()?.jobs.some(j => j.segments.length > 0) ?? false
  );

  readonly tsDateDisplay = computed(() => {
    const firstRow = this.calcRows()?.[0];
    if (!firstRow) return '';
    return new Date(firstRow.timeSheetDate).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  });

  // ── Static data ─────────────────────────────────────────────────────────
  readonly employeeClasses = EMPLOYEE_CLASSES;
  readonly hours   = Array.from({ length: 12 }, (_, i) => String(i + 1));
  readonly minutes = ['00', '30'];

  readonly payTypeEntries = Object.entries(PAY_TYPE_LABELS).map(([key, label]) => ({
    key: Number(key) as PayType,
    label
  }));

  form!: FormGroup;

  get jobsArray(): FormArray {
    return this.form.get('jobs') as FormArray;
  }

  ngOnInit(): void {
    this.loadRules();
    this.form = this.fb.group({
      employeeId:            ['', [Validators.required, Validators.email]],
      employeeState:         ['CA', Validators.required],
      employeeClass:         ['', Validators.required],
      isFirstTimesheetOfDay: [true],
      priorDate:             [null],
      priorHour:             ['4'],
      priorMinute:           ['00'],
      priorAmPm:             ['PM'],
      bonus220kv:            [false],
      bonus75Foot:           [false],
      bonusAerialBasket:     [false],
      jobs: this.fb.array([this.createJobGroup()])
    });
  }

  createJobGroup(): FormGroup {
    return this.fb.group({
      beginDate:   [null, Validators.required],
      beginHour:   ['6'],
      beginMinute: ['00'],
      beginAmPm:   ['AM'],
      endDate:     [null, Validators.required],
      endHour:     ['2'],
      endMinute:   ['00'],
      endAmPm:     ['PM'],
      lunchSkipped:[false],
      payType:     [1 as PayType, Validators.required]
    });
  }

  getJobGroup(index: number): FormGroup {
    return this.jobsArray.at(index) as FormGroup;
  }

  addJob(): void { this.jobsArray.push(this.createJobGroup()); }

  removeJob(index: number): void { this.jobsArray.removeAt(index); }

  // ── Load timesheet ──────────────────────────────────────────────────────

  loadTimesheet(): void {
    const id = this.timesheetIdControl.value;
    if (!id) return;

    this.loadingTs.set(true);
    this.loadError.set(null);
    this.calcRows.set(null);
    this.selectedCrewName.set(null);
    this.lastWorkTime.set(null);
    this.result.set(null);
    this.chatMessages.set([]);

    this.timesheetService.getTimesheetCalc(id).subscribe({
      next: (rows) => {
        this.calcRows.set(rows);
        this.loadingTs.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'Failed to load timesheet.');
        this.loadingTs.set(false);
      }
    });
  }

  selectCrewMember(crewName: string): void {
    const rows = this.calcRows();
    if (!rows) return;

    const crewRows = rows.filter(r => r.crewMember === crewName);
    if (!crewRows.length) return;

    const rawClass    = crewRows[0].class;
    const mappedClass = CLASS_MAP[rawClass] ?? rawClass;

    // Build result directly from SP data — no form manipulation needed
    const result: TimesheetCalculationResult = {
      timesheetId:            String(crewRows[0].timeSheetID),
      standardHours:          crewRows.reduce((s, r) => s + r.standardTime, 0),
      premiumHours:           crewRows.reduce((s, r) => s + r.premiumTime,  0),
      doubleTimeHours:        0,
      unpaidLunchHours:       0,
      billedHours:            crewRows.reduce((s, r) => s + r.standardTime + r.premiumTime, 0),
      missedMeals:            crewRows.reduce((s, r) => s + r.meals, 0),
      missedMealDollars:      0,
      subsistence:            crewRows.some(r => r.subsistence > 0) ? 1 : 0,
      subsistenceDollars:     0,
      bonus220kvHours:        0,
      bonus220kvDollars:      0,
      bonus75FootHours:       0,
      bonus75FootDollars:     0,
      bonusAerialBasketHours: 0,
      bonusAerialBasketDollars: 0,
      gapTier:                'FRESH_START',
      jobs: crewRows.map(row => ({
        jobId:           String(row.jobID),
        beginTime:       row.startTime,
        endTime:         row.endTime,
        standardHours:   row.standardTime,
        premiumHours:    row.premiumTime,
        doubleTimeHours: 0,
        unpaidLunchHours: 0,
        missedMeals:     row.meals,
        segments:        []
      }))
    };

    this.form.patchValue({ employeeClass: mappedClass });
    const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    this.jobLabels.set(crewRows.map(r => `PM# ${r.pMNumber}`));
    this.jobStartTimes.set(crewRows.map(r => fmt(r.startTime)));
    this.jobEndTimes.set(crewRows.map(r => fmt(r.endTime)));
    this.lastWorkTime.set(crewRows[0].lastWorkTime ?? null);
    this.selectedCrewName.set(crewName);
    this.result.set(result);
    this.chatMessages.set([]);
    this.error.set(null);
  }

  // ── Calculate ───────────────────────────────────────────────────────────

  onCalculate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fill in all required fields: Employee Email, Employee Class, and job Begin/End dates.');
      return;
    }
    this.error.set(null);

    const v = this.form.getRawValue();
    const isFirst: boolean = v.isFirstTimesheetOfDay;

    const request = {
      employeeId:            v.employeeId,
      employeeState:         v.employeeState,
      employeeClass:         v.employeeClass,
      priorTimesheetEndTime: !isFirst && v.priorDate
        ? this.combineDateTime(v.priorDate, v.priorHour, v.priorMinute, v.priorAmPm)
        : null,
      isFirstTimesheetOfDay: isFirst,
      bonus220kv:            v.bonus220kv,
      bonus75Foot:           v.bonus75Foot,
      bonusAerialBasket:     v.bonusAerialBasket,
      jobs: (v.jobs as any[]).map((j, i) => ({
        jobId:        `job-${i + 1}`,
        beginTime:    this.combineDateTime(j.beginDate, j.beginHour, j.beginMinute, j.beginAmPm),
        endTime:      this.combineDateTime(j.endDate, j.endHour, j.endMinute, j.endAmPm),
        lunchSkipped: j.lunchSkipped,
        payType:      j.payType as PayType
      }))
    };

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.timesheetService.calculate(request).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.message ?? 'An error occurred during calculation.');
        this.loading.set(false);
      }
    });
  }

  // ── Inline Gemini chat ──────────────────────────────────────────────────

  onChatSend(): void {
    const question = this.chatInput.trim();
    if (!question || this.chatLoading()) return;

    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.chatInput = '';
    this.chatLoading.set(true);

    const history = this.chatMessages().slice(0, -1)
      .map(m => ({ role: m.role, content: m.content }));

    const isFirstMessage = !history.some(m => m.role === 'assistant');

    this.chatService.ask({
      question,
      context: isFirstMessage ? this.buildContext() : undefined,
      conversationHistory: history.length ? history : undefined
    }).subscribe({
      next: (res) => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: res.answer }]);
        this.chatLoading.set(false);
      },
      error: () => {
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        this.chatLoading.set(false);
      }
    });
  }

  // ── Inline VertexAI search ───────────────────────────────────────────────

  onVertexSend(): void {
    const question = this.vertexInput.trim();
    if (!question || this.vertexLoading()) return;

    this.vertexMessages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.vertexInput = '';
    this.vertexLoading.set(true);

    const rows = this.calcRows() ?? [];
    const timesheetContext = rows.length > 0 ? JSON.stringify(rows, null, 2) : undefined;

    this.chatService.searchVertexAi({ question, timesheetContext }).subscribe({
      next: (res) => {
        this.vertexMessages.update(msgs => [...msgs, { role: 'assistant', content: res.answer }]);
        this.vertexLoading.set(false);
      },
      error: () => {
        this.vertexMessages.update(msgs => [...msgs, { role: 'assistant', content: 'Sorry, I encountered an error contacting VertexAI. Please try again.' }]);
        this.vertexLoading.set(false);
      }
    });
  }

  private loadRules(): void {
    const files = [
      'PAY-RULES-HUMAN.md',
      'RULES.md',
      'CALCULATION_ALGORITHM.md',
      'MISSED-MEALS.md',
      'CONTRACT-PROVISIONS.md',
    ];
    forkJoin(files.map(f => this.http.get(`/assets/rules/${f}`, { responseType: 'text' })))
      .subscribe(contents => {
        this.rulesContent.set(
          contents.map((c, i) => `# ${files[i]}\n\n${c}`).join('\n\n---\n\n')
        );
      });
  }

  private buildContext(): string {
    const rows     = this.calcRows() ?? [];
    const crewName = this.selectedCrewName();
    const result   = this.result();
    const firstRow = rows[0];
    const rules    = this.rulesContent() || UNION_PAY_RULES;

    if (!firstRow) return rules;

    const lines: string[] = [
      '=== UNION PAY RULES ===',
      rules,
      '',
      '=== RAW TIMESHEET DATA (JSON — each array element is one JOB within the timesheet, not a separate timesheet) ===',
      JSON.stringify(rows, null, 2),
      '',
      '=== TIMESHEET SUMMARY ===',
      `TimeSheet ID : ${firstRow.timeSheetID}`,
      `Date         : ${firstRow.timeSheetDate}`,
      `Yard         : ${firstRow.yard}`,
      `Trade Union  : ${firstRow.tradeUnion}`,
      `Pay Type     : ${firstRow.payType}`,
      '',
      '=== ALL CREW — PER-JOB BREAKDOWN (each row = one job segment within the timesheet) ==='
    ];

    const uniqueNames = [...new Set(rows.map(r => r.crewMember))];
    for (const name of uniqueNames) {
      const nr = rows.filter(r => r.crewMember === name);
      const lwt = nr[0].lastWorkTime;
      const lwtDate = lwt ? new Date(lwt) : null;
      const tsStart = new Date(nr[0].startTime);
      const gapH = lwtDate ? +((tsStart.getTime() - lwtDate.getTime()) / 3600000).toFixed(2) : null;
      const gapDesc = gapH === null ? 'no prior timesheet'
        : gapH < 4   ? `${gapH}h gap → LINKED to prior (chain back for pre-shift calc)`
        : gapH < 8   ? `${gapH}h gap → PT LOCK (all hours on this timesheet are Premium Time)`
        :              `${gapH}h gap → FRESH START (normal ST/PT rules apply)`;

      lines.push(`\n${name} (${nr[0].class})`);
      lines.push(`  Prior timesheet ended: ${lwt ?? 'N/A'}  |  Gap: ${gapDesc}`);
      for (const row of nr) {
        const paidH = +(row.standardTime + row.premiumTime).toFixed(2);
        const lunchNote = row.lunchTaken ? 'lunch taken (0.5h unpaid, STW extends to 2:30 PM)' : 'no lunch';
        lines.push(`  PM#${row.pMNumber}  Start: ${row.startTime}  End: ${row.endTime}  PayType: ${row.payType}  ${lunchNote}`);
        lines.push(`    Paid hours this job: ${paidH}h  →  ST=${row.standardTime}h  PT=${row.premiumTime}h  Missed Meals=${row.meals}  Subsistence=${row.subsistence}`);
      }
      const totST = nr.reduce((s, r) => s + r.standardTime, 0);
      const totPT = nr.reduce((s, r) => s + r.premiumTime, 0);
      const totMeals = nr.reduce((s, r) => s + r.meals, 0);
      lines.push(`  TOTALS: ST=${totST}h  PT=${totPT}h  Missed Meals=${totMeals}`);
    }

    if (crewName && result) {
      lines.push('', `=== SELECTED CREW MEMBER: ${crewName} ===`);
      lines.push(`Total ST: ${result.standardHours}h`);
      lines.push(`Total PT: ${result.premiumHours}h`);
      lines.push(`Missed Meals: ${result.missedMeals}`);
      lines.push(`Subsistence: ${result.subsistence > 0 ? 'Yes' : 'No'}`);
      const lwt = this.lastWorkTime();
      const gap = this.gapHours();
      if (lwt) lines.push(`Last Work Time: ${lwt} (${gap}h gap before this timesheet)`);
    }

    return lines.join('\n');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private parseDateTime(iso: string): { date: Date; hour: string; minute: string; ampm: string } {
    const d = new Date(iso);
    let h    = d.getHours();
    const m  = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12)  h -= 12;
    if (h === 0) h  = 12;
    const minute = m >= 15 && m < 45 ? '30' : '00';
    return { date: d, hour: String(h), minute, ampm };
  }

  private combineDateTime(date: Date | null, hour: string, minute: string, amPm: string): string {
    if (!date) return '';
    const d = new Date(date);
    let h = parseInt(hour, 10);
    if (amPm === 'PM' && h !== 12) h += 12;
    if (amPm === 'AM' && h === 12) h = 0;
    d.setHours(h, parseInt(minute, 10), 0, 0);
    return d.toISOString();
  }

  formatTime(isoString: string): string {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return isoString; }
  }

  getSegmentClass(classification: TimeClassification): string {
    const map: Record<TimeClassification, string> = {
      ST: 'segment-st', PT: 'segment-pt', DT: 'segment-dt', UNPAID: 'segment-unpaid'
    };
    return map[classification] ?? '';
  }

  getBadgeClass(classification: TimeClassification): string {
    const map: Record<TimeClassification, string> = {
      ST: 'badge-st', PT: 'badge-pt', DT: 'badge-dt', UNPAID: 'badge-unpaid'
    };
    return map[classification] ?? '';
  }
}
