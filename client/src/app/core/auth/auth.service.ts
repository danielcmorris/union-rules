import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  idToken: string;
  sid?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser      = signal<GoogleUser | null>(null);
  readonly isAuthenticated  = signal(false);
  readonly sid              = signal<string | null>(null);

  private readonly router = inject(Router);

  // HttpBackend bypasses interceptors — avoids circular dependency
  private readonly http = new HttpClient(inject(HttpBackend));

  constructor() {
    const stored = sessionStorage.getItem('google_user');
    if (stored) {
      const user = JSON.parse(stored) as GoogleUser;
      this.currentUser.set(user);
      this.sid.set(user.sid ?? null);
      this.isAuthenticated.set(true);
    }
  }

  private gsiReady: Promise<void> | null = null;

  private loadGsiScript(): Promise<void> {
    if (this.gsiReady) return this.gsiReady;
    if ((window as any).google?.accounts) {
      this.gsiReady = Promise.resolve();
      return this.gsiReady;
    }
    this.gsiReady = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
    return this.gsiReady;
  }

  initializeGoogleSignIn(): void {
    this.loadGsiScript().then(() => {
      (window as any).google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: { credential: string }) => this.handleCredential(response.credential),
        auto_select: true,
      });
    });
  }

  renderSignInButton(elementId: string): void {
    this.loadGsiScript().then(() => {
      (window as any).google.accounts.id.renderButton(
        document.getElementById(elementId),
        { theme: 'outline', size: 'large', width: 280 }
      );
    });
  }

  private handleCredential(idToken: string): void {
    const payload = this.decodeJwt(idToken);
    const user: GoogleUser = {
      email:   payload['email'],
      name:    payload['name'],
      picture: payload['picture'],
      idToken
    };

    this.exchangeSession(user).subscribe({
      next: (sid) => {
        const fullUser = { ...user, sid };
        sessionStorage.setItem('google_user', JSON.stringify(fullUser));
        this.currentUser.set(fullUser);
        this.sid.set(sid);
        this.isAuthenticated.set(true);
        this.triggerFileSync(idToken);
        this.router.navigate(['/calculator']);
      },
      error: () => {
        // Session exchange failed — proceed without sid (Bearer token may still work)
        sessionStorage.setItem('google_user', JSON.stringify(user));
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        this.triggerFileSync(idToken);
        this.router.navigate(['/calculator']);
      }
    });
  }

  private exchangeSession(user: GoogleUser): Observable<string> {
    const body = {
      email:  user.email,
      token:  user.idToken,
      device: {
        model: null, platform: null, uuid: null,
        version: null, manufacturer: null, isVirtual: null, serial: null
      },
      gps:      { lat: 0, lon: 0 },
      password: ''
    };

    return this.http.post<{ sessionId: string }>(
      `${environment.server}/api/session/?sid=sid`,
      body
    ).pipe(
      map(response => response.sessionId)
    );
  }

  private triggerFileSync(idToken: string): void {
    // Fire-and-forget — warms the server-side Gemini file cache for this session.
    // Uses HttpBackend (bypasses auth interceptor) with manual Bearer header to avoid
    // circular dependency, since the interceptor itself injects AuthService.
    this.http.post(
      `${environment.chatServer}/api/sync`,
      {},
      { headers: { Authorization: `Bearer ${idToken}` } }
    ).subscribe({ error: () => {} });
  }

  signOut(): void {
    sessionStorage.removeItem('google_user');
    this.currentUser.set(null);
    this.sid.set(null);
    this.isAuthenticated.set(false);
    (window as any).google?.accounts.id.disableAutoSelect();
    this.router.navigate(['/login']);
  }

  getIdToken(): string | null {
    return this.currentUser()?.idToken ?? null;
  }

  private decodeJwt(token: string): Record<string, string> {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, string>;
  }
}
