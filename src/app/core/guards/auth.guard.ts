import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard pour protéger les routes nécessitant une authentification utilisateur (non-admin)
 * Les admins doivent se connecter via /login pour accéder au dashboard utilisateur
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérifier si l'utilisateur est authentifié dans le contexte 'user'
  if (!authService.isAuthenticated('user')) {
    authService.saveLastUrl(state.url);
    router.navigate(['/login']);
    return false;
  }

  return true;
};

/**
 * Guard pour les routes publiques (login, register)
 * Redirige vers dashboard si l'utilisateur est déjà connecté dans le bon contexte
 */
export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Déterminer le contexte en fonction de l'URL
  // Note: Cette détection basée sur l'URL est acceptable ICI car c'est juste pour
  // déterminer où rediriger l'utilisateur déjà connecté, pas pour gérer l'état
  const isAdminRoute = state.url.includes('/admin');
  const context = isAdminRoute ? 'admin' : 'user';

  // Vérifier si l'utilisateur est déjà authentifié dans CE contexte
  if (authService.isAuthenticated(context)) {
    // S'assurer que le contexte est correctement défini
    authService.setContext(context);

    if (context === 'admin') {
      router.navigate(['/admin/dashboard']);
    } else {
      router.navigate(['/app/dashboard']);
    }
    return false;
  }

  return true;
};
