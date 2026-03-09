import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard pour protéger les routes admin
 * Vérifie à la fois l'authentification dans le contexte admin ET le rôle ADMIN
 * Gère correctement les sessions partagées entre onglets
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérifier si l'utilisateur est authentifié dans le contexte 'admin'
  // Note: On vérifie TOUJOURS le contexte 'admin' explicitement, même si le contexte actuel est différent
  const isAuthenticatedAdmin = authService.isAuthenticated('admin');

  // Vérifier si l'utilisateur a le rôle admin dans le contexte 'admin'
  // ⚠️ IMPORTANT: Passer explicitement le contexte 'admin' pour vérifier les rôles dans ce contexte
  const hasAdminRole = authService.isAdmin('admin');

  // Si l'utilisateur a un token admin et le rôle admin, tout est OK
  if (isAuthenticatedAdmin && hasAdminRole) {
    // S'assurer que le contexte est bien défini sur 'admin'
    authService.setContext('admin');
    return true;
  }

  // Sinon, rediriger vers la page de login
  router.navigate(['/admin/login']);
  return false;
};

/**
 * Guard pour la page de login admin
 * Redirige vers le dashboard admin si l'utilisateur est déjà connecté
 */
export const adminLoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticatedAdmin = authService.isAuthenticated('admin');
  const hasAdminRole = authService.isAdmin('admin');

  // Si l'admin est déjà authentifié, le rediriger vers son dashboard
  if (isAuthenticatedAdmin && hasAdminRole) {
    authService.setContext('admin');
    router.navigate(['/admin/dashboard']);
    return false;
  }

  return true;
};
