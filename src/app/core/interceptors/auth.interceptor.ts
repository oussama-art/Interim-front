import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Intercepteur HTTP simplifié
 * - Ajoute automatiquement le token JWT aux requêtes
 * - Le refresh token est géré DIRECTEMENT par Keycloak (pas par le backend)
 * - keycloak-angular appelle directement l'endpoint /token de Keycloak
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // URLs publiques qui ne nécessitent pas d'authentification
  const publicUrls = [
    '/auth/login',
    '/clients/create',
    '/admins/create',
    '/candidates/create'
  ];

  const isPublicUrl = publicUrls.some(url => req.url.includes(url));

  if (!isPublicUrl) {
    // ========== Gestion Token Backend (Admins) ==========
    const backendToken = authService.getAuthToken();

    if (backendToken) {
      const clonedReq = req.clone({
        setHeaders: { Authorization: `Bearer ${backendToken}` }
      });

      return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // En cas d'erreur 401, tenter de rafraîchir le token backend
          if (error.status === 401 && authService.getAuthRefreshToken()) {
            return from(authService.refreshBackendToken()).pipe(
              switchMap(response => {
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${response.access_token}` }
                });
                return next(retryReq);
              }),
              catchError(() => {
                authService.logout();
                router.navigate(['/admin/login']);
                return throwError(() => error);
              })
            );
          }
          return throwError(() => error);
        })
      );
    }

    // ========== Gestion Token Keycloak (Clients/Candidats) ==========
    if (authService.isLoggedIn()) {
      return from(authService.getToken()).pipe(
        switchMap(token => {
          const clonedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          });

          return next(clonedReq).pipe(
            catchError((error: HttpErrorResponse) => {
              // En cas d'erreur 401, refresh AUTOMATIQUE via Keycloak
              if (error.status === 401) {
                console.log('🔄 Token expiré, refresh automatique via Keycloak...');

                // refreshToken() appelle keycloak.updateToken() DIRECTEMENT
                // Keycloak communique avec son propre endpoint /token
                return from(authService.refreshToken(5)).pipe(
                  switchMap(refreshed => {
                    if (refreshed) {
                      console.log('✅ Token rafraîchi avec succès');
                      // Récupérer le nouveau token
                      return from(authService.getToken()).pipe(
                        switchMap(newToken => {
                          const retryReq = req.clone({
                            setHeaders: { Authorization: `Bearer ${newToken}` }
                          });
                          return next(retryReq);
                        })
                      );
                    } else {
                      console.error('❌ Refresh échoué');
                      authService.logout();
                      router.navigate(['/login']);
                      return throwError(() => error);
                    }
                  }),
                  catchError((refreshError) => {
                    console.error('❌ Erreur refresh:', refreshError);
                    authService.logout();
                    router.navigate(['/login']);
                    return throwError(() => error);
                  })
                );
              }
              return throwError(() => error);
            })
          );
        })
      );
    }
  }

  // URLs publiques : pas de modification
  return next(req);
};
