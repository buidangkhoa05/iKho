import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PARTNERS } from '../../../core/mock-data/partners.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CreditNote, Invoice, InvoiceStatus, CreditNoteStatus } from '../../../core/mock-data/billing.data';
import { OrganizationStore } from '../../../core/state/organization-store';
import { BillingStore } from '../../../core/state/billing-store';
import { formatCurrency } from './billing-format.util';

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
  imports: [Button, DataPanel, DataTable, KpiCard, TextInput],
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

      <div class="flex gap-2">
        <lib-button [variant]="activeSection() === 'invoices' ? 'primary' : 'secondary'" (click)="selectSection('invoices')">{{ t().invoicesTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'credit-notes' ? 'primary' : 'secondary'" (click)="selectSection('credit-notes')">{{ t().creditNotesTab }}</lib-button>
      </div>

      @if (activeSection() === 'invoices') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchInvoicesPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().invoicesPanelTitle">
          <lib-data-table [columns]="invoiceColumns()" [rows]="filteredInvoiceRows()" [emptyLabel]="t().noInvoices" />
        </lib-data-panel>
        <!-- INVOICE_SECTION_EXTRA -->
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
    };
  });

  protected readonly activeSection = signal<BillingSection>('invoices');
  protected readonly query = signal('');

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
