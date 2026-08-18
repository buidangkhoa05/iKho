import { TestBed } from '@angular/core/testing';
import { OperatorNavBar } from './operator-nav-bar';

describe('OperatorNavBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorNavBar],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'Receive PO-1042');
    fixture.componentRef.setInput('role', 'operator');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the current task', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'Receive PO-1042');
    fixture.componentRef.setInput('role', 'operator');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Receive PO-1042');
  });

  it('should emit langChange when a language is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'My tasks');
    fixture.componentRef.setInput('role', 'operator');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let emitted: string | undefined;
    fixture.componentInstance.langChange.subscribe((lang) => (emitted = lang));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const viPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Language"] button')).find(
      (el) => el.textContent?.trim() === 'VI',
    ) as HTMLButtonElement;
    viPill.click();

    expect(emitted).toBe('vi');
  });
});
