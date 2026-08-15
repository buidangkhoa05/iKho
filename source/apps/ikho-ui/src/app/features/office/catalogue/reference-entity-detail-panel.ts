import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';

export interface ReferenceEntity {
  code: string;
  name: string;
  isActive: boolean;
}

export interface ReferenceEntityLabels {
  eyebrow: string;
  name: string;
  save: string;
  cancel: string;
  edit: string;
  active: string;
  inactive: string;
  activate: string;
  deactivate: string;
  close: string;
  requiredError: string;
}

@Component({
  selector: 'app-reference-entity-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ labels().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ entity().code }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ entity().name }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="labels().close"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="entity().isActive ? 'in-stock' : 'out-of-stock'" [label]="entity().isActive ? labels().active : labels().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="labels().name" [value]="editName()" (valueChange)="editName.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ labels().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelEdit()">{{ labels().cancel }}</lib-button>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="startEdit()">{{ labels().edit }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ entity().isActive ? labels().deactivate : labels().activate }}
      </lib-button>
    </aside>
  `,
})
export class ReferenceEntityDetailPanel {
  readonly entity = input.required<ReferenceEntity>();
  readonly labels = input.required<ReferenceEntityLabels>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string }>();

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected entity changes AND after any successful save for it —
    // the store's immutable updates give entity() a new object identity on every mutation, so a
    // save "closes" its own edit form as a side effect.
    effect(() => {
      this.entity();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
    });
  }

  protected startEdit(): void {
    this.editName.set(this.entity().name);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.labels().requiredError);
      return;
    }
    this.saveDetails.emit({ name });
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.editName.set('');
    this.editError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate code — unreachable on an
   * update since code is immutable, but not-found is reachable if two admins race). */
  setDetailsError(message: string): void {
    this.editError.set(message);
  }
}
