import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeShell } from './office-shell';
import { ViewportService } from '../../../core/layout/viewport.service';
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';

describe('OfficeShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeShell],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('wraps the routed content in a centered column capped at --content-max', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const wrapper = (fixture.nativeElement as HTMLElement).querySelector('main > div');
    expect(wrapper?.className).toContain('max-w-[var(--content-max)]');
    expect(wrapper?.className).toContain('mx-auto');
  });

  it('collapses the sidebar to a rail when a detail panel is open on a wide, non-mobile viewport', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const viewport = TestBed.inject(ViewportService);
    const layoutState = TestBed.inject(OfficeLayoutState);

    viewport.width.set(1440);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-width)]');

    layoutState.setDetailPanelOpen(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-rail-width)]');
  });

  it('does not collapse the sidebar for an open detail panel on a mobile viewport', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const viewport = TestBed.inject(ViewportService);
    const layoutState = TestBed.inject(OfficeLayoutState);

    viewport.width.set(500);
    layoutState.setDetailPanelOpen(true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-width)]');
  });
});
