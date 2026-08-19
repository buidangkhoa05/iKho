import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const signOutAndRedirect = (error: unknown) => {
    void auth.signOut().then(() => router.navigateByUrl('/login'));
    return throwError(() => error);
  };

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authedReq).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          return from(auth.getToken(true)).pipe(
            switchMap((freshToken) => {
              if (!freshToken) {
                return signOutAndRedirect(error);
              }
              const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } });
              return next(retryReq).pipe(
                catchError((retryError: unknown) => {
                  if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                    return signOutAndRedirect(retryError);
                  }
                  return throwError(() => retryError);
                }),
              );
            }),
          );
        }),
      );
    }),
  );
};
