import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export interface OfficeSidebarItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

@Component({
  selector: 'lib-office-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block h-full' },
  template: `
    <nav [class]="navClasses()">
      <ul class="m-0 flex flex-col gap-0.5 p-0">
        @for (item of items(); track item.id) {
          <li class="list-none">
            <button
              type="button"
              [class]="itemClasses(item.id)"
              [title]="collapsed() ? item.label : ''"
              (click)="itemSelect.emit(item.id)"
            >
              <lib-icon [name]="item.icon" [size]="20" />
              @if (!collapsed()) {
                <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ item.label }}</span>
                @if (item.count !== undefined) {
                  <span class="font-core text-micro text-inherit opacity-70">{{ item.count }}</span>
                }
              }
            </button>
          </li>
        }
      </ul>
      <div class="flex-none">
        <ng-content />
      </div>
    </nav>
  `,
})
export class OfficeSidebar {
  readonly items = input.required<OfficeSidebarItem[]>();
  readonly active = input<string | undefined>(undefined);
  readonly collapsed = input(false);

  readonly itemSelect = output<string>();

  private static readonly ITEM_BASE =
    'flex min-h-[var(--tap-target-office)] w-full items-center gap-3 rounded-md border-none px-3 py-2.5 text-left font-core text-sm font-medium [transition:var(--transition-control)]';
  private static readonly ITEM_DEFAULT = 'bg-transparent text-shade-60 hover:bg-shell-canvas hover:text-shell-ink';
  private static readonly ITEM_ACTIVE = 'bg-primary text-on-primary';

  protected readonly navClasses = computed(() =>
    [
      'box-border flex h-full flex-col justify-between overflow-y-auto border-r border-shell-hairline bg-shell-canvas-elevated py-4 px-3 transition-[width] duration-[180ms] ease-standard',
      this.collapsed() ? 'w-[var(--sidebar-rail-width)]' : 'w-[var(--sidebar-width)]',
    ].join(' '),
  );

  protected itemClasses(id: string): string {
    const base = OfficeSidebar.ITEM_BASE;
    return id === this.active() ? `${base} ${OfficeSidebar.ITEM_ACTIVE}` : `${base} ${OfficeSidebar.ITEM_DEFAULT}`;
  }
}
