import { TestBed } from '@angular/core/testing';
import { OfficeLayoutState } from './office-layout-state';

describe('OfficeLayoutState', () => {
  it('defaults detailPanelOpen to false', () => {
    const service = TestBed.inject(OfficeLayoutState);
    expect(service.detailPanelOpen()).toBe(false);
  });

  it('updates detailPanelOpen when setDetailPanelOpen is called', () => {
    const service = TestBed.inject(OfficeLayoutState);
    service.setDetailPanelOpen(true);
    expect(service.detailPanelOpen()).toBe(true);
    service.setDetailPanelOpen(false);
    expect(service.detailPanelOpen()).toBe(false);
  });
});
