import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Intercepteur HTTP simplifié et robuste
 *
 * Deux flux d'authentification :
 * 1. Backend login (password grant) : tokens Keycloak récupérés via backend, refresh directement avec Keycloak
 * 2. Keycloak direct (Google OAuth) : tokens gérés par keycloak-angular, refresh via Keycloak
 *
 * Dans les DEUX cas, le refresh se fait DIRECTEMENT avec Keycloak !
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  // Fonction helper pour gérer l'expiration de session
  const handleSessionExpired = (context: 'admin' | 'user') => {
    authService.clearBackendTokens(context);
    const redirectUrl = context === 'admin' ? '/admin/login' : '/login';

    snackBar.open(
      'Votre session a expiré. Veuillez vous reconnecter.',
      'Fermer',
      {
        duration: 5000,
        panelClass: ['warning-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );

    router.navigate([redirectUrl]);
  };

  // URLs publiques qui ne nécessitent pas d'authentification
  const publicUrls = [
    '/auth/login',
    '/auth/refresh',
    '/clients/create',
    '/admins/create',
    '/candidates/create',
    '/account-requests/create',  // ✅ Création de demande de compte entreprise (publique)
    '/account-requests/check-email'  // ✅ Vérification email publique (pour registration)
  ];

  const isPublicUrl = publicUrls.some(url => req.url.includes(url));
  if (isPublicUrl) {
    return next(req);
  }

  const currentContext = authService.getCurrentContext();
  const isAuthenticated = authService.isBackendAuthenticated() || authService.isLoggedIn();

  if (!isAuthenticated) {
    console.error('⛔ [AUTH] Aucune authentification active');
    router.navigate([currentContext === 'admin' ? '/admin/login' : '/login']);
    return throwError(() => new Error('Non authentifié'));
  }

  // ========== Obtenir le token (backend ou Keycloak) ==========
  return from(authService.getToken()).pipe(
    switchMap(token => {
      if (!token) {
        console.error('⛔ [AUTH] Token manquant');
        router.navigate([currentContext === 'admin' ? '/admin/login' : '/login']);
        return throwError(() => new Error('Token manquant'));
      }

      const clonedReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });

      return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            // ========== REFRESH TOUJOURS VIA KEYCLOAK ==========
            return from(authService.refreshToken(5)).pipe(
              switchMap(refreshed => {
                if (refreshed) {
                  return from(authService.getToken()).pipe(
                    switchMap(newToken => {
                      const retryReq = req.clone({
                        setHeaders: { Authorization: `Bearer ${newToken}` }
                      });
                      return next(retryReq);
                    })
                  );
                } else {
                  console.error('❌ [AUTH] Refresh échoué - session expirée');
                  handleSessionExpired(currentContext);
                  return throwError(() => error);
                }
              }),
              catchError(refreshError => {
                console.error('❌ [AUTH] Erreur refresh - session expirée:', refreshError);
                handleSessionExpired(currentContext);
                return throwError(() => refreshError);
              })
            );
          }
          return throwError(() => error);
        })
      );
    })
  );
};
