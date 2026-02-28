import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="app-logo">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#4a7fc1"/>
            <path d="M12 32L18 16L24 28L30 20L36 32H12Z" fill="white" opacity="0.85"/>
            <circle cx="24" cy="14" r="4" fill="#a8c8f0"/>
          </svg>
        </div>
        <h1 class="app-title">Union Pay Calculator</h1>
        <p class="app-subtitle">Sign in with your Google Workspace account to continue.</p>
        <div class="divider"></div>
        <div class="signin-container">
          <div id="google-btn"></div>
        </div>
        <p class="footer-note">
          Secure sign-in via Google. Your credentials are never stored on this server.
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100%; }

    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(150deg, #22354f 0%, #2f4d72 60%, #3a5f8a 100%);
      padding: 1rem;
    }

    .login-card {
      background: #ffffff;
      border-radius: 14px;
      padding: 2.75rem 2.25rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0;
    }

    .app-logo { margin-bottom: 1.1rem; }

    .app-title {
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.6rem;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .app-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.6;
      max-width: 280px;
    }

    .divider {
      width: 100%;
      height: 1px;
      background: var(--border);
      margin: 1.5rem 0;
    }

    .signin-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
      min-height: 44px;
    }

    .footer-note {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.55;
      max-width: 260px;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 2rem 1.5rem;
        border-radius: 12px;
      }
      .app-title { font-size: 1.35rem; }
    }
  `]
})
export class LoginComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);

  ngAfterViewInit(): void {
    this.authService.initializeGoogleSignIn();
    this.authService.renderSignInButton('google-btn');
  }
}
