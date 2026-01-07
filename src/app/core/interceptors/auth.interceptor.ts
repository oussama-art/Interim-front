import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, switchMap, catchError, throwError, BehaviorSubject, filter, take, Observable } from 'rxjs';
import { Router } from '@angular/router';

// Flag pour éviter plusieurs tentatives de refresh simultanées
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Intercepteur HTTP pour ajouter automatiquement le token et gérer le rafraîchissement
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Liste des URLs qui ne nécessitent pas de token
  const publicUrls = [
    '/auth/login',
    '/auth/refresh',
    '/clients/create',
    '/admins/create',
    '/candidates/create'
  ];

  // Vérifier si l'URL est publique
  const isPublicUrl = publicUrls.some(url => req.url.includes(url));

  // Si l'URL n'est pas publique, ajouter le token
  if (!isPublicUrl) {
    // Priorité 1: Token backend
    const backendToken = authService.getAuthToken();
    if (backendToken) {
      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${backendToken}`
        }
      });
      
      return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Si erreur 401, tenter de rafraîchir le token
          if (error.status === 401 && authService.getAuthRefreshToken()) {
            return handleTokenRefresh(authService, router, req, next);
          }
          return throwError(() => error);
        })
      );
    }

    // Priorité 2: Token Keycloak
    if (authService.isLoggedIn()) {
      return from(authService.getToken()).pipe(
        switchMap(token => {
          const clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next(clonedReq);
        })
      );
    }
  }

  return next(req);
};

/**
 * Gestion du rafraîchissement du token
 */
function handleTokenRefresh(
  authService: AuthService,
  router: Router,
  req: any,
  next: any
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshBackendToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.access_token);
        
        // Relancer la requête avec le nouveau token
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${response.access_token}`
          }
        });
        return next(clonedReq);
      }),
      catchError((error) => {
        isRefreshing = false;
        // Si le refresh échoue, déconnecter l'utilisateur
        authService.logout('/login');
        return throwError(() => error);
      })
    );
  } else {
    // Si un refresh est déjà en cours, attendre qu'il se termine
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(clonedReq);
      })
    );
  }
}
