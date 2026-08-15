import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Brand, Category, Product, UnitOfMeasure } from '../../../core/mock-data/catalogue.data';

export interface ProductDetailsSave {
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
  isLotControlled: boolean;
  isSerialControlled: boolean;
}

@Component({
  selector: 'app-product-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ product().sku }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ product().name }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="lang.pick(strings.close)"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="product().isActive ? 'in-stock' : 'out-of-stock'" [label]="product().isActive ? t().active : t().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          <lib-text-input [label]="t().description" [value]="editDescription()" (valueChange)="editDescription.set($event)" />
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().category }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editCategoryCode()"
              (change)="editCategoryCode.set($any($event.target).value)"
            >
              <option value="" [selected]="!editCategoryCode()">{{ t().none }}</option>
              @for (c of categories(); track c.code) {
                @if (c.isActive || c.code === editCategoryCode()) {
                  <option [value]="c.code" [selected]="c.code === editCategoryCode()">{{ c.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().brand }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editBrandCode()"
              (change)="editBrandCode.set($any($event.target).value)"
            >
              <option value="" [selected]="!editBrandCode()">{{ t().none }}</option>
              @for (b of brands(); track b.code) {
                @if (b.isActive || b.code === editBrandCode()) {
                  <option [value]="b.code" [selected]="b.code === editBrandCode()">{{ b.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().uom }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editUomCode()"
              (change)="editUomCode.set($any($event.target).value)"
            >
              <option value="" [selected]="!editUomCode()">{{ t().none }}</option>
              @for (u of unitsOfMeasure(); track u.code) {
                @if (u.isActive || u.code === editUomCode()) {
                  <option [value]="u.code" [selected]="u.code === editUomCode()">{{ u.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
            <input type="checkbox" [checked]="editIsLotControlled()" (change)="editIsLotControlled.set($any($event.target).checked)" />
            {{ t().lotControlled }}
          </label>
          <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
            <input type="checkbox" [checked]="editIsSerialControlled()" (change)="editIsSerialControlled.set($any($event.target).checked)" />
            {{ t().serialControlled }}
          </label>
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelEdit()">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().category }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ categoryName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().brand }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ brandName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().uom }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ uomName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().tracking }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ trackingLabel() }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ product().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().barcodes }}</span>
        @for (b of product().barcodes; track b.code) {
          <div class="flex items-center gap-2 rounded-md border border-hairline-light p-2.5">
            <span class="font-mono text-[13px] text-text-body">{{ b.code }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noBarcodes }}</span>
        }
        @if (showBarcodeForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().barcodeCode" [value]="barcodeCode()" (valueChange)="barcodeCode.set($event)" />
            @if (barcodeError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitBarcode()">{{ t().saveBarcode }}</lib-button>
              <lib-button variant="ghost" (click)="cancelBarcode()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showBarcodeForm.set(true)">{{ t().addBarcode }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class ProductDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  readonly product = input.required<Product>();
  readonly categories = input.required<Category[]>();
  readonly brands = input.required<Brand[]>();
  readonly unitsOfMeasure = input.required<UnitOfMeasure[]>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<ProductDetailsSave>();
  readonly addBarcode = output<{ code: string }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Product detail' : 'Chi tiết sản phẩm',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      category: en ? 'Category' : 'Nhóm',
      brand: en ? 'Brand' : 'Thương hiệu',
      uom: en ? 'Unit of measure' : 'Đơn vị tính',
      tracking: en ? 'Tracking' : 'Theo dõi',
      none: en ? '—' : '—',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      description: en ? 'Description' : 'Mô tả',
      lotControlled: en ? 'Lot-controlled' : 'Theo lô',
      serialControlled: en ? 'Serial-controlled' : 'Theo serial',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name is required.' : 'Cần nhập tên.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      barcodes: en ? 'Barcodes' : 'Mã vạch',
      noBarcodes: en ? 'No barcodes yet.' : 'Chưa có mã vạch.',
      barcodeCode: en ? 'Barcode' : 'Mã vạch',
      saveBarcode: en ? 'Save barcode' : 'Lưu mã vạch',
      addBarcode: en ? 'Add barcode' : 'Thêm mã vạch',
      barcodeRequired: en ? 'Barcode is required.' : 'Cần nhập mã vạch.',
    };
  });

  protected readonly categoryName = computed(() => this.categories().find((c) => c.code === this.product().categoryCode)?.name ?? this.t().none);
  protected readonly brandName = computed(() => this.brands().find((b) => b.code === this.product().brandCode)?.name ?? this.t().none);
  protected readonly uomName = computed(() => this.unitsOfMeasure().find((u) => u.code === this.product().defaultUomCode)?.name ?? this.t().none);
  protected readonly trackingLabel = computed(() => {
    const p = this.product();
    if (p.isLotControlled) return this.t().lotControlled;
    if (p.isSerialControlled) return this.t().serialControlled;
    return this.t().none;
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editCategoryCode = signal('');
  protected readonly editBrandCode = signal('');
  protected readonly editUomCode = signal('');
  protected readonly editIsLotControlled = signal(false);
  protected readonly editIsSerialControlled = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly showBarcodeForm = signal(false);
  protected readonly barcodeCode = signal('');
  protected readonly barcodeError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected product changes AND after any successful save for it —
    // the store's immutable updates give product() a new object identity on every mutation, so
    // a save "closes" its own form as a side effect.
    effect(() => {
      this.product();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
      this.editDescription.set('');
      this.editCategoryCode.set('');
      this.editBrandCode.set('');
      this.editUomCode.set('');
      this.editIsLotControlled.set(false);
      this.editIsSerialControlled.set(false);
      this.showBarcodeForm.set(false);
      this.barcodeError.set(null);
      this.barcodeCode.set('');
    });
  }

  protected startEdit(): void {
    const p = this.product();
    this.editName.set(p.name);
    this.editDescription.set(p.description);
    this.editCategoryCode.set(p.categoryCode ?? '');
    this.editBrandCode.set(p.brandCode ?? '');
    this.editUomCode.set(p.defaultUomCode ?? '');
    this.editIsLotControlled.set(p.isLotControlled);
    this.editIsSerialControlled.set(p.isSerialControlled);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({
      name,
      description: this.editDescription().trim(),
      categoryCode: this.editCategoryCode() || undefined,
      brandCode: this.editBrandCode() || undefined,
      defaultUomCode: this.editUomCode() || undefined,
      isLotControlled: this.editIsLotControlled(),
      isSerialControlled: this.editIsSerialControlled(),
    });
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.editError.set(null);
  }

  protected submitBarcode(): void {
    const code = this.barcodeCode().trim();
    if (!code) {
      this.barcodeError.set(this.t().barcodeRequired);
      return;
    }
    this.addBarcode.emit({ code });
  }

  protected cancelBarcode(): void {
    this.showBarcodeForm.set(false);
    this.barcodeCode.set('');
    this.barcodeError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. category-not-found) for the open edit form. */
  setDetailsError(message: string): void {
    this.editError.set(message);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate-code) for the open barcode form. */
  setBarcodeError(message: string): void {
    this.barcodeError.set(message);
  }
}
