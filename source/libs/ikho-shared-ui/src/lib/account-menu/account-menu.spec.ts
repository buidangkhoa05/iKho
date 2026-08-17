import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountMenu } from './account-menu';

@Component({
  imports: [AccountMenu],
  template: `
    <lib-account-menu
      #menu="libAccountMenu"
      [role]="role"
      [lang]="lang"
      (roleChange)="onRoleChange($event)"
      (langChange)="onLangChange($event)"
    >
      <button trigger type="button" (click)="menu.toggle()" [attr.aria-expanded]="menu.open()" aria-haspopup="menu">open</button>
    </lib-account-menu>
  `,
})
class HostComponent {
  role: 'admin' | 'operator' = 'admin';
  lang: 'en' | 'vi' = 'en';
  lastRole: 'admin' | 'operator' | undefined;
  lastLang: 'en' | 'vi' | undefined;

  onRoleChange(role: 'admin' | 'operator'): void {
    this.lastRole = role;
  }

  onLangChange(lang: 'en' | 'vi'): void {
    this.lastLang = lang;
  }
}

describe('AccountMenu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('lib-account-menu')).toBeTruthy();
  });

  it('should not show the panel until the trigger is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="menu"]')).toBeNull();

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('should emit roleChange and close the panel when a role pill is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const operatorPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Role"] button')).find(
      (el) => el.textContent?.trim() === 'Operator',
    ) as HTMLButtonElement;
    operatorPill.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastRole).toBe('operator');
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });

  it('should emit langChange when a language pill is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const viPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Language"] button')).find(
      (el) => el.textContent?.trim() === 'VI',
    ) as HTMLButtonElement;
    viPill.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastLang).toBe('vi');
  });

  it('should close the panel on an outside click', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeTruthy();

    document.body.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });
});
