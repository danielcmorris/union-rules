import {
  Component,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/auth/auth.service';
import { ChatMessage } from '../../core/models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  template: `
    <div class="chat-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <a mat-icon-button routerLink="/calculator" matTooltip="Back to Calculator" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div>
            <h1 class="page-title">Ask Gemini</h1>
            <p class="page-desc">Union pay rules explained</p>
          </div>
        </div>
        <div class="gemini-badge">
          <mat-icon class="gemini-icon">auto_awesome</mat-icon>
          Powered by Gemini
        </div>
      </div>

      <!-- Info Banner -->
      <div class="info-banner">
        <mat-icon class="banner-icon">info_outline</mat-icon>
        <span>
          Ask questions about union pay rules. This chat is for explanations only —
          no data is saved or submitted.
        </span>
      </div>

      <!-- Chat Container -->
      <mat-card class="chat-card">

        <!-- Loading Bar -->
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
        }

        <!-- Message History -->
        <div class="message-list" #messageContainer>
          @for (msg of messages(); track msg.timestamp) {
            <div class="message-row" [class.user-row]="msg.role === 'user'" [class.assistant-row]="msg.role === 'assistant'">
              @if (msg.role === 'assistant') {
                <div class="avatar assistant-avatar">
                  <mat-icon>auto_awesome</mat-icon>
                </div>
              }
              <div class="bubble-wrapper" [class.user-wrapper]="msg.role === 'user'">
                <div class="bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
                  {{ msg.content }}
                </div>
                <div class="timestamp" [class.user-timestamp]="msg.role === 'user'">
                  {{ formatTime(msg.timestamp) }}
                </div>
              </div>
              @if (msg.role === 'user') {
                <div class="avatar user-avatar">
                  <mat-icon>person</mat-icon>
                </div>
              }
            </div>
          }

          <!-- Typing Indicator -->
          @if (loading()) {
            <div class="message-row assistant-row">
              <div class="avatar assistant-avatar">
                <mat-icon>auto_awesome</mat-icon>
              </div>
              <div class="bubble assistant-bubble typing-bubble">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <mat-form-field appearance="outline" class="message-field">
            <mat-label>Ask about pay rules...</mat-label>
            <input
              matInput
              [(ngModel)]="currentInput"
              (keydown.enter)="onSend()"
              [disabled]="loading()"
              placeholder="e.g. When does Premium Time apply?"
              autocomplete="off"
            />
          </mat-form-field>
          <button
            mat-flat-button
            color="primary"
            class="send-btn"
            (click)="onSend()"
            [disabled]="loading() || !currentInput.trim()">
            <mat-icon>send</mat-icon>
          </button>
        </div>

      </mat-card>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .chat-page {
      max-width: 820px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── Header ──────────────────────────────────── */

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .header-left { display: flex; align-items: center; gap: 0.65rem; }

    .back-btn { flex-shrink: 0; }

    .page-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.1rem;
    }

    .page-desc { font-size: 0.82rem; color: var(--text-secondary); margin: 0; }

    .gemini-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6654a0;
      background: #f0ecf9;
      border-radius: 999px;
      padding: 0.28rem 0.8rem;
      white-space: nowrap;
    }

    .gemini-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }

    /* ── Info Banner ─────────────────────────────── */

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      background: #eef3fb;
      border: 1px solid #c8d8ef;
      color: #2d4a72;
      border-radius: 8px;
      padding: 0.65rem 0.9rem;
      font-size: 0.83rem;
      line-height: 1.5;
    }

    .banner-icon { font-size: 1rem; width: 1rem; height: 1rem; flex-shrink: 0; margin-top: 0.1rem; }

    /* ── Chat Card ───────────────────────────────── */

    .chat-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-md) !important;
      border-radius: 12px !important;
      padding: 0 !important;
      border: 1px solid var(--border);
    }

    mat-progress-bar { flex-shrink: 0; }

    /* ── Message List ────────────────────────────── */

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 380px;
      max-height: 520px;
      background: var(--surface);
    }

    /* ── Message Rows ────────────────────────────── */

    .message-row {
      display: flex;
      align-items: flex-end;
      gap: 0.55rem;
      animation: fadeIn 0.18s ease-out;
    }

    .user-row { flex-direction: row-reverse; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Avatars ─────────────────────────────────── */

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }

    .assistant-avatar { background: #5c4799; color: white; }
    .user-avatar      { background: #3a6dc7; color: white; }

    /* ── Bubbles ─────────────────────────────────── */

    .bubble-wrapper { display: flex; flex-direction: column; gap: 0.18rem; max-width: 72%; }
    .user-wrapper   { align-items: flex-end; }

    .bubble {
      padding: 0.6rem 0.85rem;
      border-radius: 14px;
      font-size: 0.875rem;
      line-height: 1.58;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .user-bubble {
      background: #3a6dc7;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }

    .assistant-bubble {
      background: #f2f4f7;
      color: var(--text);
      border-bottom-left-radius: 4px;
    }

    .timestamp { font-size: 0.65rem; color: var(--text-muted); padding: 0 0.2rem; }
    .user-timestamp { text-align: right; }

    /* ── Typing Indicator ────────────────────────── */

    .typing-bubble {
      display: flex; align-items: center; gap: 4px; padding: 0.65rem 0.9rem;
    }

    .dot {
      width: 6px; height: 6px;
      background: var(--text-muted);
      border-radius: 50%;
      animation: bounce 1.2s infinite;
    }

    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%           { transform: translateY(-5px); }
    }

    /* ── Input Area ──────────────────────────────── */

    .input-area {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.9rem;
      border-top: 1px solid var(--border);
      background: #fafbfc;
    }

    .message-field { flex: 1; margin-bottom: -1.25em; }

    .send-btn {
      height: 46px;
      width: 46px;
      min-width: 46px;
      border-radius: 50% !important;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 !important;
    }

    /* ── Responsive ──────────────────────────────── */

    @media (max-width: 600px) {
      .chat-page    { padding: 0.75rem 0.75rem 2rem; }
      .bubble-wrapper { max-width: 88%; }
      .message-list   { max-height: 420px; }
      .gemini-badge   { display: none; }
      .page-title     { font-size: 1.2rem; }
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef<HTMLDivElement>;

  private readonly chatService = inject(ChatService);
  readonly authService = inject(AuthService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading  = signal(false);

  currentInput = '';

  private shouldScroll = false;

  ngOnInit(): void {
    this.messages.set([
      {
        role: 'assistant',
        content:
          'Hello! I can answer questions about your union pay rules — Standard Time, ' +
          'Premium Time, missed meals, subsistence, bonuses, and more. What would you like to know?',
        timestamp: new Date()
      }
    ]);
    this.shouldScroll = true;
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onSend(): void {
    const text = this.currentInput.trim();
    if (!text || this.loading()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.currentInput = '';
    this.loading.set(true);
    this.shouldScroll = true;

    const history = this.messages().slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }));

    this.chatService.ask({ question: text, conversationHistory: history }).subscribe({
      next: (res) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: res.answer,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, assistantMessage]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, errorMessage]);
        this.loading.set(false);
        this.shouldScroll = true;
      }
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }
}
