import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { screenMeta, screenTitle, ScreenId, SCREENS } from '../../../core/mock-data/screens.data';
import { OfficeScreen } from '../../../shared/components/office-screen/office-screen';

type GenericScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inventory' | 'inbound' | 'outbound'>;

@Component({
  selector: 'app-office-generic-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OfficeScreen],
  template: `
    <app-office-screen
      [title]="title()"
      [meta]="meta()"
      [primaryActionLabel]="primaryActionLabel()"
      [kpis]="kpis()"
      [tabs]="tabs()"
    />
  `,
})
export class OfficeGenericScreen {
  private readonly lang = inject(LangService);

  /** Bound from route `data.screenId` via withComponentInputBinding(). */
  readonly screenId = input.required<GenericScreenId>();

  protected readonly title = computed(() => screenTitle(this.screenId(), 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta(this.screenId(), 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS[this.screenId()].action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(ADMIN_SCREENS[this.screenId()].kpis, this.lang.lang()));
  protected readonly tabs = computed(() => resolveTabs(ADMIN_SCREENS[this.screenId()].tabs, this.lang.lang()));
}
