import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly width = signal(this.isBrowser ? window.innerWidth : 1440);

  /** Office sidebar collapses to an icon rail in this range — matches DESIGN.md's sidebar-office breakpoint. */
  readonly isSidebarRail = computed(() => this.width() >= 768 && this.width() < 1280);
  /** Below this, the Office sidebar becomes a hidden-by-default overlay drawer. */
  readonly isMobile = computed(() => this.width() < 768);

  constructor() {
    if (!this.isBrowser) return;
    const onResize = () => this.width.set(window.innerWidth);
    window.addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
  }
}
