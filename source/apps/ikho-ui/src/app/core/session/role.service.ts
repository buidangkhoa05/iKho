import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppRole = 'admin' | 'operator';

const STORAGE_KEY = 'ikho.role';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly role = signal<AppRole>(this.readInitial());

  setRole(role: AppRole): void {
    this.role.set(role);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, role);
    }
  }

  private readInitial(): AppRole {
    if (!this.isBrowser) {
      return 'admin';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'operator' ? 'operator' : 'admin';
  }
}
