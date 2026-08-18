import { TestBed } from '@angular/core/testing';
import { OfficeNavBar } from './office-nav-bar';

describe('OfficeNavBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeNavBar],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the signed-in user when provided', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jane Doe');
  });

  it('should emit roleChange when a role is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let emitted: string | undefined;
    fixture.componentInstance.roleChange.subscribe((role) => (emitted = role));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const operatorPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Role"] button')).find(
      (el) => el.textContent?.trim() === 'Operator',
    ) as HTMLButtonElement;
    operatorPill.click();

    expect(emitted).toBe('operator');
  });

  it('should emit themeChange when a theme is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let emitted: string | undefined;
    fixture.componentInstance.themeChange.subscribe((theme) => (emitted = theme));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const darkPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Theme"] button')).find(
      (el) => el.textContent?.trim() === 'Dark',
    ) as HTMLButtonElement;
    darkPill.click();

    expect(emitted).toBe('dark');
  });

  it('should emit signOutClick when the sign-out item is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let signOutEmitted = false;
    fixture.componentInstance.signOutClick.subscribe(() => (signOutEmitted = true));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const signOutButton = Array.from(compiled.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === 'Sign out',
    ) as HTMLButtonElement;
    signOutButton.click();

    expect(signOutEmitted).toBe(true);
  });
});
