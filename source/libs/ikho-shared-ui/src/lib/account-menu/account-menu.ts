import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export type AccountMenuRole = 'admin' | 'operator';
export type AccountMenuLang = 'en' | 'vi';

const PILL_BASE = 'rounded-md border-none bg-transparent px-3 py-1.5 font-core text-xs font-semibold text-shade-40 cursor-pointer';
const PILL_ACTIVE = 'bg-primary text-on-primary';

@Component({
  selector: 'lib-account-menu',
  exportAs: 'libAccountMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
  template: `
    <ng-content select="[trigger]" />
    @if (open()) {
      <div
        class="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-hairline-light bg-canvas-light p-3 shadow-modal"
        role="menu"
      >
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">Role</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" aria-label="Role">
            <button
              type="button"
              [class]="pillClasses(role() === 'admin')"
              [attr.aria-pressed]="role() === 'admin'"
              (click)="selectRole('admin')"
            >
              {{ roleAdminLabel() }}
            </button>
            <button
              type="button"
              [class]="pillClasses(role() === 'operator')"
              [attr.aria-pressed]="role() === 'operator'"
              (click)="selectRole('operator')"
            >
              {{ roleOperatorLabel() }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">Language</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" aria-label="Language">
            <button type="button" [class]="pillClasses(lang() === 'en')" [attr.aria-pressed]="lang() === 'en'" (click)="selectLang('en')">
              EN
            </button>
            <button type="button" [class]="pillClasses(lang() === 'vi')" [attr.aria-pressed]="lang() === 'vi'" (click)="selectLang('vi')">
              VI
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly role = input.required<AccountMenuRole>();
  readonly roleAdminLabel = input('Admin');
  readonly roleOperatorLabel = input('Operator');
  readonly lang = input.required<AccountMenuLang>();

  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();

  /** Public: consumers toggle this via a `#menu="libAccountMenu"` template reference on their trigger element. */
  readonly open = signal(false);

  toggle(): void {
    this.open.set(!this.open());
  }

  selectRole(role: AccountMenuRole): void {
    this.open.set(false);
    this.roleChange.emit(role);
  }

  selectLang(lang: AccountMenuLang): void {
    this.open.set(false);
    this.langChange.emit(lang);
  }

  protected pillClasses(active: boolean): string {
    return active ? `${PILL_BASE} ${PILL_ACTIVE}` : PILL_BASE;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
