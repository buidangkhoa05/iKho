import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppLang, Localized } from './localized.type';

const STORAGE_KEY = 'ikho.lang';

@Injectable({ providedIn: 'root' })
export class LangService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly lang = signal<AppLang>(this.readInitial());

  setLang(lang: AppLang): void {
    this.lang.set(lang);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  /** Resolves an {en, vi} pair to the string for the current language. */
  pick<T>(loc: Localized<T>): T {
    return loc[this.lang()];
  }

  private readInitial(): AppLang {
    if (!this.isBrowser) {
      return 'en';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'vi' ? 'vi' : 'en';
  }
}
