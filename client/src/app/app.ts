import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (authService.isAuthenticated()) {
      <nav class="top-nav">
        <div class="nav-inner">

          <a class="nav-brand" routerLink="/calculator">
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="#4a7fc1"/>
              <path d="M12 32L18 16L24 28L30 20L36 32H12Z" fill="white" opacity="0.85"/>
              <circle cx="24" cy="14" r="4" fill="#a8c8f0"/>
            </svg>
            <span class="brand-text">Union Pay Calculator</span>
          </a>

          <div class="nav-links">
            <a class="nav-link" routerLink="/calculator"
               routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
              Calculator
            </a>
            <a class="nav-link" routerLink="/chat"
               routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
              Ask Gemini
            </a>
          </div>

          <div class="nav-user">
            @if (authService.currentUser()?.picture) {
              <img class="user-avatar"
                   [src]="authService.currentUser()!.picture"
                   [alt]="authService.currentUser()!.name"
                   referrerpolicy="no-referrer"/>
            }
            <span class="user-name">{{ authService.currentUser()?.name }}</span>
            <button class="signout-btn" (click)="authService.signOut()">Sign Out</button>
          </div>

        </div>
      </nav>
    }

    <main class="app-content" [class.with-nav]="authService.isAuthenticated()">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }

    /* ── Nav ────────────────────────────────────────── */

    .top-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--nav-bg);
      box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    }

    .nav-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 0 1.25rem;
      height: 56px;
    }

    /* Brand */
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      flex-shrink: 0;
    }

    .brand-text {
      font-size: 1rem;
      font-weight: 600;
      color: rgba(255,255,255,0.92);
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    @media (max-width: 500px) { .brand-text { display: none; } }

    /* Links */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }

    .nav-link {
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }

    .nav-link:hover {
      color: rgba(255,255,255,0.9);
      background: rgba(255,255,255,0.08);
    }

    .nav-link.active {
      color: #ffffff;
      background: rgba(255,255,255,0.12);
    }

    /* User */
    .nav-user {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-left: auto;
    }

    .user-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.25);
      object-fit: cover;
      flex-shrink: 0;
    }

    .user-name {
      color: rgba(255,255,255,0.75);
      font-size: 0.82rem;
      font-weight: 400;
      white-space: nowrap;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 640px) { .user-name { display: none; } }

    .signout-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.7);
      font-size: 0.76rem;
      font-weight: 500;
      padding: 0.28rem 0.75rem;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .signout-btn:hover {
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.95);
      border-color: rgba(255,255,255,0.4);
    }

    /* Content */
    .app-content { min-height: 100vh; }
    .app-content.with-nav { min-height: calc(100vh - 56px); }
  `]
})
export class App {
  readonly authService = inject(AuthService);
}
