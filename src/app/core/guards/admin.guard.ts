import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard pour protéger les routes admin
 * Vérifie à la fois l'authentification dans le contexte admin ET le rôle ADMIN
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérifier si l'utilisateur est authentifié dans le contexte 'admin'
  if (!authService.isAuthenticated('admin')) {
    router.navigate(['/admin/login']);
    return false;
  }

  // Vérifier si l'utilisateur a le rôle admin
  if (!authService.isAdmin()) {
    router.navigate(['/admin/login']);
    return false;
  }

  // S'assurer que le contexte est bien défini sur 'admin'
  authService.setContext('admin');

  return true;
};
