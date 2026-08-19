import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen items-center justify-center bg-shell-canvas' },
  template: `<div #mount></div>`,
})
export class Login implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  @ViewChild('mount', { static: true }) private readonly mountRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.auth.mountSignIn(this.mountRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.auth.unmountSignIn(this.mountRef.nativeElement);
  }
}
