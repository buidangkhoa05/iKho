import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadge, StockStatus } from '../status-badge/status-badge';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  mono?: boolean;
  /** Render this column's value as a StatusBadge instead of plain text (value must be a StockStatus). */
  status?: boolean;
  /** Row field to use as the badge's display label; falls back to the status's default label. */
  statusLabelKey?: string;
}

@Component({
  selector: 'lib-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge],
  host: { class: 'block w-full' },
  template: `
    <div class="w-full overflow-x-auto rounded-md border border-hairline-light bg-canvas-light">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th
                [style.text-align]="col.align ?? 'left'"
                class="sticky top-0 border-b border-hairline-light bg-canvas-light px-4 py-2.5 font-core text-micro tracking-[0.3px] whitespace-nowrap text-shade-50 uppercase"
              >
                {{ col.label }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr
              [class]="rowClasses()"
              [attr.tabindex]="clickable() ? 0 : null"
              [attr.role]="clickable() ? 'button' : null"
              (click)="rowClick.emit(row)"
              (keydown.enter)="clickable() && rowClick.emit(row)"
              (keydown.space)="onSpace($event, row)"
            >
              @for (col of columns(); track col.key) {
                <td
                  [style.text-align]="col.align ?? 'left'"
                  [class.font-mono]="col.mono"
                  class="h-[var(--row-height-office)] border-b border-hairline-light px-4 font-core text-body-md whitespace-nowrap text-text-body group-last:border-b-0 group-hover:bg-surface-elevated-light"
                >
                  @if (col.status) {
                    <lib-status-badge
                      [status]="statusOf(row, col.key)"
                      [label]="col.statusLabelKey ? labelOf(row, col.statusLabelKey) : undefined"
                    />
                  } @else {
                    {{ row[col.key] }}
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td
                [attr.colspan]="columns().length"
                class="h-[var(--row-height-office)] border-b-0 px-4 py-6 text-center font-core text-body-md text-shade-50"
              >
                {{ emptyLabel() }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DataTable {
  readonly columns = input.required<DataTableColumn[]>();
  readonly rows = input.required<Record<string, unknown>[]>();
  readonly emptyLabel = input('No results');
  readonly clickable = input(false);

  readonly rowClick = output<Record<string, unknown>>();

  protected rowClasses(): string {
    return this.clickable() ? 'group cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring' : 'group';
  }

  protected statusOf(row: Record<string, unknown>, key: string): StockStatus {
    return row[key] as StockStatus;
  }

  protected labelOf(row: Record<string, unknown>, key: string): string | undefined {
    return row[key] as string | undefined;
  }

  protected onSpace(event: Event, row: Record<string, unknown>): void {
    if (!this.clickable()) return;
    event.preventDefault();
    this.rowClick.emit(row);
  }
}

export type { StockStatus };
