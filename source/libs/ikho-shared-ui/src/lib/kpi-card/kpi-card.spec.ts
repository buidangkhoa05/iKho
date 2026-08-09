import { TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCard],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('label', 'On hand');
    fixture.componentRef.setInput('value', 128);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the label and value', () => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('label', 'On hand');
    fixture.componentRef.setInput('value', 128);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('On hand');
    expect(compiled.textContent).toContain('128');
  });
});
