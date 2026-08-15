import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { Brand, Category, Product, UnitOfMeasure } from '../../../core/mock-data/catalogue.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { ProductDetailPanel } from './product-detail-panel';

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
  imports: [Button, DataPanel, DataTable, KpiCard, TextInput, ProductDetailPanel],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
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
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().categoriesPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredCategoryRows()" [emptyLabel]="t().noCategories" />
        </lib-data-panel>
        <!-- CATEGORIES_SECTION_EXTRA -->
      } @else if (activeSection() === 'brands') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().brandsPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredBrandRows()" [emptyLabel]="t().noBrands" />
        </lib-data-panel>
        <!-- BRANDS_SECTION_EXTRA -->
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().uomPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredUomRows()" [emptyLabel]="t().noUom" />
        </lib-data-panel>
        <!-- UOM_SECTION_EXTRA -->
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
    };
  });

  protected readonly activeSection = signal<CatalogueSection>('products');
  protected readonly query = signal('');

  protected selectSection(section: CatalogueSection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly selectedProductSku = signal<string | null>(null);
  protected readonly productDetailPanel = viewChild<ProductDetailPanel>('productDetailPanel');

  protected readonly selectedProduct = computed<Product | null>(() => {
    const sku = this.selectedProductSku();
    if (!sku) return null;
    return this.store.products().find((p) => p.sku === sku) ?? null;
  });

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
}
