import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopBar } from './shared/layouts/app-top-bar/app-top-bar';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppTopBar],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
