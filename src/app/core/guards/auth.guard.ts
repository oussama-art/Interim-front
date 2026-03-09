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
 * Guard pour les routes publiques (login, register, company-registration)
 * Redirige vers dashboard si l'utilisateur est déjà connecté dans le bon contexte
 */
export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérifier si l'utilisateur (non-admin) est déjà authentifié
  if (authService.isAuthenticated('user')) {
    // S'assurer que le contexte est correctement défini
    authService.setContext('user');
    router.navigate(['/app/dashboard']);
    return false;
  }

  return true;
};
