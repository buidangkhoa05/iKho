import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Partner } from '../../../core/mock-data/partners.data';
import { NewPartnerAddress, NewPartnerContact } from '../../../core/state/partners-store';

@Component({
  selector: 'app-partner-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ partner().name }}</span>
          <span class="font-mono text-[13px] text-primary">{{ partner().code }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="t().close"
          (click)="close.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="partner().isActive ? 'in-stock' : 'out-of-stock'" [label]="partner().isActive ? t().active : t().blocked" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          <lib-text-input [label]="t().taxId" [value]="editTaxId()" (valueChange)="editTaxId.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="editing.set(false)">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().taxId }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ partner().taxId }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().created }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ partner().createdOnUtc.slice(0, 10) }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ partner().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().addresses }}</span>
        @for (a of partner().addresses; track a.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] text-text-body">{{ a.line1 }}, {{ a.city }}</span>
              @if (a.isPrimary) {
                <span class="font-core text-[11px] font-semibold text-primary">{{ t().primary }}</span>
              }
            </div>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noAddresses }}</span>
        }
        @if (showAddressForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().line1" [value]="addrLine1()" (valueChange)="addrLine1.set($event)" />
            <lib-text-input [label]="t().line2" [value]="addrLine2()" (valueChange)="addrLine2.set($event)" />
            <lib-text-input [label]="t().city" [value]="addrCity()" (valueChange)="addrCity.set($event)" />
            <lib-text-input [label]="t().state" [value]="addrState()" (valueChange)="addrState.set($event)" />
            <lib-text-input [label]="t().postalCode" [value]="addrPostal()" (valueChange)="addrPostal.set($event)" />
            <lib-text-input [label]="t().country" [value]="addrCountry()" (valueChange)="addrCountry.set($event)" />
            <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
              <input type="checkbox" [checked]="addrPrimary()" (change)="addrPrimary.set($any($event.target).checked)" />
              {{ t().primaryAddress }}
            </label>
            @if (addressError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitAddress()">{{ t().saveAddress }}</lib-button>
              <lib-button variant="ghost" (click)="showAddressForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showAddressForm.set(true)">{{ t().addAddress }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().contacts }}</span>
        @for (c of partner().contacts; track c.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] text-text-body">{{ c.name }}</span>
              @if (c.isPrimary) {
                <span class="font-core text-[11px] font-semibold text-primary">{{ t().primary }}</span>
              }
            </div>
            <span class="font-core text-[12px] text-shade-50">{{ c.email }} · {{ c.phone }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noContacts }}</span>
        }
        @if (showContactForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().name" [value]="contactName()" (valueChange)="contactName.set($event)" />
            <lib-text-input [label]="t().email" type="email" [value]="contactEmail()" (valueChange)="contactEmail.set($event)" />
            <lib-text-input [label]="t().phone" [value]="contactPhone()" (valueChange)="contactPhone.set($event)" />
            <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
              <input type="checkbox" [checked]="contactPrimary()" (change)="contactPrimary.set($any($event.target).checked)" />
              {{ t().primaryContact }}
            </label>
            @if (contactError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitContact()">{{ t().saveContact }}</lib-button>
              <lib-button variant="ghost" (click)="showContactForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showContactForm.set(true)">{{ t().addContact }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class PartnerDetailPanel {
  private readonly lang = inject(LangService);

  readonly partner = input.required<Partner>();

  readonly close = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string; taxId: string }>();
  readonly addAddress = output<NewPartnerAddress>();
  readonly addContact = output<NewPartnerContact>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Partner detail' : 'Chi tiết đối tác',
      close: en ? 'Close' : 'Đóng',
      active: en ? 'Active' : 'Hoạt động',
      blocked: en ? 'Blocked' : 'Bị khoá',
      taxId: en ? 'Tax ID' : 'Mã số thuế',
      created: en ? 'Created' : 'Ngày tạo',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name and Tax ID are required.' : 'Cần nhập tên và mã số thuế.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      addresses: en ? 'Addresses' : 'Địa chỉ',
      primary: en ? 'Primary' : 'Chính',
      noAddresses: en ? 'No addresses yet.' : 'Chưa có địa chỉ.',
      line1: en ? 'Line 1' : 'Địa chỉ 1',
      line2: en ? 'Line 2' : 'Địa chỉ 2',
      city: en ? 'City' : 'Thành phố',
      state: en ? 'State' : 'Bang/Tỉnh',
      postalCode: en ? 'Postal code' : 'Mã bưu điện',
      country: en ? 'Country' : 'Quốc gia',
      primaryAddress: en ? 'Primary address' : 'Địa chỉ chính',
      saveAddress: en ? 'Save address' : 'Lưu địa chỉ',
      addAddress: en ? 'Add address' : 'Thêm địa chỉ',
      addressRequired: en ? 'Line 1, City, and Country are required.' : 'Cần nhập địa chỉ 1, thành phố và quốc gia.',
      contacts: en ? 'Contacts' : 'Người liên hệ',
      noContacts: en ? 'No contacts yet.' : 'Chưa có người liên hệ.',
      email: en ? 'Email' : 'Email',
      phone: en ? 'Phone' : 'Điện thoại',
      primaryContact: en ? 'Primary contact' : 'Liên hệ chính',
      saveContact: en ? 'Save contact' : 'Lưu liên hệ',
      addContact: en ? 'Add contact' : 'Thêm liên hệ',
      contactRequired: en ? 'Name, Email, and Phone are required.' : 'Cần nhập tên, email và điện thoại.',
    };
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editTaxId = signal('');
  protected readonly editError = signal<string | null>(null);

  protected readonly showAddressForm = signal(false);
  protected readonly addrLine1 = signal('');
  protected readonly addrLine2 = signal('');
  protected readonly addrCity = signal('');
  protected readonly addrState = signal('');
  protected readonly addrPostal = signal('');
  protected readonly addrCountry = signal('');
  protected readonly addrPrimary = signal(false);
  protected readonly addressError = signal<string | null>(null);

  protected readonly showContactForm = signal(false);
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactPrimary = signal(false);
  protected readonly contactError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.partner();
      this.editing.set(false);
      this.editError.set(null);
      this.showAddressForm.set(false);
      this.addressError.set(null);
      this.showContactForm.set(false);
      this.contactError.set(null);
    });
  }

  protected startEdit(): void {
    this.editName.set(this.partner().name);
    this.editTaxId.set(this.partner().taxId);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    const taxId = this.editTaxId().trim();
    if (!name || !taxId) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({ name, taxId });
  }

  protected submitAddress(): void {
    const line1 = this.addrLine1().trim();
    const city = this.addrCity().trim();
    const country = this.addrCountry().trim();
    if (!line1 || !city || !country) {
      this.addressError.set(this.t().addressRequired);
      return;
    }
    this.addAddress.emit({
      line1,
      line2: this.addrLine2().trim(),
      city,
      state: this.addrState().trim(),
      postalCode: this.addrPostal().trim(),
      country,
      isPrimary: this.addrPrimary(),
    });
  }

  protected submitContact(): void {
    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const phone = this.contactPhone().trim();
    if (!name || !email || !phone) {
      this.contactError.set(this.t().contactRequired);
      return;
    }
    this.addContact.emit({ name, email, phone, isPrimary: this.contactPrimary() });
  }
}
