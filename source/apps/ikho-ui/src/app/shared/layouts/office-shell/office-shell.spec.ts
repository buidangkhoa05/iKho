import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeShell } from './office-shell';

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
});
