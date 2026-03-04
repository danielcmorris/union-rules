import {
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { ChatService } from '../../core/services/chat.service';
import { DocsService } from '../../core/services/docs.service';
import { DocFile } from '../../core/models/docs.model';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { PAY_TYPE_LABELS, PayType } from '../../core/models/timesheet.model';

interface EstimateResult {
  stHours: number;
  ptHours: number;
  missedMeals: number;
  logicSteps: string[];
  explanation: string;
}

@Component({
  selector: 'app-estimate',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MarkdownPipe,
  ],
  template: `
    <div class="estimate-page">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Pay Estimate</h1>
          <p class="page-desc">Enter shift parameters to get an AI-powered pay classification estimate.</p>
        </div>
        <span class="ai-badge">
          <mat-icon class="ai-badge-icon">auto_awesome</mat-icon>
          Powered by Gemini
        </span>
      </div>

      <!-- Two-column grid -->
      <div class="content-grid">

        <!-- ── Left: Parameters Form ────────────────────────────── -->
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">tune</mat-icon>
              Shift Parameters
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>

            <!-- Work Type -->
            <div class="field-group">
              <label class="field-label">Work Type</label>
              <mat-form-field appearance="outline" class="full-field">
                <mat-select [(ngModel)]="workType">
                  @for (entry of payTypeEntries; track entry.key) {
                    <mat-option [value]="entry.key">{{ entry.key }} – {{ entry.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Day Type: pill toggle -->
            <div class="field-group">
              <label class="field-label">Day Type</label>
              <div class="pill-toggle">
                <button type="button"
                        class="pill-btn"
                        [class.active]="dayType === 'weekday'"
                        (click)="dayType = 'weekday'">
                  <mat-icon class="pill-icon">calendar_today</mat-icon>
                  Weekday
                </button>
                <button type="button"
                        class="pill-btn"
                        [class.active]="dayType === 'weekend_holiday'"
                        (click)="dayType = 'weekend_holiday'">
                  <mat-icon class="pill-icon">weekend</mat-icon>
                  Weekend / Holiday
                </button>
              </div>
            </div>

            <!-- Time Range -->
            <div class="field-group">
              <label class="field-label">Shift Time</label>
              <div class="time-stack">

                <!-- Start -->
                <div class="time-row-entry">
                  <span class="time-row-tag">Start</span>
                  <div class="time-selects">
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="startHour">
                        @for (h of hours; track h) {
                          <mat-option [value]="h">{{ h }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="startMinute">
                        @for (m of minutes; track m) {
                          <mat-option [value]="m">{{ m }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="startAmPm">
                        <mat-option value="AM">AM</mat-option>
                        <mat-option value="PM">PM</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

                <div class="time-connector">
                  <mat-icon>south</mat-icon>
                </div>

                <!-- End -->
                <div class="time-row-entry">
                  <span class="time-row-tag">End</span>
                  <div class="time-selects">
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="endHour">
                        @for (h of hours; track h) {
                          <mat-option [value]="h">{{ h }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="endMinute">
                        @for (m of minutes; track m) {
                          <mat-option [value]="m">{{ m }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-select [(ngModel)]="endAmPm">
                        <mat-option value="AM">AM</mat-option>
                        <mat-option value="PM">PM</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

              </div>
            </div>

            <!-- Lunch toggle row -->
            <div class="field-group">
              <label class="field-label">Lunch Break</label>
              <button type="button"
                      class="lunch-toggle"
                      [class.lunch-on]="lunchTaken"
                      (click)="lunchTaken = !lunchTaken">
                <div class="lunch-track" [class.track-on]="lunchTaken">
                  <div class="lunch-thumb"></div>
                </div>
                <div class="lunch-text">
                  <span class="lunch-title">{{ lunchTaken ? 'Lunch taken' : 'No lunch break' }}</span>
                  <span class="lunch-hint">30-min unpaid · extends STW by 30 min</span>
                </div>
              </button>
            </div>

            <!-- Error -->
            @if (error()) {
              <div class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ error() }}</span>
              </div>
            }

            <!-- Submit -->
            <button mat-flat-button color="primary" class="estimate-btn"
                    (click)="onEstimate()" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
                Consulting contract rules…
              } @else {
                <ng-container>
                  <mat-icon>auto_awesome</mat-icon>
                  Get Estimate
                </ng-container>
              }
            </button>

          </mat-card-content>
        </mat-card>

        <!-- ── Right: Results ───────────────────────────────────── -->
        <div class="results-col">

          @if (!result() && !loading()) {
            <!-- Empty state -->
            <div class="empty-state">
              <div class="empty-icon-wrap">
                <mat-icon class="empty-icon">calculate</mat-icon>
              </div>
              <p class="empty-title">No estimate yet</p>
              <p class="empty-hint">Fill in the shift parameters and click <strong>Get Estimate</strong> to see ST/PT hours and missed meal calculations.</p>
            </div>
          }

          @if (loading()) {
            <!-- Loading skeleton -->
            <div class="loading-state">
              <mat-spinner diameter="36" color="primary"></mat-spinner>
              <p class="loading-label">Consulting contract rules…</p>
            </div>
          }

          @if (result()) {

            <!-- Results card -->
            <mat-card class="results-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon success-icon">check_circle</mat-icon>
                  Estimated Results
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>

                <!-- Shift summary pill -->
                <div class="shift-pill-row">
                  <span class="shift-pill">
                    <mat-icon class="shift-pill-icon">work_outline</mat-icon>
                    {{ shortWorkType() }}
                  </span>
                  <span class="shift-pill">
                    <mat-icon class="shift-pill-icon">{{ dayType === 'weekday' ? 'calendar_today' : 'weekend' }}</mat-icon>
                    {{ dayType === 'weekday' ? 'Weekday' : 'Weekend/Holiday' }}
                  </span>
                  <span class="shift-pill">
                    <mat-icon class="shift-pill-icon">schedule</mat-icon>
                    {{ startHour }}:{{ startMinute }} {{ startAmPm }} – {{ endHour }}:{{ endMinute }} {{ endAmPm }}
                  </span>
                  <span class="shift-pill" [class.pill-dim]="!lunchTaken">
                    <mat-icon class="shift-pill-icon">lunch_dining</mat-icon>
                    {{ lunchTaken ? 'Lunch' : 'No lunch' }}
                  </span>
                </div>

                <!-- Tiles -->
                <div class="tiles-row">
                  <div class="tile st-tile">
                    <span class="tile-value">{{ result()!.stHours | number:'1.1-2' }}</span>
                    <span class="tile-label">ST Hours</span>
                  </div>
                  <div class="tile pt-tile">
                    <span class="tile-value">{{ result()!.ptHours | number:'1.1-2' }}</span>
                    <span class="tile-label">PT Hours</span>
                  </div>
                  <div class="tile meal-tile">
                    <span class="tile-value">{{ result()!.missedMeals }}</span>
                    <span class="tile-label">Missed Meals</span>
                  </div>
                </div>

              </mat-card-content>
            </mat-card>

            <!-- Logic tree card -->
            @if (result()!.logicSteps.length > 0) {
              <mat-card class="logic-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon class="section-icon logic-icon">account_tree</mat-icon>
                    Decision Logic
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="logic-tree">
                    @for (step of result()!.logicSteps; track $index; let last = $last) {
                      <div class="logic-node">
                        <div class="logic-track">
                          <div class="logic-dot"
                               [class.dot-outcome]="step.includes('→')">
                          </div>
                          @if (!last) {
                            <div class="logic-line"></div>
                          }
                        </div>
                        <div class="logic-content">
                          @if (step.includes('→')) {
                            <span class="logic-rule">{{ step.split('→')[0].trim() }}</span>
                            <span class="logic-arrow-sep">→</span>
                            <span class="logic-outcome" [class.outcome-st]="step.toLowerCase().includes('straight time') || step.toLowerCase().includes(' st')"
                                  [class.outcome-pt]="step.toLowerCase().includes('premium time') || step.toLowerCase().includes(' pt')"
                                  [class.outcome-meal]="step.toLowerCase().includes('missed meal')">
                              {{ step.split('→')[1].trim() }}
                            </span>
                          } @else {
                            <span class="logic-rule">{{ step }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            }

            <!-- Explanation card -->
            <mat-card class="explanation-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon gemini-icon">auto_awesome</mat-icon>
                  Pay Rule Analysis
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="explanation-body markdown-body"
                     [innerHTML]="processDocLinks(result()!.explanation) | markdown"></div>
              </mat-card-content>
            </mat-card>

            <!-- Ask Gemini card -->
            <mat-card class="chat-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="section-icon vertex-icon">forum</mat-icon>
                  Ask about this shift
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>

                @if (vertexMessages().length > 0) {
                  <div class="chat-msgs">
                    @for (msg of vertexMessages(); track $index) {
                      <div class="chat-msg"
                           [class.user-msg]="msg.role === 'user'"
                           [class.asst-msg]="msg.role === 'assistant'">
                        <div class="chat-bubble markdown-body"
                             [innerHTML]="processDocLinks(msg.content) | markdown"></div>
                      </div>
                    }
                    @if (vertexLoading()) {
                      <div class="chat-msg asst-msg">
                        <div class="chat-bubble typing-bubble">
                          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        </div>
                      </div>
                    }
                  </div>
                }

                <div class="chat-input-row">
                  <mat-form-field appearance="outline" class="chat-field">
                    <mat-label>Ask a follow-up question…</mat-label>
                    <input matInput [(ngModel)]="vertexInput"
                           (keydown.enter)="onVertexSend()"
                           [disabled]="vertexLoading()"
                           autocomplete="off"/>
                  </mat-form-field>
                  <button mat-flat-button color="primary" class="send-btn"
                          (click)="onVertexSend()"
                          [disabled]="vertexLoading() || !vertexInput.trim()">
                    <mat-icon>send</mat-icon>
                  </button>
                </div>

              </mat-card-content>
            </mat-card>

          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Page ─────────────────────────────────────── */

    .estimate-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 3rem;
    }

    /* ── Header ───────────────────────────────────── */

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .page-title {
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.2rem;
    }

    .page-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

    .ai-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.74rem;
      font-weight: 600;
      color: #6654a0;
      background: #f0ecf9;
      border: 1px solid #d8d0ef;
      border-radius: 999px;
      padding: 0.3rem 0.85rem;
      white-space: nowrap;
      flex-shrink: 0;
      align-self: center;
    }

    .ai-badge-icon {
      font-size: 0.9rem !important;
      width: 0.9rem !important;
      height: 0.9rem !important;
    }

    /* ── Two-column grid ──────────────────────────── */

    .content-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.25rem;
      align-items: start;
    }

    @media (max-width: 860px) {
      .content-grid { grid-template-columns: 1fr; }
    }

    /* ── Card base ────────────────────────────────── */

    .form-card,
    .results-card,
    .logic-card,
    .explanation-card,
    .chat-card {
      background: var(--surface);
      box-shadow: var(--shadow-sm) !important;
      border-radius: var(--radius) !important;
      border: 1px solid var(--border);
    }

    mat-card-header { padding-bottom: 0.25rem; }

    mat-card-title {
      display: flex !important;
      align-items: center !important;
      gap: 0.45rem !important;
      font-size: 0.92rem !important;
      font-weight: 600 !important;
      color: var(--text) !important;
    }

    .section-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--primary);
    }

    .success-icon { color: #3a7a48 !important; }
    .gemini-icon  { color: #6a4cc7 !important; }
    .vertex-icon  { color: #1a73e8 !important; }

    /* ── Form field groups ────────────────────────── */

    .field-group { margin-bottom: 1rem; }

    .field-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.055em;
      margin-bottom: 0.35rem;
    }

    .full-field { width: 100%; }
    mat-form-field { width: 100%; }


    /* ── Pill toggle (Day Type) ───────────────────── */

    .pill-toggle {
      display: flex;
      gap: 0.5rem;
    }

    .pill-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.55rem 0.75rem;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }

    .pill-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
      background: var(--primary-light);
    }

    .pill-btn.active {
      border-color: var(--primary);
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }

    .pill-icon {
      font-size: 0.95rem !important;
      width: 0.95rem !important;
      height: 0.95rem !important;
    }

    /* ── Time stack ───────────────────────────────── */

    .time-stack { display: flex; flex-direction: column; gap: 0; }

    .time-row-entry {
      display: grid;
      grid-template-columns: 42px 1fr;
      align-items: center;
      gap: 0.5rem;
    }

    .time-row-tag {
      font-size: 0.67rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: right;
      padding-bottom: 1.15em; /* vertically aligns with mat-form-field */
    }

    .time-selects {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.35rem;
    }

    .time-connector {
      display: flex;
      align-items: center;
      padding-left: calc(42px + 0.5rem);
      color: var(--text-muted);
      height: 14px;
    }

    .time-connector mat-icon {
      font-size: 0.8rem !important;
      width: 0.8rem !important;
      height: 0.8rem !important;
    }

    /* ── Lunch toggle ─────────────────────────────── */

    .lunch-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.7rem 0.85rem;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
    }

    .lunch-toggle.lunch-on {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .lunch-track {
      position: relative;
      width: 34px;
      height: 20px;
      background: #c8cdd6;
      border-radius: 10px;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .lunch-track.track-on { background: var(--primary); }

    .lunch-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.22);
      transition: transform 0.2s;
    }

    .lunch-track.track-on .lunch-thumb { transform: translateX(14px); }

    .lunch-text { display: flex; flex-direction: column; line-height: 1.3; }

    .lunch-title {
      font-size: 0.87rem;
      font-weight: 600;
      color: var(--text);
    }

    .lunch-hint {
      font-size: 0.73rem;
      color: var(--text-muted);
      margin-top: 0.1rem;
    }

    /* ── Error ────────────────────────────────────── */

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fdf0ee;
      border: 1px solid #e8c4be;
      color: #a0392e;
      border-radius: 6px;
      padding: 0.55rem 0.9rem;
      font-size: 0.83rem;
      margin-bottom: 0.75rem;
    }

    /* ── Submit button ────────────────────────────── */

    .estimate-btn {
      width: 100%;
      height: 44px;
      font-size: 0.92rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 0.25rem;
    }

    .btn-spinner { display: inline-block; }

    /* ── Results column ───────────────────────────── */

    .results-col {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    /* ── Empty state ──────────────────────────────── */

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3.5rem 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-muted);
    }

    .empty-icon-wrap {
      width: 56px;
      height: 56px;
      background: var(--primary-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .empty-icon {
      font-size: 1.6rem !important;
      width: 1.6rem !important;
      height: 1.6rem !important;
      color: var(--primary);
    }

    .empty-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 0.4rem;
    }

    .empty-hint {
      font-size: 0.82rem;
      color: var(--text-muted);
      max-width: 300px;
      line-height: 1.55;
      margin: 0;
    }

    /* ── Loading state ────────────────────────────── */

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      gap: 1rem;
    }

    .loading-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* ── Results card ─────────────────────────────── */

    .results-card mat-card-content { padding-top: 0.25rem; }

    /* Shift summary pills */
    .shift-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .shift-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: #f2f4f8;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.18rem 0.6rem;
    }

    .shift-pill.pill-dim { opacity: 0.55; }

    .shift-pill-icon {
      font-size: 0.75rem !important;
      width: 0.75rem !important;
      height: 0.75rem !important;
    }

    /* Tiles */
    .tiles-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
    }

    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.5rem 0.9rem;
      border-radius: 10px;
      text-align: center;
    }

    .tile-value {
      font-size: 1.65rem;
      font-weight: 700;
      line-height: 1;
    }

    .tile-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-top: 0.3rem;
    }

    .st-tile   { background: #eef5ef; color: #2d6b3f; }
    .pt-tile   { background: #fdf5e8; color: #7a5220; }
    .meal-tile { background: #f3f0fa; color: #4e3d87; }

    /* ── Logic tree ───────────────────────────────── */

    .logic-icon { color: #2d6b8a !important; }

    .logic-tree {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .logic-node {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-height: 36px;
    }

    .logic-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 16px;
      padding-top: 4px;
    }

    .logic-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #b0bcc8;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1.5px #b0bcc8;
      flex-shrink: 0;
      transition: background 0.15s;
    }

    .logic-dot.dot-outcome { background: var(--primary); box-shadow: 0 0 0 1.5px var(--primary); }

    .logic-line {
      width: 2px;
      flex: 1;
      min-height: 18px;
      background: #e0e5ec;
      margin-top: 2px;
    }

    .logic-content {
      flex: 1;
      padding-bottom: 0.85rem;
      font-size: 0.83rem;
      line-height: 1.45;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.3rem;
    }

    .logic-rule {
      color: var(--text-secondary);
    }

    .logic-arrow-sep {
      color: var(--text-muted);
      font-size: 0.78rem;
      flex-shrink: 0;
    }

    .logic-outcome {
      font-weight: 600;
      color: var(--text);
    }

    .outcome-st   { color: #2d6b3f; }
    .outcome-pt   { color: #7a5220; }
    .outcome-meal { color: #4e3d87; }

    /* ── Explanation card ─────────────────────────── */

    .explanation-body {
      font-size: 0.875rem;
      line-height: 1.7;
      color: var(--text);
    }

    .explanation-body.markdown-body p            { margin: 0 0 0.65em; }
    .explanation-body.markdown-body p:last-child { margin-bottom: 0; }
    .explanation-body.markdown-body ul,
    .explanation-body.markdown-body ol          { margin: 0.3em 0 0.55em 1.25em; padding: 0; }
    .explanation-body.markdown-body li          { margin-bottom: 0.28em; }
    .explanation-body.markdown-body strong      { font-weight: 700; }
    .explanation-body.markdown-body em          { font-style: italic; }

    /* ── Chat card ────────────────────────────────── */

    .chat-card mat-card-content { padding-top: 0.25rem; }

    .chat-msgs {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 320px;
      overflow-y: auto;
      padding: 0.1rem 0 0.75rem;
    }

    .chat-msg { display: flex; }
    .user-msg { justify-content: flex-end; }
    .asst-msg { justify-content: flex-start; }

    .chat-bubble {
      max-width: 85%;
      padding: 0.55rem 0.85rem;
      border-radius: 14px;
      font-size: 0.85rem;
      line-height: 1.55;
      word-break: break-word;
    }

    .chat-bubble.markdown-body p            { margin: 0 0 0.45em; }
    .chat-bubble.markdown-body p:last-child { margin-bottom: 0; }
    .chat-bubble.markdown-body ul,
    .chat-bubble.markdown-body ol          { margin: 0.25em 0 0.45em 1.2em; padding: 0; }
    .chat-bubble.markdown-body li          { margin-bottom: 0.18em; }
    .chat-bubble.markdown-body strong      { font-weight: 700; }
    .chat-bubble.markdown-body code {
      font-family: monospace;
      font-size: 0.82em;
      background: rgba(0,0,0,0.07);
      border-radius: 3px;
      padding: 0.1em 0.3em;
    }

    .user-msg .chat-bubble {
      background: #3a6dc7;
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .asst-msg .chat-bubble {
      background: #f2f4f7;
      color: var(--text);
      border-bottom-left-radius: 4px;
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

    .chat-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.2rem;
    }

    .chat-field { flex: 1; margin-bottom: -1.25em; }

    .send-btn {
      height: 44px; width: 44px; min-width: 44px;
      border-radius: 50% !important;
      flex-shrink: 0;
      padding: 0 !important;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Responsive ───────────────────────────────── */

    @media (max-width: 600px) {
      .estimate-page  { padding: 1rem 0.75rem 2rem; }
      .page-title     { font-size: 1.25rem; }
      .page-header    { margin-bottom: 1.25rem; flex-wrap: wrap; }
      .tiles-row      { grid-template-columns: 1fr 1fr 1fr; }
      .shift-pill-row { gap: 0.3rem; }
    }
  `]
})
export class EstimateComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly docsService = inject(DocsService);
  private readonly route = inject(ActivatedRoute);

  private readonly docFiles = signal<DocFile[]>([]);

  private static readonly DOC_REGEX = /\[([A-Za-z0-9][A-Za-z0-9 _\-\.]{1,79})\](?!\()/g;

  ngOnInit() {
    this.docsService.listFiles().subscribe({
      next: files => this.docFiles.set(files),
      error: () => {}
    });

    // Pre-fill from localStorage timesheet data
    const tsId = this.route.snapshot.paramMap.get('id');
    if (tsId) {
      const raw = localStorage.getItem(`timesheet_${tsId}`);
      if (raw) {
        try {
          const rows = JSON.parse(raw) as any[];
          const first = rows[0];
          const last = rows[rows.length - 1];

          const start = new Date(first.startTime);
          const end = new Date(last.endTime);

          let sh = start.getHours();
          const sm = start.getMinutes();
          const sAmPm = sh >= 12 ? 'PM' : 'AM';
          if (sh > 12) sh -= 12;
          if (sh === 0) sh = 12;

          let eh = end.getHours();
          const em = end.getMinutes();
          const eAmPm = eh >= 12 ? 'PM' : 'AM';
          if (eh > 12) eh -= 12;
          if (eh === 0) eh = 12;

          this.startHour = String(sh);
          this.startMinute = sm >= 15 && sm < 45 ? '30' : '00';
          this.startAmPm = sAmPm;
          this.endHour = String(eh);
          this.endMinute = em >= 15 && em < 45 ? '30' : '00';
          this.endAmPm = eAmPm;

          // PayTypeCode → numeric work type
          const ptc = Number(first.payTypeCode ?? first.PayTypeCode);
          if (ptc >= 1 && ptc <= 7) this.workType = ptc as PayType;

          // Derive weekday/weekend from start date
          const dow = start.getDay();
          this.dayType = (dow === 0 || dow === 6) ? 'weekend_holiday' : 'weekday';

          // lunchTaken: 0 = false, >0 = true
          this.lunchTaken = rows.some((r: any) => r.lunchTaken > 0);

          // Auto-run the estimate
          setTimeout(() => this.onEstimate(), 0);
        } catch { /* ignore parse errors */ }
      }
    }
  }

  processDocLinks(text: string): string {
    return text.replace(new RegExp(EstimateComponent.DOC_REGEX.source, 'g'), (_, name) => {
      const url = this.resolveDocUrl(name);
      return `<a href="${url}" target="_blank" rel="noopener" class="doc-link">${name}</a>`;
    });
  }

  private resolveDocUrl(bracketName: string): string {
    const normalized = bracketName.replace(/\.[^.]+$/, '').toUpperCase().replace(/\s+/g, '-');
    const match = this.docFiles().find(f => {
      const base = f.name.replace(/\.[^.]+$/, '').toUpperCase().replace(/\s+/g, '-');
      return base === normalized;
    });
    const filename = match?.name ?? bracketName;
    return `/api/docs/file?name=${encodeURIComponent(filename)}`;
  }

  // ── Form state ────────────────────────────────────────────────────────────
  workType: PayType = 1;
  startHour   = '6';
  startMinute = '00';
  startAmPm   = 'AM';
  endHour     = '2';
  endMinute   = '00';
  endAmPm     = 'PM';
  dayType: 'weekday' | 'weekend_holiday' = 'weekday';
  lunchTaken  = false;

  // ── Result state ──────────────────────────────────────────────────────────
  readonly result  = signal<EstimateResult | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  // ── Inline Gemini chat ──────────────────────────────────────────────────
  readonly vertexMessages = signal<{ role: 'user' | 'assistant'; content: string }[]>([]);
  readonly vertexLoading  = signal(false);
  vertexInput = '';

  // ── Static data ───────────────────────────────────────────────────────────
  readonly hours   = Array.from({ length: 12 }, (_, i) => String(i + 1));
  readonly minutes = ['00', '30'];
  readonly payTypeEntries = Object.entries(PAY_TYPE_LABELS).map(([key, label]) => ({
    key: Number(key) as PayType,
    label
  }));

  // ── Estimate ──────────────────────────────────────────────────────────────

  onEstimate(): void {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.vertexMessages.set([]);

    const startFmt = `${this.startHour}:${this.startMinute} ${this.startAmPm}`;
    const endFmt   = `${this.endHour}:${this.endMinute} ${this.endAmPm}`;
    const dayLabel = this.dayType === 'weekday' ? 'Weekday' : 'Weekend or Holiday';

    const timesheetContext = JSON.stringify({
      workType:   `${this.workType} - ${PAY_TYPE_LABELS[this.workType]}`,
      startTime:  startFmt,
      endTime:    endFmt,
      dayType:    dayLabel,
      lunchTaken: this.lunchTaken
    }, null, 2);

    const question =
      `Using the union contract pay rules, calculate the ST (straight time) hours, PT (premium time) hours, ` +
      `and missed meals for the shift parameters provided. ` +
      `Respond in this exact format:\n\n` +
      `ST_HOURS: [number]\n` +
      `PT_HOURS: [number]\n` +
      `MISSED_MEALS: [number]\n\n` +
      `Then list each decision step of the calculation as numbered logic steps, one per line, in this format:\n` +
      `LOGIC_STEP_1: [decision or rule applied] → [result]\n` +
      `LOGIC_STEP_2: [decision or rule applied] → [result]\n` +
      `...continue for all steps...\n\n` +
      `Then on a new line starting with EXPLANATION:, provide a concise plain-English summary ` +
      `of the ST/PT split and any missed meals.` +
      `with any mention of a document reference linked to the rule, include a hyperlink to the document instead of just the name in brackets. ` +
      `Always make sure when describing a time range to keep the earlier time on the left and later time on the right, regardless of how the times were input. `;
      

    // Build a concise semantic query so Discovery Engine retrieves the right rule excerpts.
    // The full structured `question` (with format instructions) is only used by Gemini.
    const workTypeLabel = PAY_TYPE_LABELS[this.workType];
    const dayLabel2 = this.dayType === 'weekday' ? 'weekday' : 'weekend holiday';
    const searchQuery = `standard time premium time classification rules for ${workTypeLabel} shift on ${dayLabel2}, ` +
      `missed meal rules, standard time window`;

    this.chatService.searchVertexAi({ question, searchQuery, timesheetContext }).subscribe({
      next: (res) => {
        this.result.set(this.parseResponse(res.answer));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to get estimate from Gemini. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // ── Inline Gemini chat ──────────────────────────────────────────────────

  onVertexSend(): void {
    const question = this.vertexInput.trim();
    if (!question || this.vertexLoading()) return;

    this.vertexMessages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.vertexInput = '';
    this.vertexLoading.set(true);

    const history = this.vertexMessages()
      .slice(0, -1)
      .map(m => ({ role: m.role, content: m.content }));

    const startFmt = `${this.startHour}:${this.startMinute} ${this.startAmPm}`;
    const endFmt   = `${this.endHour}:${this.endMinute} ${this.endAmPm}`;
    const timesheetContext = JSON.stringify({
      workType:        `${this.workType} - ${PAY_TYPE_LABELS[this.workType]}`,
      startTime:       startFmt,
      endTime:         endFmt,
      dayType:         this.dayType === 'weekday' ? 'Weekday' : 'Weekend or Holiday',
      lunchTaken:      this.lunchTaken,
      estimatedResult: this.result()
    }, null, 2);

    this.chatService.searchVertexAi({
      question,
      timesheetContext,
      conversationHistory: history.length ? history : undefined
    }).subscribe({
      next: (res) => {
        this.vertexMessages.update(msgs => [...msgs, { role: 'assistant', content: res.answer }]);
        this.vertexLoading.set(false);
      },
      error: () => {
        this.vertexMessages.update(msgs => [...msgs, {
          role: 'assistant',
          content: 'Sorry, I encountered an error contacting Gemini. Please try again.'
        }]);
        this.vertexLoading.set(false);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  shortWorkType(): string {
    const label = PAY_TYPE_LABELS[this.workType];
    return label.length > 28 ? label.substring(0, 26) + '…' : label;
  }

  private parseResponse(answer: string): EstimateResult {
    const stMatch   = /ST_HOURS:\s*([\d.]+)/i.exec(answer);
    const ptMatch   = /PT_HOURS:\s*([\d.]+)/i.exec(answer);
    const mmMatch   = /MISSED_MEALS:\s*([\d]+)/i.exec(answer);
    const explMatch = /EXPLANATION:\s*([\s\S]+)/i.exec(answer);

    // Extract all LOGIC_STEP_n lines
    const logicSteps: string[] = [];
    const stepRe = /LOGIC_STEP_\d+:\s*(.+)/gi;
    let m: RegExpExecArray | null;
    while ((m = stepRe.exec(answer)) !== null) {
      logicSteps.push(m[1].trim());
    }

    return {
      stHours:     stMatch   ? parseFloat(stMatch[1])   : 0,
      ptHours:     ptMatch   ? parseFloat(ptMatch[1])   : 0,
      missedMeals: mmMatch   ? parseInt(mmMatch[1], 10) : 0,
      logicSteps,
      explanation: explMatch ? explMatch[1].trim()      : answer
    };
  }
}
