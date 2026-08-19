import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Clerk } from '@clerk/clerk-js';
import { environment } from '../../../environments/environment';
import { CLERK_FACTORY } from './clerk-factory';

export interface AuthUser {
  name: string;
  email: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly clerkFactory = inject(CLERK_FACTORY);
  private clerk: Clerk | undefined;

  readonly isLoaded = signal(false);
  readonly isSignedIn = signal(false);
  readonly currentUser = signal<AuthUser | undefined>(undefined);

  async initialize(): Promise<void> {
    if (!this.isBrowser) {
      this.isLoaded.set(true);
      return;
    }
    this.clerk = this.clerkFactory(environment.clerkPublishableKey);
    await this.clerk.load();
    this.syncState();
    this.clerk.addListener(() => this.syncState());
    this.isLoaded.set(true);
  }

  async getToken(forceRefresh = false): Promise<string | null> {
    if (!this.clerk?.session) {
      return null;
    }
    return this.clerk.session.getToken(forceRefresh ? { skipCache: true } : undefined);
  }

  async signOut(): Promise<void> {
    await this.clerk?.signOut();
  }

  mountSignIn(el: HTMLElement): void {
    this.clerk?.mountSignIn(el as HTMLDivElement);
  }

  unmountSignIn(el: HTMLElement): void {
    this.clerk?.unmountSignIn(el as HTMLDivElement);
  }

  mountSignUp(el: HTMLElement): void {
    this.clerk?.mountSignUp(el as HTMLDivElement);
  }

  unmountSignUp(el: HTMLElement): void {
    this.clerk?.unmountSignUp(el as HTMLDivElement);
  }

  private syncState(): void {
    const user = this.clerk?.user;
    this.isSignedIn.set(!!user);
    this.currentUser.set(
      user
        ? {
            name: user.fullName ?? '',
            email: user.primaryEmailAddress?.emailAddress ?? '',
            imageUrl: user.imageUrl,
          }
        : undefined,
    );
  }
}
