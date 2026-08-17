import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export type AccountMenuRole = 'admin' | 'operator';
export type AccountMenuLang = 'en' | 'vi';

const PILL_BASE = 'rounded-md border-none bg-transparent px-3 py-1.5 font-core text-xs font-semibold text-shade-40 cursor-pointer';
const PILL_ACTIVE = 'bg-primary text-on-primary';

/**
 * Role/language switcher dropdown, opened from a caller-supplied trigger element.
 *
 * The content projected via `[trigger]` is NOT wrapped in a button by this component
 * (deliberately, to avoid nesting a button inside a button). The consumer's own trigger
 * element must therefore be interactive itself: it must call `toggle()` via a
 * `#menu="libAccountMenu"` template reference, and it should bind
 * `[attr.aria-expanded]="menu.open()"` and set `aria-haspopup="menu"` itself.
 *
 * Usage:
 * ```html
 * <lib-account-menu
 *   #menu="libAccountMenu"
 *   [role]="role()"
 *   [lang]="lang()"
 *   (roleChange)="onRoleChange($event)"
 *   (langChange)="onLangChange($event)"
 * >
 *   <button
 *     trigger
 *     type="button"
 *     [attr.aria-expanded]="menu.open()"
 *     aria-haspopup="menu"
 *     (click)="menu.toggle()"
 *   >
 *     Account
 *   </button>
 * </lib-account-menu>
 * ```
 */
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
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">{{ roleSectionLabel() }}</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" [attr.aria-label]="roleSectionLabel()">
            <button
              type="button"
              [class]="pillClasses(role() === 'admin')"
              role="menuitemradio"
              [attr.aria-checked]="role() === 'admin'"
              (click)="selectRole('admin')"
            >
              {{ roleAdminLabel() }}
            </button>
            <button
              type="button"
              [class]="pillClasses(role() === 'operator')"
              role="menuitemradio"
              [attr.aria-checked]="role() === 'operator'"
              (click)="selectRole('operator')"
            >
              {{ roleOperatorLabel() }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">{{ langSectionLabel() }}</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" [attr.aria-label]="langSectionLabel()">
            <button
              type="button"
              [class]="pillClasses(lang() === 'en')"
              role="menuitemradio"
              [attr.aria-checked]="lang() === 'en'"
              (click)="selectLang('en')"
            >
              EN
            </button>
            <button
              type="button"
              [class]="pillClasses(lang() === 'vi')"
              role="menuitemradio"
              [attr.aria-checked]="lang() === 'vi'"
              (click)="selectLang('vi')"
            >
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
  readonly roleSectionLabel = input('Role');
  readonly lang = input.required<AccountMenuLang>();
  readonly langSectionLabel = input('Language');

  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();

  private readonly _open = signal(false);
  /** Public: consumers toggle this via a `#menu="libAccountMenu"` template reference on their trigger element. */
  readonly open = this._open.asReadonly();

  toggle(): void {
    this._open.set(!this.open());
  }

  selectRole(role: AccountMenuRole): void {
    this._open.set(false);
    this.roleChange.emit(role);
  }

  selectLang(lang: AccountMenuLang): void {
    this._open.set(false);
    this.langChange.emit(lang);
  }

  protected pillClasses(active: boolean): string {
    return active ? `${PILL_BASE} ${PILL_ACTIVE}` : PILL_BASE;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this._open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this._open.set(false);
  }
}
