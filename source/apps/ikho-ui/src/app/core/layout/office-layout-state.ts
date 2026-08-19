import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfficeLayoutState {
  readonly detailPanelOpen = signal(false);

  setDetailPanelOpen(open: boolean): void {
    this.detailPanelOpen.set(open);
  }
}
