import { Component, computed, input } from '@angular/core';
import { ICONS } from './icon-paths';

@Component({
  selector: 'lib-icon',
  host: { class: 'inline-flex leading-none' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="color()"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (el of elements(); track $index) {
        @switch (el.tag) {
          @case ('path') {
            <path [attr.d]="el.d" />
          }
          @case ('circle') {
            <circle [attr.cx]="el.cx" [attr.cy]="el.cy" [attr.r]="el.r" />
          }
          @case ('line') {
            <line [attr.x1]="el.x1" [attr.y1]="el.y1" [attr.x2]="el.x2" [attr.y2]="el.y2" />
          }
          @case ('rect') {
            <rect [attr.x]="el.x" [attr.y]="el.y" [attr.width]="el.width" [attr.height]="el.height" [attr.rx]="el.rx" />
          }
          @case ('polyline') {
            <polyline [attr.points]="el.points" />
          }
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input<number>(20);
  readonly strokeWidth = input<number>(1.5);
  readonly color = input<string>('currentColor');

  readonly elements = computed(() => ICONS[this.name()] ?? ICONS['package']);
}
