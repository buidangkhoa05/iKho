import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LangService } from '../../../core/i18n/lang.service';
import { screenTitle, ScreenId, SCREENS } from '../../../core/mock-data/screens.data';
import { OperatorOutlinedScreen } from '../../../shared/components/operator-outlined-screen/operator-outlined-screen';

type OutlinedScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inbound' | 'outbound' | 'returns'>;

@Component({
  selector: 'app-operator-outlined-screen-route',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OperatorOutlinedScreen],
  template: `<app-operator-outlined-screen [title]="title()" [bullets]="bullets()" />`,
})
export class OperatorOutlinedScreenRoute {
  private readonly lang = inject(LangService);

  /** Bound from route `data.screenId` via withComponentInputBinding(). */
  readonly screenId = input.required<OutlinedScreenId>();

  protected readonly title = computed(() => screenTitle(this.screenId(), 'operator', this.lang.lang()));
  protected readonly bullets = computed(() => SCREENS[this.screenId()].bullets?.[this.lang.lang()] ?? []);
}
