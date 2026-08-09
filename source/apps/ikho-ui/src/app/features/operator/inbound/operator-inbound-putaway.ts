import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { InboundStore } from '../../../core/state/inbound-store';

@Component({
  selector: 'app-operator-inbound-putaway',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!task()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-4 rounded-lg bg-canvas-operator-elevated p-6">
          <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="font-mono text-xs text-shade-40">{{ task()!.id }}</span>
            <span class="font-core text-2xl font-bold text-on-primary">{{ task()!.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ task()!.fromDock }} → {{ task()!.toBin }} · {{ task()!.qty }} {{ unitsLabel() }}</span>
          </div>
        </div>
        <lib-text-input [label]="binLabel()" [value]="binInput()" (valueChange)="binInput.set($event)" />
        <lib-button variant="operator" [fullWidth]="true" (click)="confirm()">{{ confirmLabel() }}</lib-button>
      </div>
    }
  `,
})
export class OperatorInboundPutaway {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  readonly taskId = input.required<string>();

  protected readonly task = computed(() => this.store.putawayTasks().find((t) => t.id === this.taskId()));

  protected readonly binInput = linkedSignal(() => this.task()?.toBin ?? '');

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Putaway task not found' : 'Không tìm thấy nhiệm vụ cất kho'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly binLabel = computed(() => (this.lang.lang() === 'en' ? 'Putaway bin' : 'Ô kệ cất hàng'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm putaway' : 'Xác nhận cất kho'));

  protected confirm(): void {
    this.store.confirmPutaway(this.taskId(), this.binInput());
    this.router.navigate(['/operator/inbound']);
  }
}
