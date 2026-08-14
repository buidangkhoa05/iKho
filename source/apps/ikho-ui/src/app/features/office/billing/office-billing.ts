import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PARTNERS } from '../../../core/mock-data/partners.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CreditNote, Invoice, InvoiceStatus, CreditNoteStatus } from '../../../core/mock-data/billing.data';
import { OrganizationStore } from '../../../core/state/organization-store';
import { BillingStore } from '../../../core/state/billing-store';
import { formatCurrency } from './billing-format.util';
import { InvoiceDetailPanel } from './invoice-detail-panel';
import { LineItemsBuilder } from './line-items-builder';

type BillingSection = 'invoices' | 'credit-notes';

interface InvoiceRow extends Record<string, unknown> {
  code: string;
  customerName: string;
  warehouseCode: string;
  issued: string;
  total: string;
  status: 'in-stock' | 'low-stock' | 'inbound' | 'out-of-stock';
  statusLabel: string;
}

interface CreditNoteRow extends Record<string, unknown> {
  code: string;
  customerName: string;
  issued: string;
  total: string;
  status: 'inbound' | 'out-of-stock';
  statusLabel: string;
}

function isThisMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

@Component({
  selector: 'app-office-billing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, DataTable, InvoiceDetailPanel, KpiCard, LineItemsBuilder, TextInput],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        @if (activeSection() === 'invoices') {
          <lib-button variant="primary" (click)="showInvoiceCreateForm.set(true)">{{ t().newInvoiceAction }}</lib-button>
        }
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <div class="flex gap-2">
        <lib-button [variant]="activeSection() === 'invoices' ? 'primary' : 'secondary'" (click)="selectSection('invoices')">{{ t().invoicesTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'credit-notes' ? 'primary' : 'secondary'" (click)="selectSection('credit-notes')">{{ t().creditNotesTab }}</lib-button>
      </div>

      @if (activeSection() === 'invoices') {
        @if (showInvoiceCreateForm()) {
          <lib-data-panel [title]="t().newInvoiceTitle" [subtitle]="t().newInvoiceSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().customer }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="invoiceCustomerCode()"
                    (change)="invoiceCustomerCode.set($any($event.target).value)"
                  >
                    <option value="" disabled>{{ t().selectCustomer }}</option>
                    @for (c of activeCustomers(); track c.code) {
                      <option [value]="c.code">{{ c.name }}</option>
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().warehouse }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="invoiceWarehouseCode()"
                    (change)="invoiceWarehouseCode.set($any($event.target).value)"
                  >
                    <option value="" disabled>{{ t().selectWarehouse }}</option>
                    @for (w of activeWarehouses(); track w.code) {
                      <option [value]="w.code">{{ w.name }}</option>
                    }
                  </select>
                </label>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().sourceReferenceType" [value]="invoiceSourceType()" (valueChange)="invoiceSourceType.set($event)" />
                <lib-text-input [label]="t().sourceReferenceId" [value]="invoiceSourceId()" (valueChange)="invoiceSourceId.set($event)" />
              </div>
              <app-line-items-builder #invoiceLinesBuilder />
              @if (invoiceFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitInvoice()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelInvoiceCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchInvoicesPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().invoicesPanelTitle">
              <lib-data-table [columns]="invoiceColumns()" [rows]="filteredInvoiceRows()" [emptyLabel]="t().noInvoices" [clickable]="true" (rowClick)="onInvoiceRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedInvoice(); as inv) {
            <app-invoice-detail-panel
              #invoiceDetailPanel
              [invoice]="inv"
              [customerName]="nameOfCustomer(inv.customerCode)"
              [warehouseName]="nameOfWarehouse(inv.warehouseCode)"
              (closePanel)="selectedInvoiceCode.set(null)"
              (recordPayment)="onRecordPayment($event)"
            />
          }
        </div>
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCreditNotesPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().creditNotesPanelTitle">
          <lib-data-table [columns]="creditNoteColumns()" [rows]="filteredCreditNoteRows()" [emptyLabel]="t().noCreditNotes" />
        </lib-data-panel>
        <!-- CREDIT_NOTE_SECTION_EXTRA -->
      }
    </div>
  `,
})
export class OfficeBilling {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(BillingStore);
  protected readonly organizationStore = inject(OrganizationStore);

  protected readonly title = computed(() => screenTitle('billing', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('billing', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      invoicesTab: en ? 'Invoices' : 'Hoá đơn',
      creditNotesTab: en ? 'Credit Notes' : 'Giấy báo có',
      invoicesPanelTitle: en ? 'Invoices' : 'Hoá đơn',
      creditNotesPanelTitle: en ? 'Credit notes' : 'Giấy báo có',
      searchInvoicesPlaceholder: en ? 'Search code or customer' : 'Tìm mã hoặc khách hàng',
      searchCreditNotesPlaceholder: en ? 'Search code or customer' : 'Tìm mã hoặc khách hàng',
      noInvoices: en ? 'No invoices match' : 'Không có hoá đơn phù hợp',
      noCreditNotes: en ? 'No credit notes match' : 'Không có giấy báo có phù hợp',
      invoicedThisMonth: en ? 'Invoiced this month' : 'Đã xuất hoá đơn tháng này',
      outstanding: en ? 'Outstanding' : 'Chưa thu',
      paidThisMonth: en ? 'Paid this month' : 'Đã thu tháng này',
      creditNotesKpi: en ? 'Credit notes' : 'Giấy báo có',
      colInvoice: en ? 'Invoice' : 'Hoá đơn',
      colCreditNote: en ? 'Credit note' : 'Giấy báo có',
      colCustomer: en ? 'Customer' : 'Khách hàng',
      colWarehouse: en ? 'Warehouse' : 'Kho',
      colIssued: en ? 'Issued' : 'Ngày phát hành',
      colTotal: en ? 'Total' : 'Tổng cộng',
      colStatus: en ? 'Status' : 'Trạng thái',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusPartiallyPaid: en ? 'Partially paid' : 'Thanh toán một phần',
      statusPaid: en ? 'Paid' : 'Đã thanh toán',
      statusVoid: en ? 'Void' : 'Đã huỷ',
      paymentInvalidError: en ? 'Amount and Method are required.' : 'Cần nhập số tiền và hình thức.',
      paymentInvoiceVoidError: en ? 'This invoice has been voided and cannot accept payments.' : 'Hoá đơn đã bị huỷ và không thể nhận thanh toán.',
      paymentExceedsTotalError: en ? 'This payment would exceed the invoice total.' : 'Khoản thanh toán này vượt quá tổng tiền hoá đơn.',
      newInvoiceAction: en ? 'New invoice' : 'Hoá đơn mới',
      newInvoiceTitle: en ? 'New invoice' : 'Hoá đơn mới',
      newInvoiceSubtitle: en ? 'Customer, warehouse, and product lines' : 'Khách hàng, kho và các dòng sản phẩm',
      customer: en ? 'Customer' : 'Khách hàng',
      selectCustomer: en ? 'Select a customer' : 'Chọn khách hàng',
      warehouse: en ? 'Warehouse' : 'Kho',
      selectWarehouse: en ? 'Select a warehouse' : 'Chọn kho',
      sourceReferenceType: en ? 'Source reference type (optional)' : 'Loại chứng từ nguồn (tuỳ chọn)',
      sourceReferenceId: en ? 'Source reference id (optional)' : 'Mã chứng từ nguồn (tuỳ chọn)',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      selectCustomerAndWarehouseError: en ? 'Customer and Warehouse are required.' : 'Cần chọn khách hàng và kho.',
      invoiceLinesInvalidError: en ? 'At least one valid line is required.' : 'Cần ít nhất một dòng hợp lệ.',
      customerNotFoundError: en ? 'This customer could not be found or is inactive.' : 'Không tìm thấy khách hàng hoặc khách hàng ngừng hoạt động.',
      productNotFoundError: en ? 'One or more selected products could not be found.' : 'Không tìm thấy một hoặc nhiều sản phẩm đã chọn.',
    };
  });

  protected readonly activeSection = signal<BillingSection>('invoices');
  protected readonly query = signal('');

  protected readonly selectedInvoiceCode = signal<string | null>(null);
  protected readonly invoiceDetailPanel = viewChild<InvoiceDetailPanel>('invoiceDetailPanel');

  protected readonly selectedInvoice = computed<Invoice | null>(() => {
    const code = this.selectedInvoiceCode();
    if (!code) return null;
    return this.store.invoices().find((i) => i.code === code) ?? null;
  });

  protected readonly showInvoiceCreateForm = signal(false);
  protected readonly invoiceCustomerCode = signal('');
  protected readonly invoiceWarehouseCode = signal('');
  protected readonly invoiceSourceType = signal('');
  protected readonly invoiceSourceId = signal('');
  protected readonly invoiceFormError = signal<string | null>(null);
  protected readonly invoiceLinesBuilder = viewChild<LineItemsBuilder>('invoiceLinesBuilder');

  protected readonly activeCustomers = computed(() => PARTNERS.filter((p) => p.type === 'customer' && p.isActive));
  protected readonly activeWarehouses = computed(() => this.organizationStore.warehouses().filter((w) => w.isActive));

  protected selectSection(section: BillingSection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly kpis = computed(() => {
    const now = new Date();
    const invoices = this.store.invoices();
    const creditNotes = this.store.creditNotes();

    const invoicedThisMonth = invoices.filter((i) => isThisMonth(i.issuedOnUtc, now)).reduce((sum, i) => sum + i.totalAmount, 0);
    const outstanding = invoices
      .filter((i) => i.status !== 'void')
      .reduce((sum, i) => sum + (i.totalAmount - i.payments.filter((p) => p.status === 'recorded').reduce((s, p) => s + p.amount, 0)), 0);
    const paidThisMonth = invoices
      .flatMap((i) => i.payments)
      .filter((p) => p.status === 'recorded' && isThisMonth(p.paidOnUtc, now))
      .reduce((sum, p) => sum + p.amount, 0);

    return [
      { label: this.t().invoicedThisMonth, value: formatCurrency(invoicedThisMonth) },
      { label: this.t().outstanding, value: formatCurrency(outstanding) },
      { label: this.t().paidThisMonth, value: formatCurrency(paidThisMonth) },
      { label: this.t().creditNotesKpi, value: creditNotes.length },
    ];
  });

  protected readonly invoiceColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colInvoice, mono: true },
      { key: 'customerName', label: t.colCustomer },
      { key: 'warehouseCode', label: t.colWarehouse, mono: true },
      { key: 'issued', label: t.colIssued, mono: true },
      { key: 'total', label: t.colTotal, align: 'right', mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly creditNoteColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colCreditNote, mono: true },
      { key: 'customerName', label: t.colCustomer },
      { key: 'issued', label: t.colIssued, mono: true },
      { key: 'total', label: t.colTotal, align: 'right', mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected nameOfCustomer(code: string): string {
    return PARTNERS.find((p) => p.code === code)?.name ?? '—';
  }

  protected nameOfWarehouse(code: string): string {
    return this.organizationStore.warehouses().find((w) => w.code === code)?.name ?? '—';
  }

  protected onInvoiceRowClick(row: Record<string, unknown>): void {
    this.selectedInvoiceCode.set(String(row['code']));
  }

  protected onRecordPayment(event: { amount: number; method: string; referenceNote?: string }): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    const outcome = this.store.recordPayment(invoice.code, event);
    if (outcome === 'invalid') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentInvalidError);
    } else if (outcome === 'invoice-void') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentInvoiceVoidError);
    } else if (outcome === 'exceeds-total') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentExceedsTotalError);
    }
    // 'invoice-not-found' is unreachable via the UI — recordPayment is only ever invoked
    // for the currently selected, real invoice.
  }

  protected submitInvoice(): void {
    const customerCode = this.invoiceCustomerCode();
    const warehouseCode = this.invoiceWarehouseCode();
    if (!customerCode || !warehouseCode) {
      this.invoiceFormError.set(this.t().selectCustomerAndWarehouseError);
      return;
    }

    const lines = this.invoiceLinesBuilder()?.getLines() ?? [];
    const outcome = this.store.addInvoice({
      customerCode,
      warehouseCode,
      sourceReferenceType: this.invoiceSourceType().trim() || undefined,
      sourceReferenceId: this.invoiceSourceId().trim() || undefined,
      lines,
    });

    if (outcome === 'invalid') {
      this.invoiceFormError.set(this.t().invoiceLinesInvalidError);
      return;
    }
    if (outcome === 'customer-not-found') {
      this.invoiceFormError.set(this.t().customerNotFoundError);
      return;
    }
    if (outcome === 'product-not-found') {
      this.invoiceFormError.set(this.t().productNotFoundError);
      return;
    }

    this.resetInvoiceForm();
  }

  protected cancelInvoiceCreate(): void {
    this.resetInvoiceForm();
  }

  private resetInvoiceForm(): void {
    this.invoiceFormError.set(null);
    this.invoiceCustomerCode.set('');
    this.invoiceWarehouseCode.set('');
    this.invoiceSourceType.set('');
    this.invoiceSourceId.set('');
    this.invoiceLinesBuilder()?.reset();
    this.showInvoiceCreateForm.set(false);
  }

  private invoiceStatusBadge(status: InvoiceStatus): { status: InvoiceRow['status']; statusLabel: string } {
    const t = this.t();
    switch (status) {
      case 'paid':
        return { status: 'in-stock', statusLabel: t.statusPaid };
      case 'partially-paid':
        return { status: 'low-stock', statusLabel: t.statusPartiallyPaid };
      case 'void':
        return { status: 'out-of-stock', statusLabel: t.statusVoid };
      default:
        return { status: 'inbound', statusLabel: t.statusIssued };
    }
  }

  private creditNoteStatusBadge(status: CreditNoteStatus): { status: CreditNoteRow['status']; statusLabel: string } {
    const t = this.t();
    return status === 'void' ? { status: 'out-of-stock', statusLabel: t.statusVoid } : { status: 'inbound', statusLabel: t.statusIssued };
  }

  private toInvoiceRow(i: Invoice): InvoiceRow {
    const badge = this.invoiceStatusBadge(i.status);
    return {
      code: i.code,
      customerName: this.nameOfCustomer(i.customerCode),
      warehouseCode: i.warehouseCode,
      issued: i.issuedOnUtc.slice(0, 10),
      total: formatCurrency(i.totalAmount),
      ...badge,
    };
  }

  private toCreditNoteRow(c: CreditNote): CreditNoteRow {
    const badge = this.creditNoteStatusBadge(c.status);
    return {
      code: c.code,
      customerName: this.nameOfCustomer(c.customerCode),
      issued: c.issuedOnUtc.slice(0, 10),
      total: formatCurrency(c.totalAmount),
      ...badge,
    };
  }

  protected readonly invoiceRows = computed<InvoiceRow[]>(() => this.store.invoices().map((i) => this.toInvoiceRow(i)));
  protected readonly creditNoteRows = computed<CreditNoteRow[]>(() => this.store.creditNotes().map((c) => this.toCreditNoteRow(c)));

  protected readonly filteredInvoiceRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.invoiceRows();
    return this.invoiceRows().filter((row) => [row.code, row.customerName].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredCreditNoteRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.creditNoteRows();
    return this.creditNoteRows().filter((row) => [row.code, row.customerName].join(' ').toLowerCase().includes(q));
  });
}
