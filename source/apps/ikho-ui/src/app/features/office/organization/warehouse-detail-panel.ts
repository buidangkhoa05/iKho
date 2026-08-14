import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Warehouse } from '../../../core/mock-data/organization.data';

@Component({
  selector: 'app-warehouse-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ warehouse().name }}</span>
          <span class="font-mono text-[13px] text-primary">{{ warehouse().code }}</span>
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

      <lib-status-badge [status]="warehouse().isActive ? 'in-stock' : 'out-of-stock'" [label]="warehouse().isActive ? t().active : t().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="editing.set(false)">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().company }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ companyName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().created }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouse().createdOnUtc.slice(0, 10) }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ warehouse().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().zones }}</span>
        @for (z of warehouse().zones; track z.code) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ z.name }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ z.code }}</span>
            </div>
            <button
              type="button"
              [attr.data-zone-toggle]="z.code"
              class="cursor-pointer rounded-md border border-hairline-light bg-transparent px-2 py-1 font-core text-[11px] font-semibold text-shade-60 hover:bg-surface-elevated-light"
              (click)="toggleZoneStatus.emit({ zoneCode: z.code, isActive: !z.isActive })"
            >
              {{ z.isActive ? t().deactivate : t().activate }}
            </button>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noZones }}</span>
        }
        @if (showZoneForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().code" [value]="zoneCode()" (valueChange)="zoneCode.set($event)" />
            <lib-text-input [label]="t().name" [value]="zoneName()" (valueChange)="zoneName.set($event)" />
            @if (zoneError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitZone()">{{ t().saveZone }}</lib-button>
              <lib-button variant="ghost" (click)="cancelZone()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showZoneForm.set(true)">{{ t().addZone }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().docks }}</span>
        @for (d of warehouse().docks; track d.code) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ d.name }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ d.code }}</span>
            </div>
            <button
              type="button"
              [attr.data-dock-toggle]="d.code"
              class="cursor-pointer rounded-md border border-hairline-light bg-transparent px-2 py-1 font-core text-[11px] font-semibold text-shade-60 hover:bg-surface-elevated-light"
              (click)="toggleDockStatus.emit({ dockCode: d.code, isActive: !d.isActive })"
            >
              {{ d.isActive ? t().deactivate : t().activate }}
            </button>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noDocks }}</span>
        }
        @if (showDockForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().code" [value]="dockCode()" (valueChange)="dockCode.set($event)" />
            <lib-text-input [label]="t().name" [value]="dockName()" (valueChange)="dockName.set($event)" />
            @if (dockError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitDock()">{{ t().saveDock }}</lib-button>
              <lib-button variant="ghost" (click)="cancelDock()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showDockForm.set(true)">{{ t().addDock }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class WarehouseDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  readonly warehouse = input.required<Warehouse>();
  readonly companyName = input.required<string>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string }>();
  readonly addZone = output<{ code: string; name: string }>();
  readonly toggleZoneStatus = output<{ zoneCode: string; isActive: boolean }>();
  readonly addDock = output<{ code: string; name: string }>();
  readonly toggleDockStatus = output<{ dockCode: string; isActive: boolean }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Warehouse detail' : 'Chi tiết kho',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      company: en ? 'Company' : 'Công ty',
      created: en ? 'Created' : 'Ngày tạo',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      code: en ? 'Code' : 'Mã',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name is required.' : 'Cần nhập tên.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      zones: en ? 'Zones' : 'Khu',
      noZones: en ? 'No zones yet.' : 'Chưa có khu.',
      saveZone: en ? 'Save zone' : 'Lưu khu',
      addZone: en ? 'Add zone' : 'Thêm khu',
      zoneRequired: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
      docks: en ? 'Docks' : 'Cửa kho',
      noDocks: en ? 'No docks yet.' : 'Chưa có cửa kho.',
      saveDock: en ? 'Save dock' : 'Lưu cửa kho',
      addDock: en ? 'Add dock' : 'Thêm cửa kho',
      dockRequired: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
    };
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editError = signal<string | null>(null);

  protected readonly showZoneForm = signal(false);
  protected readonly zoneCode = signal('');
  protected readonly zoneName = signal('');
  protected readonly zoneError = signal<string | null>(null);

  protected readonly showDockForm = signal(false);
  protected readonly dockCode = signal('');
  protected readonly dockName = signal('');
  protected readonly dockError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected warehouse changes AND after any successful save
    // for this warehouse — the store's immutable updates give warehouse() a new object
    // identity on every mutation, so a save "closes" its own form as a side effect.
    effect(() => {
      this.warehouse();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
      this.showZoneForm.set(false);
      this.zoneError.set(null);
      this.zoneCode.set('');
      this.zoneName.set('');
      this.showDockForm.set(false);
      this.dockError.set(null);
      this.dockCode.set('');
      this.dockName.set('');
    });
  }

  protected startEdit(): void {
    this.editName.set(this.warehouse().name);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({ name });
  }

  protected submitZone(): void {
    const code = this.zoneCode().trim();
    const name = this.zoneName().trim();
    if (!code || !name) {
      this.zoneError.set(this.t().zoneRequired);
      return;
    }
    this.addZone.emit({ code, name });
  }

  protected cancelZone(): void {
    this.showZoneForm.set(false);
    this.zoneCode.set('');
    this.zoneName.set('');
    this.zoneError.set(null);
  }

  protected submitDock(): void {
    const code = this.dockCode().trim();
    const name = this.dockName().trim();
    if (!code || !name) {
      this.dockError.set(this.t().dockRequired);
      return;
    }
    this.addDock.emit({ code, name });
  }

  protected cancelDock(): void {
    this.showDockForm.set(false);
    this.dockCode.set('');
    this.dockName.set('');
    this.dockError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate code) for the open "edit details" form. */
  setDetailsError(message: string): void {
    this.editError.set(message);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate code) for the open "add zone" form. */
  setZoneError(message: string): void {
    this.zoneError.set(message);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate code) for the open "add dock" form. */
  setDockError(message: string): void {
    this.dockError.set(message);
  }
}
