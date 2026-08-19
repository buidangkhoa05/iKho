import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen items-center justify-center bg-shell-canvas' },
  template: `<div #mount></div>`,
})
export class Login implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('mount', { static: true }) private readonly mountRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    const redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl') ?? undefined;
    this.auth.mountSignIn(this.mountRef.nativeElement, redirectUrl);
  }

  ngOnDestroy(): void {
    this.auth.unmountSignIn(this.mountRef.nativeElement);
  }
}
