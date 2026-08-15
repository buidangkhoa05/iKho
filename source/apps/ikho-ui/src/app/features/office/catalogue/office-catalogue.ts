import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { Brand, Category, Product, UnitOfMeasure } from '../../../core/mock-data/catalogue.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { ProductDetailPanel } from './product-detail-panel';
import { ReferenceEntityDetailPanel, ReferenceEntityLabels } from './reference-entity-detail-panel';

type CatalogueSection = 'products' | 'categories' | 'brands' | 'uom';

interface ProductRow extends Record<string, unknown> {
  sku: string;
  name: string;
  categoryName: string;
  brandName: string;
  uomCode: string;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

interface CodeNameRow extends Record<string, unknown> {
  code: string;
  name: string;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

@Component({
  selector: 'app-office-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, DataTable, KpiCard, TextInput, ProductDetailPanel, ReferenceEntityDetailPanel],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        @if (activeSection() === 'products') {
          <lib-button variant="primary" (click)="showProductCreateForm.set(true)">{{ t().newProductAction }}</lib-button>
        } @else if (activeSection() === 'categories') {
          <lib-button variant="primary" (click)="showCategoryCreateForm.set(true)">{{ t().newCategoryAction }}</lib-button>
        } @else if (activeSection() === 'brands') {
          <lib-button variant="primary" (click)="showBrandCreateForm.set(true)">{{ t().newBrandAction }}</lib-button>
        } @else {
          <lib-button variant="primary" (click)="showUomCreateForm.set(true)">{{ t().newUomAction }}</lib-button>
        }
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <div class="flex flex-wrap gap-2">
        <lib-button [variant]="activeSection() === 'products' ? 'primary' : 'secondary'" (click)="selectSection('products')">{{ t().productsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'categories' ? 'primary' : 'secondary'" (click)="selectSection('categories')">{{ t().categoriesTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'brands' ? 'primary' : 'secondary'" (click)="selectSection('brands')">{{ t().brandsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'uom' ? 'primary' : 'secondary'" (click)="selectSection('uom')">{{ t().uomTab }}</lib-button>
      </div>

      @if (activeSection() === 'products') {
        @if (showProductCreateForm()) {
          <lib-data-panel [title]="t().newProductTitle" [subtitle]="t().newProductSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().sku" [value]="productSku()" (valueChange)="productSku.set($event)" />
                <lib-text-input [label]="t().name" [value]="productName()" (valueChange)="productName.set($event)" />
              </div>
              <lib-text-input [label]="t().description" [value]="productDescription()" (valueChange)="productDescription.set($event)" />
              <div class="grid grid-cols-3 gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().category }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productCategoryCode()"
                    (change)="productCategoryCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (c of store.categories(); track c.code) {
                      @if (c.isActive) {
                        <option [value]="c.code">{{ c.name }}</option>
                      }
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().brand }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productBrandCode()"
                    (change)="productBrandCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (b of store.brands(); track b.code) {
                      @if (b.isActive) {
                        <option [value]="b.code">{{ b.name }}</option>
                      }
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().uom }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productUomCode()"
                    (change)="productUomCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (u of store.unitsOfMeasure(); track u.code) {
                      @if (u.isActive) {
                        <option [value]="u.code">{{ u.name }}</option>
                      }
                    }
                  </select>
                </label>
              </div>
              <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
                <input type="checkbox" [checked]="productIsLotControlled()" (change)="productIsLotControlled.set($any($event.target).checked)" />
                {{ t().lotControlled }}
              </label>
              <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
                <input type="checkbox" [checked]="productIsSerialControlled()" (change)="productIsSerialControlled.set($any($event.target).checked)" />
                {{ t().serialControlled }}
              </label>
              @if (productFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitProductCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelProductCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchProductsPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().productsPanelTitle">
              <lib-data-table [columns]="productColumns()" [rows]="filteredProductRows()" [emptyLabel]="t().noProducts" [clickable]="true" (rowClick)="onProductRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedProduct(); as p) {
            <app-product-detail-panel
              #productDetailPanel
              [product]="p"
              [categories]="store.categories()"
              [brands]="store.brands()"
              [unitsOfMeasure]="store.unitsOfMeasure()"
              (closePanel)="selectedProductSku.set(null)"
              (toggleStatus)="onToggleProductStatus()"
              (saveDetails)="onSaveProductDetails($event)"
              (addBarcode)="onAddBarcode($event)"
            />
          }
        </div>
      } @else if (activeSection() === 'categories') {
        @if (showCategoryCreateForm()) {
          <lib-data-panel [title]="t().newCategoryTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="categoryCode()" (valueChange)="categoryCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="categoryName()" (valueChange)="categoryName.set($event)" />
              </div>
              @if (categoryFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitCategoryCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelCategoryCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().categoriesPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredCategoryRows()" [emptyLabel]="t().noCategories" [clickable]="true" (rowClick)="onCategoryRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedCategory(); as c) {
            <app-reference-entity-detail-panel
              [entity]="c"
              [labels]="categoryLabels()"
              (closePanel)="selectedCategoryCode.set(null)"
              (toggleStatus)="onCategoryToggleStatus()"
              (saveDetails)="onCategorySaveDetails($event)"
            />
          }
        </div>
      } @else if (activeSection() === 'brands') {
        @if (showBrandCreateForm()) {
          <lib-data-panel [title]="t().newBrandTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="brandCode()" (valueChange)="brandCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="brandName()" (valueChange)="brandName.set($event)" />
              </div>
              @if (brandFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitBrandCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelBrandCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().brandsPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredBrandRows()" [emptyLabel]="t().noBrands" [clickable]="true" (rowClick)="onBrandRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedBrand(); as b) {
            <app-reference-entity-detail-panel
              [entity]="b"
              [labels]="brandLabels()"
              (closePanel)="selectedBrandCode.set(null)"
              (toggleStatus)="onBrandToggleStatus()"
              (saveDetails)="onBrandSaveDetails($event)"
            />
          }
        </div>
      } @else {
        @if (showUomCreateForm()) {
          <lib-data-panel [title]="t().newUomTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="uomCode()" (valueChange)="uomCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="uomName()" (valueChange)="uomName.set($event)" />
              </div>
              @if (uomFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitUomCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelUomCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().uomPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredUomRows()" [emptyLabel]="t().noUom" [clickable]="true" (rowClick)="onUomRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedUom(); as u) {
            <app-reference-entity-detail-panel
              [entity]="u"
              [labels]="uomLabels()"
              (closePanel)="selectedUomCode.set(null)"
              (toggleStatus)="onUomToggleStatus()"
              (saveDetails)="onUomSaveDetails($event)"
            />
          }
        </div>
      }
    </div>
  `,
})
export class OfficeCatalogue {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(CatalogStore);

  protected readonly title = computed(() => screenTitle('catalogue', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('catalogue', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      productsTab: en ? 'Products' : 'Sản phẩm',
      categoriesTab: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsTab: en ? 'Brands' : 'Thương hiệu',
      uomTab: en ? 'Units of Measure' : 'Đơn vị tính',
      productsPanelTitle: en ? 'Products' : 'Sản phẩm',
      categoriesPanelTitle: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsPanelTitle: en ? 'Brands' : 'Thương hiệu',
      uomPanelTitle: en ? 'Units of Measure' : 'Đơn vị tính',
      searchProductsPlaceholder: en ? 'Search SKU or name' : 'Tìm SKU hoặc tên',
      searchCodeNamePlaceholder: en ? 'Search code or name' : 'Tìm mã hoặc tên',
      noProducts: en ? 'No products match' : 'Không có sản phẩm phù hợp',
      noCategories: en ? 'No categories match' : 'Không có nhóm phù hợp',
      noBrands: en ? 'No brands match' : 'Không có thương hiệu phù hợp',
      noUom: en ? 'No units of measure match' : 'Không có đơn vị tính phù hợp',
      activeSkus: en ? 'Active SKUs' : 'SKU đang hoạt động',
      categoriesKpi: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsKpi: en ? 'Brands' : 'Thương hiệu',
      lotControlledKpi: en ? 'Lot-controlled' : 'Theo lô',
      colSku: en ? 'SKU' : 'SKU',
      colName: en ? 'Name' : 'Tên',
      colCategory: en ? 'Category' : 'Nhóm',
      colBrand: en ? 'Brand' : 'Thương hiệu',
      colUom: en ? 'UoM' : 'ĐVT',
      colCode: en ? 'Code' : 'Mã',
      colStatus: en ? 'Status' : 'Trạng thái',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      none: en ? '—' : '—',
      productNotFoundError: en ? 'This product could not be found. It may have been removed.' : 'Không tìm thấy sản phẩm này. Có thể đã bị xoá.',
      categoryNotFoundError: en ? 'The selected category could not be found.' : 'Không tìm thấy nhóm đã chọn.',
      brandNotFoundError: en ? 'The selected brand could not be found.' : 'Không tìm thấy thương hiệu đã chọn.',
      uomNotFoundError: en ? 'The selected unit of measure could not be found.' : 'Không tìm thấy đơn vị tính đã chọn.',
      duplicateBarcodeError: en ? 'This barcode is already registered to a product.' : 'Mã vạch này đã được đăng ký cho một sản phẩm.',
      newProductAction: en ? 'New product' : 'Sản phẩm mới',
      newProductTitle: en ? 'New product' : 'Sản phẩm mới',
      newProductSubtitle: en ? 'SKU, name, and classification' : 'SKU, tên và phân loại',
      sku: en ? 'SKU' : 'SKU',
      name: en ? 'Name' : 'Tên',
      description: en ? 'Description' : 'Mô tả',
      category: en ? 'Category' : 'Nhóm',
      brand: en ? 'Brand' : 'Thương hiệu',
      uom: en ? 'Unit of measure' : 'Đơn vị tính',
      lotControlled: en ? 'Lot-controlled' : 'Theo lô',
      serialControlled: en ? 'Serial-controlled' : 'Theo serial',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      skuNameRequiredError: en ? 'SKU and Name are required.' : 'Cần nhập SKU và tên.',
      duplicateSkuError: (sku: string) => (en ? `SKU '${sku}' is already in use.` : `SKU '${sku}' đã được sử dụng.`),
      editName: en ? 'Edit name' : 'Sửa tên',
      activate: en ? 'Activate' : 'Kích hoạt',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      close: en ? 'Close' : 'Đóng',
      nameRequiredError: en ? 'Name is required.' : 'Cần nhập tên.',
      categoryDetailEyebrow: en ? 'Category detail' : 'Chi tiết nhóm',
      brandDetailEyebrow: en ? 'Brand detail' : 'Chi tiết thương hiệu',
      uomDetailEyebrow: en ? 'Unit of measure detail' : 'Chi tiết đơn vị tính',
      newCategoryAction: en ? 'New category' : 'Nhóm mới',
      newBrandAction: en ? 'New brand' : 'Thương hiệu mới',
      newUomAction: en ? 'New unit of measure' : 'Đơn vị tính mới',
      newCategoryTitle: en ? 'New category' : 'Nhóm mới',
      newBrandTitle: en ? 'New brand' : 'Thương hiệu mới',
      newUomTitle: en ? 'New unit of measure' : 'Đơn vị tính mới',
      newCodeNameSubtitle: en ? 'Code and name' : 'Mã và tên',
      codeRequiredError: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
      duplicateCategoryCodeError: (code: string) => (en ? `Category code '${code}' is already in use.` : `Mã nhóm '${code}' đã được sử dụng.`),
      duplicateBrandCodeError: (code: string) => (en ? `Brand code '${code}' is already in use.` : `Mã thương hiệu '${code}' đã được sử dụng.`),
      duplicateUomCodeError: (code: string) => (en ? `Unit of measure code '${code}' is already in use.` : `Mã đơn vị tính '${code}' đã được sử dụng.`),
    };
  });

  protected readonly activeSection = signal<CatalogueSection>('products');
  protected readonly query = signal('');

  protected selectSection(section: CatalogueSection): void {
    this.activeSection.set(section);
    this.query.set('');
    this.resetProductCreateForm();
    this.resetCategoryCreateForm();
    this.resetBrandCreateForm();
    this.resetUomCreateForm();
    this.selectedProductSku.set(null);
    this.selectedCategoryCode.set(null);
    this.selectedBrandCode.set(null);
    this.selectedUomCode.set(null);
  }

  protected readonly selectedProductSku = signal<string | null>(null);
  protected readonly productDetailPanel = viewChild<ProductDetailPanel>('productDetailPanel');

  protected readonly selectedProduct = computed<Product | null>(() => {
    const sku = this.selectedProductSku();
    if (!sku) return null;
    return this.store.products().find((p) => p.sku === sku) ?? null;
  });

  protected readonly showProductCreateForm = signal(false);
  protected readonly productSku = signal('');
  protected readonly productName = signal('');
  protected readonly productDescription = signal('');
  protected readonly productCategoryCode = signal('');
  protected readonly productBrandCode = signal('');
  protected readonly productUomCode = signal('');
  protected readonly productIsLotControlled = signal(false);
  protected readonly productIsSerialControlled = signal(false);
  protected readonly productFormError = signal<string | null>(null);

  protected readonly selectedCategoryCode = signal<string | null>(null);
  protected readonly selectedBrandCode = signal<string | null>(null);
  protected readonly selectedUomCode = signal<string | null>(null);

  protected readonly selectedCategory = computed(() => {
    const code = this.selectedCategoryCode();
    if (!code) return null;
    return this.store.categories().find((c) => c.code === code) ?? null;
  });

  protected readonly selectedBrand = computed(() => {
    const code = this.selectedBrandCode();
    if (!code) return null;
    return this.store.brands().find((b) => b.code === code) ?? null;
  });

  protected readonly selectedUom = computed(() => {
    const code = this.selectedUomCode();
    if (!code) return null;
    return this.store.unitsOfMeasure().find((u) => u.code === code) ?? null;
  });

  protected readonly categoryLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.categoryDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly brandLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.brandDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly uomLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.uomDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly showCategoryCreateForm = signal(false);
  protected readonly categoryCode = signal('');
  protected readonly categoryName = signal('');
  protected readonly categoryFormError = signal<string | null>(null);

  protected readonly showBrandCreateForm = signal(false);
  protected readonly brandCode = signal('');
  protected readonly brandName = signal('');
  protected readonly brandFormError = signal<string | null>(null);

  protected readonly showUomCreateForm = signal(false);
  protected readonly uomCode = signal('');
  protected readonly uomName = signal('');
  protected readonly uomFormError = signal<string | null>(null);

  protected readonly kpis = computed(() => {
    const products = this.store.products();
    return [
      { label: this.t().activeSkus, value: products.filter((p) => p.isActive).length },
      { label: this.t().categoriesKpi, value: this.store.categories().length },
      { label: this.t().brandsKpi, value: this.store.brands().length },
      { label: this.t().lotControlledKpi, value: products.filter((p) => p.isLotControlled).length },
    ];
  });

  protected readonly productColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'name', label: t.colName },
      { key: 'categoryName', label: t.colCategory },
      { key: 'brandName', label: t.colBrand },
      { key: 'uomCode', label: t.colUom, mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly codeNameColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colCode, mono: true },
      { key: 'name', label: t.colName },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected nameOfCategory(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.categories().find((c) => c.code === code)?.name ?? this.t().none;
  }

  protected nameOfBrand(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.brands().find((b) => b.code === code)?.name ?? this.t().none;
  }

  protected nameOfUom(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.unitsOfMeasure().find((u) => u.code === code)?.name ?? this.t().none;
  }

  private toProductRow(p: Product): ProductRow {
    return {
      sku: p.sku,
      name: p.name,
      categoryName: this.nameOfCategory(p.categoryCode),
      brandName: this.nameOfBrand(p.brandCode),
      uomCode: p.defaultUomCode ?? this.t().none,
      status: p.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: p.isActive ? this.t().active : this.t().inactive,
    };
  }

  private toCodeNameRow(entity: Category | Brand | UnitOfMeasure): CodeNameRow {
    return {
      code: entity.code,
      name: entity.name,
      status: entity.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: entity.isActive ? this.t().active : this.t().inactive,
    };
  }

  protected readonly productRows = computed<ProductRow[]>(() => this.store.products().map((p) => this.toProductRow(p)));
  protected readonly categoryRows = computed<CodeNameRow[]>(() => this.store.categories().map((c) => this.toCodeNameRow(c)));
  protected readonly brandRows = computed<CodeNameRow[]>(() => this.store.brands().map((b) => this.toCodeNameRow(b)));
  protected readonly uomRows = computed<CodeNameRow[]>(() => this.store.unitsOfMeasure().map((u) => this.toCodeNameRow(u)));

  protected readonly filteredProductRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.productRows();
    return this.productRows().filter((row) => [row.sku, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredCategoryRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.categoryRows();
    return this.categoryRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredBrandRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.brandRows();
    return this.brandRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredUomRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.uomRows();
    return this.uomRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });

  protected onProductRowClick(row: Record<string, unknown>): void {
    this.selectedProductSku.set(String(row['sku']));
  }

  protected onToggleProductStatus(): void {
    const p = this.selectedProduct();
    if (!p) return;
    this.store.setProductStatus(p.sku, !p.isActive);
  }

  protected onSaveProductDetails(input: {
    name: string;
    description: string;
    categoryCode?: string;
    brandCode?: string;
    defaultUomCode?: string;
    isLotControlled: boolean;
    isSerialControlled: boolean;
  }): void {
    const p = this.selectedProduct();
    if (!p) return;
    const outcome = this.store.updateProduct(p.sku, input);
    if (outcome === 'not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().productNotFoundError);
    } else if (outcome === 'category-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().categoryNotFoundError);
    } else if (outcome === 'brand-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().brandNotFoundError);
    } else if (outcome === 'uom-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().uomNotFoundError);
    }
  }

  protected onAddBarcode(event: { code: string }): void {
    const p = this.selectedProduct();
    if (!p) return;
    const outcome = this.store.addBarcode(p.sku, event);
    if (outcome === 'duplicate-code') {
      this.productDetailPanel()?.setBarcodeError(this.t().duplicateBarcodeError);
    } else if (outcome === 'not-found') {
      this.productDetailPanel()?.setBarcodeError(this.t().productNotFoundError);
    }
  }

  protected submitProductCreate(): void {
    const sku = this.productSku().trim();
    const name = this.productName().trim();
    if (!sku || !name) {
      this.productFormError.set(this.t().skuNameRequiredError);
      return;
    }

    const outcome = this.store.addProduct({
      sku,
      name,
      description: this.productDescription().trim(),
      categoryCode: this.productCategoryCode() || undefined,
      brandCode: this.productBrandCode() || undefined,
      defaultUomCode: this.productUomCode() || undefined,
      isLotControlled: this.productIsLotControlled(),
      isSerialControlled: this.productIsSerialControlled(),
    });

    if (outcome === 'invalid') {
      this.productFormError.set(this.t().skuNameRequiredError);
      return;
    }
    if (outcome === 'category-not-found') {
      this.productFormError.set(this.t().categoryNotFoundError);
      return;
    }
    if (outcome === 'brand-not-found') {
      this.productFormError.set(this.t().brandNotFoundError);
      return;
    }
    if (outcome === 'uom-not-found') {
      this.productFormError.set(this.t().uomNotFoundError);
      return;
    }
    if (outcome === 'duplicate-sku') {
      this.productFormError.set(this.t().duplicateSkuError(sku));
      return;
    }

    this.resetProductCreateForm();
  }

  protected cancelProductCreate(): void {
    this.resetProductCreateForm();
  }

  private resetProductCreateForm(): void {
    this.productFormError.set(null);
    this.productSku.set('');
    this.productName.set('');
    this.productDescription.set('');
    this.productCategoryCode.set('');
    this.productBrandCode.set('');
    this.productUomCode.set('');
    this.productIsLotControlled.set(false);
    this.productIsSerialControlled.set(false);
    this.showProductCreateForm.set(false);
  }

  protected onCategoryRowClick(row: Record<string, unknown>): void {
    this.selectedCategoryCode.set(String(row['code']));
  }

  protected onCategoryToggleStatus(): void {
    const c = this.selectedCategory();
    if (!c) return;
    this.store.updateCategory(c.code, { name: c.name, isActive: !c.isActive });
  }

  protected onCategorySaveDetails(input: { name: string }): void {
    const c = this.selectedCategory();
    if (!c) return;
    this.store.updateCategory(c.code, { name: input.name, isActive: c.isActive });
  }

  protected submitCategoryCreate(): void {
    const code = this.categoryCode().trim();
    const name = this.categoryName().trim();
    if (!code || !name) {
      this.categoryFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addCategory({ code, name });
    if (outcome === 'invalid') {
      this.categoryFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.categoryFormError.set(this.t().duplicateCategoryCodeError(code));
      return;
    }
    this.resetCategoryCreateForm();
  }

  protected cancelCategoryCreate(): void {
    this.resetCategoryCreateForm();
  }

  private resetCategoryCreateForm(): void {
    this.categoryFormError.set(null);
    this.categoryCode.set('');
    this.categoryName.set('');
    this.showCategoryCreateForm.set(false);
  }

  protected onBrandRowClick(row: Record<string, unknown>): void {
    this.selectedBrandCode.set(String(row['code']));
  }

  protected onBrandToggleStatus(): void {
    const b = this.selectedBrand();
    if (!b) return;
    this.store.updateBrand(b.code, { name: b.name, isActive: !b.isActive });
  }

  protected onBrandSaveDetails(input: { name: string }): void {
    const b = this.selectedBrand();
    if (!b) return;
    this.store.updateBrand(b.code, { name: input.name, isActive: b.isActive });
  }

  protected submitBrandCreate(): void {
    const code = this.brandCode().trim();
    const name = this.brandName().trim();
    if (!code || !name) {
      this.brandFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addBrand({ code, name });
    if (outcome === 'invalid') {
      this.brandFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.brandFormError.set(this.t().duplicateBrandCodeError(code));
      return;
    }
    this.resetBrandCreateForm();
  }

  protected cancelBrandCreate(): void {
    this.resetBrandCreateForm();
  }

  private resetBrandCreateForm(): void {
    this.brandFormError.set(null);
    this.brandCode.set('');
    this.brandName.set('');
    this.showBrandCreateForm.set(false);
  }

  protected onUomRowClick(row: Record<string, unknown>): void {
    this.selectedUomCode.set(String(row['code']));
  }

  protected onUomToggleStatus(): void {
    const u = this.selectedUom();
    if (!u) return;
    this.store.updateUom(u.code, { name: u.name, isActive: !u.isActive });
  }

  protected onUomSaveDetails(input: { name: string }): void {
    const u = this.selectedUom();
    if (!u) return;
    this.store.updateUom(u.code, { name: input.name, isActive: u.isActive });
  }

  protected submitUomCreate(): void {
    const code = this.uomCode().trim();
    const name = this.uomName().trim();
    if (!code || !name) {
      this.uomFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addUom({ code, name });
    if (outcome === 'invalid') {
      this.uomFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.uomFormError.set(this.t().duplicateUomCodeError(code));
      return;
    }
    this.resetUomCreateForm();
  }

  protected cancelUomCreate(): void {
    this.resetUomCreateForm();
  }

  private resetUomCreateForm(): void {
    this.uomFormError.set(null);
    this.uomCode.set('');
    this.uomName.set('');
    this.showUomCreateForm.set(false);
  }
}
