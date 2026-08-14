import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Product, PRODUCTS } from '../../../core/mock-data/products.data';
import { formatCurrency } from './billing-format.util';

export interface LineItemDraft {
  productCode: string;
  quantity: number;
  unitPrice: number;
}

interface LineItemRow extends LineItemDraft {
  id: number;
}

@Component({
  selector: 'app-line-items-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3">
      @for (row of rows(); track row.id) {
        <div class="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-hairline-light p-2.5">
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().product }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="row.productCode"
              (change)="updateRow(row.id, { productCode: $any($event.target).value })"
            >
              <option value="" disabled>{{ t().selectProduct }}</option>
              @for (p of products; track p.sku) {
                <option [value]="p.sku">{{ p.sku }} — {{ productName(p) }}</option>
              }
            </select>
          </label>
          <lib-text-input
            [label]="t().quantity"
            type="number"
            [value]="quantityValue(row)"
            (valueChange)="onQuantityChange(row.id, $event)"
          />
          <lib-text-input
            [label]="t().unitPrice"
            type="number"
            [value]="unitPriceValue(row)"
            (valueChange)="onUnitPriceChange(row.id, $event)"
          />
          <div class="flex items-center gap-2">
            <span class="font-mono text-[13px] font-semibold text-ink">{{ rowTotal(row) }}</span>
            <lib-button variant="ghost" [disabled]="rows().length === 1" (click)="removeRow(row.id)">{{ t().removeLine }}</lib-button>
          </div>
        </div>
      }
      <lib-button variant="secondary" (click)="addRow()">{{ t().addLine }}</lib-button>
      <div class="flex items-baseline justify-between border-t border-hairline-light pt-3">
        <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
        <span class="font-mono text-body-md font-semibold text-ink">{{ totalDisplay() }}</span>
      </div>
    </div>
  `,
})
export class LineItemsBuilder {
  protected readonly lang = inject(LangService);
  protected readonly products = PRODUCTS;

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      product: en ? 'Product' : 'Sản phẩm',
      selectProduct: en ? 'Select a product' : 'Chọn sản phẩm',
      quantity: en ? 'Quantity' : 'Số lượng',
      unitPrice: en ? 'Unit price' : 'Đơn giá',
      removeLine: en ? 'Remove' : 'Xoá',
      addLine: en ? '+ Add line' : '+ Thêm dòng',
      total: en ? 'Total' : 'Tổng cộng',
    };
  });

  private nextId = 1;
  protected readonly rows = signal<LineItemRow[]>([this.blankRow()]);

  protected readonly total = computed(() => this.rows().reduce((sum, r) => sum + r.quantity * r.unitPrice, 0));
  protected readonly totalDisplay = computed(() => formatCurrency(this.total()));

  /** Live-computed, read-only per-row total shown next to each line's remove button. */
  protected rowTotal(row: LineItemRow): string {
    return formatCurrency(row.quantity * row.unitPrice);
  }

  private blankRow(): LineItemRow {
    return { id: this.nextId++, productCode: '', quantity: 1, unitPrice: 0 };
  }

  protected productName(p: Product): string {
    return this.lang.pick(p.name);
  }

  protected addRow(): void {
    this.rows.update((list) => [...list, this.blankRow()]);
  }

  protected removeRow(id: number): void {
    this.rows.update((list) => (list.length > 1 ? list.filter((r) => r.id !== id) : list));
  }

  protected updateRow(id: number, patch: Partial<LineItemDraft>): void {
    this.rows.update((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  protected quantityValue(row: LineItemRow): string {
    return String(row.quantity);
  }

  protected onQuantityChange(id: number, value: string): void {
    this.updateRow(id, { quantity: Number(value) || 0 });
  }

  protected unitPriceValue(row: LineItemRow): string {
    return String(row.unitPrice);
  }

  protected onUnitPriceChange(id: number, value: string): void {
    this.updateRow(id, { unitPrice: Number(value) || 0 });
  }

  /** Reads the current lines as plain drafts — called by the parent on submit. */
  getLines(): LineItemDraft[] {
    return this.rows().map(({ productCode, quantity, unitPrice }) => ({ productCode, quantity, unitPrice }));
  }

  /** Restores a single blank line — called by the parent after a successful save or on cancel. */
  reset(): void {
    this.nextId = 1;
    this.rows.set([this.blankRow()]);
  }
}
