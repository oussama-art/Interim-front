import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, firstValueFrom, Observable, tap, catchError, throwError } from 'rxjs';
import { LoginRequest, TokenResponse } from '../models/auth.models';
import { API_CONFIG } from '../config/api.config';

export type AppContext = 'admin' | 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * Clé pour stocker le contexte actuel dans le storage
   */
  private readonly CONTEXT_STORAGE_KEY = 'app_current_context';

  /**
   * BehaviorSubject pour gérer le contexte de manière réactive
   * Permet aux composants de s'abonner aux changements de contexte
   */
  private contextSubject = new BehaviorSubject<AppContext>('user');

  /**
   * Observable exposé publiquement pour que les composants puissent observer les changements de contexte
   */
  public readonly context$ = this.contextSubject.asObservable();

  /**
   * Interval pour le rafraîchissement automatique du token
   */
  private tokenRefreshInterval: any = null;

  /**
   * Obtenir le contexte actuel de manière synchrone
   */
  getCurrentContext(): AppContext {
    return this.contextSubject.value;
  }

  /**
   * Définir le contexte de manière explicite
   * Cette méthode doit être appelée lors de la connexion
   */
  setContext(context: AppContext): void {
    this.contextSubject.next(context);
    this.secureStorage.setItem(this.CONTEXT_STORAGE_KEY, context);
    this.secureLog(`Contexte défini sur: ${context}`);
  }

  /**
   * Obtenir la clé avec préfixe selon le contexte
   */
  private getKey(baseKey: string, forceContext?: AppContext): string {
    const context = forceContext || this.getCurrentContext();
    return `${context}_${baseKey}`;
  }

  constructor(
    private keycloak: KeycloakService,
    private router: Router,
    private http: HttpClient
  ) {
    // Restaurer le contexte depuis le storage au démarrage
    this.restoreContext();

    // Écouter les événements de storage pour synchroniser les sessions entre onglets
    this.setupStorageSync();
  }

  /**
   * Configuration de la synchronisation entre onglets
   * Détecte les déconnexions ou changements de contexte dans d'autres onglets
   */
  private setupStorageSync(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        // Détecter la suppression du contexte (déconnexion dans un autre onglet)
        if (event.key === this.CONTEXT_STORAGE_KEY && event.newValue === null) {
          this.secureLog('🔄 Déconnexion détectée dans un autre onglet');
          this.contextSubject.next('user');

          // Si on est sur une route admin, rediriger vers login admin
          if (this.router.url.includes('/admin/')) {
            this.router.navigate(['/admin/login']);
          } else if (this.router.url.includes('/app/')) {
            this.router.navigate(['/login']);
          }
        }

        // Détecter le changement de contexte dans un autre onglet
        if (event.key === this.CONTEXT_STORAGE_KEY && event.newValue) {
          const newContext = event.newValue as AppContext;
          if (newContext === 'admin' || newContext === 'user') {
            this.secureLog(`🔄 Changement de contexte détecté: ${newContext}`);
            this.contextSubject.next(newContext);
          }
        }

        // Détecter la suppression du token admin (déconnexion admin dans un autre onglet)
        if (event.key === 'admin_access_token' && event.newValue === null) {
          this.secureLog('🔄 Déconnexion admin détectée dans un autre onglet');
          if (this.router.url.includes('/admin/')) {
            this.router.navigate(['/admin/login']);
          }
        }
      });
    }
  }

  /**
   * Restaurer le contexte depuis le storage
   * Appelé au démarrage de l'application
   */
  private restoreContext(): void {
    const savedContext = this.secureStorage.getItem(this.CONTEXT_STORAGE_KEY) as AppContext | null;

    if (savedContext && (savedContext === 'admin' || savedContext === 'user')) {
      this.contextSubject.next(savedContext);
      this.secureLog(`Contexte restauré: ${savedContext}`);

      // ⚠️ NE PAS démarrer le refresh automatique ici pour éviter la dépendance circulaire
      // L'intercepteur HTTP se chargera du refresh lors de la première requête
      // Le refresh est démarré plus tard via startTokenRefreshDelayed()
      if (this.isAuthenticated(savedContext)) {
        this.secureLog('Session active détectée, le token sera rafraîchi lors de la première requête');
      }
    } else {
      // Par défaut, utiliser le contexte 'user'
      this.setContext('user');
    }
  }

  /**
   * Stockage sécurisé - utilise localStorage pour partager la session entre les onglets
   * Permet une expérience utilisateur cohérente sur toute l'application
   */
  private secureStorage = localStorage;

  /**
   * Logger sécurisé - ne log que en développement
   */
  private secureLog(message: string, ...args: any[]): void {
    // Logs désactivés pour réduire le bruit en console
    // if (!environment.production) {
    //   console.log(message, ...args);
    // }
  }

  /**
   * Connexion avec email/password via le backend
   * IMPORTANT: Définit également le contexte de l'application
   * Les tokens Keycloak sont récupérés via le backend puis injectés dans Keycloak
   */
  loginWithCredentials(credentials: LoginRequest, context?: AppContext): Observable<TokenResponse> {
    const loginUrl = `${environment.apiUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`;
    const ctx = context || this.getCurrentContext();

    // Définir le contexte AVANT la connexion pour assurer la cohérence
    if (context) {
      this.setContext(context);
    }

    return this.http.post<TokenResponse>(loginUrl, credentials).pipe(
      tap((response) => {
        // Injecter les tokens DANS l'instance Keycloak
        const keycloakInstance = this.keycloak.getKeycloakInstance();
        keycloakInstance.token = response.access_token;
        keycloakInstance.refreshToken = response.refresh_token;
        keycloakInstance.tokenParsed = this.parseJwt(response.access_token);
        keycloakInstance.refreshTokenParsed = this.parseJwt(response.refresh_token);

        if (response.expires_in) {
          keycloakInstance.timeSkew = 0;
          const exp = Math.floor(Date.now() / 1000) + response.expires_in;
          if (keycloakInstance.tokenParsed) {
            keycloakInstance.tokenParsed.exp = exp;
          }
        }

        // Sauvegarder aussi dans sessionStorage pour backup
        this.secureStorage.setItem(this.getKey('access_token', ctx), response.access_token);
        this.secureStorage.setItem(this.getKey('refresh_token', ctx), response.refresh_token);
        this.secureStorage.setItem(this.getKey('backend_auth', ctx), 'true'); // Marquer comme auth backend

        if (response.expires_in) {
          const expiryTime = Date.now() + (response.expires_in * 1000);
          this.secureStorage.setItem(this.getKey('token_expiry', ctx), expiryTime.toString());
        }

        this.secureLog(`✅ Tokens Keycloak injectés depuis backend pour ${ctx}`);

        // Démarrer le rafraîchissement automatique du token
        this.startTokenRefresh();
      })
    );
  }

  /**
   * Vérifier si l'utilisateur est authentifié via le backend (password grant)
   */
  isBackendAuthenticated(context?: AppContext): boolean {
    const ctx = context || this.getCurrentContext();
    return this.secureStorage.getItem(this.getKey('backend_auth', ctx)) === 'true';
  }

  /**
   * Vérifier si le token est expiré
   */
  private isTokenExpired(context?: AppContext): boolean {
    const expiryTime = this.secureStorage.getItem(this.getKey('token_expiry', context));
    if (!expiryTime) return true;

    // Ajouter une marge de 30 secondes pour éviter les race conditions
    return Date.now() >= (parseInt(expiryTime) - 30000);
  }

  /**
   * Vérifier si l'utilisateur est authentifié dans le contexte spécifié
   * Vérifie : token backend OU Keycloak actif
   */
  isAuthenticated(context?: AppContext): boolean {
    const ctx = context || this.getCurrentContext();
    const hasBackendToken = !!this.secureStorage.getItem(this.getKey('access_token', ctx));
    const isKeycloakActive = this.isLoggedIn();

    return hasBackendToken || isKeycloakActive;
  }

  /**
   * Récupérer le token d'authentification (backend)
   * ⚠️ Ne nettoie PAS les tokens expirés - laisse l'intercepteur gérer le refresh
   */
  getAuthToken(context?: AppContext): string | null {
    const ctx = context || this.getCurrentContext();
    const token = this.secureStorage.getItem(this.getKey('access_token', ctx));

    // ⚠️ Ne PAS nettoyer les tokens ici, l'intercepteur gère le refresh en cas de 401
    // if (token && this.isTokenExpired(ctx)) {
    //   this.clearBackendTokens(ctx);
    //   return null;
    // }

    return token;
  }

  /**
   * Récupérer le refresh token (backend)
   */
  getAuthRefreshToken(context?: AppContext): string | null {
    const ctx = context || this.getCurrentContext();
    return this.secureStorage.getItem(this.getKey('refresh_token', ctx));
  }

  /**
   * Rafraîchir le token d'authentification
   * - Via Backend si authentification password grant
   * - Via Keycloak directement si authentification OAuth (Google)
   */
  refreshBackendToken(context?: AppContext): Observable<TokenResponse> {
    const ctx = context || this.getCurrentContext();
    const isBackendAuth = this.isBackendAuthenticated(ctx);

    if (isBackendAuth) {
      // ✅ Authentification via backend → Refresh via backend
      const refreshToken = this.getAuthRefreshToken(ctx);
      if (!refreshToken) {
        console.error('❌ [REFRESH TOKEN] Aucun refresh token disponible');
        return throwError(() => new Error('Aucun refresh token disponible'));
      }

      const refreshUrl = `${environment.apiUrl}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`;

      return this.http.post<TokenResponse>(refreshUrl, { refresh_token: refreshToken }).pipe(
        tap((response) => {
          // Injecter les nouveaux tokens dans Keycloak
          const keycloakInstance = this.keycloak.getKeycloakInstance();
          keycloakInstance.token = response.access_token;
          keycloakInstance.refreshToken = response.refresh_token;
          keycloakInstance.tokenParsed = this.parseJwt(response.access_token);
          keycloakInstance.refreshTokenParsed = this.parseJwt(response.refresh_token);

          if (response.expires_in) {
            keycloakInstance.timeSkew = 0;
            const exp = Math.floor(Date.now() / 1000) + response.expires_in;
            if (keycloakInstance.tokenParsed) {
              keycloakInstance.tokenParsed.exp = exp;
            }
          }

          // Mettre à jour sessionStorage
          this.secureStorage.setItem(this.getKey('access_token', ctx), response.access_token);
          this.secureStorage.setItem(this.getKey('refresh_token', ctx), response.refresh_token);

          if (response.expires_in) {
            const expiryTime = Date.now() + (response.expires_in * 1000);
            this.secureStorage.setItem(this.getKey('token_expiry', ctx), expiryTime.toString());
          }
        }),
        catchError(error => {
          console.error('❌ [REFRESH TOKEN] Erreur refresh Backend:', error);
          this.clearBackendTokens(ctx);
          return throwError(() => error);
        })
      );
    } else {
      // ✅ Authentification via OAuth → Refresh via Keycloak
      return new Observable<TokenResponse>(observer => {
        this.keycloak.getKeycloakInstance().updateToken(30)
          .then((refreshed) => {
            if (refreshed) {
              const keycloakInstance = this.keycloak.getKeycloakInstance();
              const accessToken = keycloakInstance.token;
              const refreshToken = keycloakInstance.refreshToken;

              if (accessToken && refreshToken) {
                // Mettre à jour sessionStorage
                this.secureStorage.setItem(this.getKey('access_token', ctx), accessToken);
                this.secureStorage.setItem(this.getKey('refresh_token', ctx), refreshToken);

                const tokenParsed = keycloakInstance.tokenParsed;
                if (tokenParsed && tokenParsed.exp) {
                  const expiryTime = tokenParsed.exp * 1000;
                  this.secureStorage.setItem(this.getKey('token_expiry', ctx), expiryTime.toString());
                }

                observer.next({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  expires_in: tokenParsed?.exp ? tokenParsed.exp - Math.floor(Date.now() / 1000) : 300
                });
                observer.complete();
              } else {
                console.error('❌ [REFRESH TOKEN] Tokens manquants après refresh');
                this.clearBackendTokens(ctx);
                observer.error(new Error('Tokens manquants après refresh'));
              }
            } else {
              // Token toujours valide
              const keycloakInstance = this.keycloak.getKeycloakInstance();
              const accessToken = keycloakInstance.token;
              const refreshToken = keycloakInstance.refreshToken;

              if (accessToken && refreshToken) {
                observer.next({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  expires_in: 300
                });
                observer.complete();
              } else {
                observer.error(new Error('Tokens non disponibles'));
              }
            }
          })
          .catch((error) => {
            console.error('❌ [REFRESH TOKEN] Erreur refresh Keycloak:', error);
            this.clearBackendTokens(ctx);
            observer.error(error);
          });
      });
    }
  }

  /**
   * Supprimer les tokens backend
   */
  clearBackendTokens(context?: AppContext): void {
    const ctx = context || this.getCurrentContext();
    this.secureStorage.removeItem(this.getKey('access_token', ctx));
    this.secureStorage.removeItem(this.getKey('refresh_token', ctx));
    this.secureStorage.removeItem(this.getKey('token_expiry', ctx));
    this.secureStorage.removeItem(this.getKey('backend_auth', ctx));
    this.secureStorage.removeItem(this.getKey('login_context', ctx));
    this.secureLog('Tokens backend supprimés');
  }

  /**
   * Connexion avec Google via Keycloak
   */
  loginWithGoogle(userType: 'candidate' | 'client' | 'admin'): void {
    this.secureLog(`=== LOGIN GOOGLE: ${userType.toUpperCase()} ===`);
    this.saveLastUrl(this.router.url);

    // Définir le contexte basé sur le type d'utilisateur
    const context: AppContext = userType === 'admin' ? 'admin' : 'user';
    this.setContext(context);

    // 🔥 Sauvegarder le rôle sélectionné avant la redirection (correspond à l'enum backend)
    let selectedRole: string;
    let redirectUri: string;

    if (userType === 'candidate') {
      selectedRole = 'CANDIDATE';
      redirectUri = window.location.origin + '/app/dashboard';
    } else if (userType === 'client') {
      selectedRole = 'CLIENT_COMPANY';
      redirectUri = window.location.origin + '/app/dashboard';
    } else {
      selectedRole = 'ADMIN';
      redirectUri = window.location.origin + '/admin/dashboard';
    }

    this.secureLog('Contexte défini:', context);
    this.secureLog('Rôle sélectionné:', selectedRole);
    this.secureLog('Redirection après login:', redirectUri);

    sessionStorage.setItem('selectedRole', selectedRole);
    sessionStorage.setItem('targetRedirectUri', redirectUri);
    // Sauvegarder aussi le contexte pour le retour OAuth
    sessionStorage.setItem('oauth_context', context);
    this.secureLog('Rôle, redirectUri et contexte sauvegardés dans sessionStorage');

    this.keycloak.login({
      idpHint: 'google',
      redirectUri: redirectUri
    });
  }

  /**
   * Connexion standard (email/password via Keycloak)
   */
  login(): void {
    this.saveLastUrl(this.router.url);
    // 🔥 Rediriger vers /app/dashboard après authentification
    this.keycloak.login({
      redirectUri: window.location.origin + '/app/dashboard'
    });
  }

  /**
   * Démarrer le rafraîchissement automatique du token
   * Rafraîchit le token toutes les 4 minutes (avant expiration de 5 min)
   */
  startTokenRefresh(): void {
    // Arrêter tout interval existant
    this.stopTokenRefresh();

    // Rafraîchir immédiatement au démarrage
    this.refreshToken(30).catch(err => {
      console.error('❌ [AUTO-REFRESH] Erreur lors du refresh initial:', err);
    });

    // Rafraîchir toutes les 4 minutes (240000 ms)
    // Les tokens Keycloak expirent généralement après 5 minutes
    this.tokenRefreshInterval = setInterval(() => {
      this.refreshToken(30).then(refreshed => {
      }).catch(err => {
        console.error('❌ [AUTO-REFRESH] Erreur lors du refresh automatique:', err);
        console.error('❌ [AUTO-REFRESH] Session expirée, déconnexion nécessaire');

        // Si le refresh échoue, arrêter les tentatives et déconnecter
        this.stopTokenRefresh();
        this.logout();
      });
    }, 4 * 60 * 1000); // 4 minutes
  }

  /**
   * Arrêter le rafraîchissement automatique du token
   */
  stopTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Déconnexion
   * Appelle l'endpoint backend pour invalider le refresh token
   */
  logout(redirectTo?: string): void {
    const ctx = this.getCurrentContext();
    const refreshToken = this.getAuthRefreshToken(ctx);

    // Appeler l'endpoint backend pour invalider le refresh token
    if (refreshToken) {
      const logoutUrl = `${environment.apiUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`;
      this.http.post<{ message: string }>(logoutUrl, { refresh_token: refreshToken })
        .subscribe({
          next: (response) => {
            this.completeLogout(ctx, redirectTo);
          },
          error: (error) => {
            console.error('❌ [LOGOUT] Erreur lors de l\'invalidation du token:', error);
            // Même en cas d'erreur, on continue la déconnexion côté client
            this.completeLogout(ctx, redirectTo);
          }
        });
    } else {
      // Pas de refresh token, déconnexion directe
      this.completeLogout(ctx, redirectTo);
    }
  }

  /**
   * Compléter la déconnexion côté client
   */
  private completeLogout(ctx: AppContext, redirectTo?: string): void {
    // Arrêter le rafraîchissement automatique du token
    this.stopTokenRefresh();

    // Nettoyer les tokens backend de manière sécurisée
    this.clearBackendTokens(ctx);
    this.clearLoginContext(ctx);
    const lastUrlKey = this.getKey('last_url', ctx);
    localStorage.removeItem(lastUrlKey);

    // Supprimer le contexte pour notifier les autres onglets via storage event
    this.secureStorage.removeItem(this.CONTEXT_STORAGE_KEY);

    // Réinitialiser le contexte à 'user' par défaut (sans le sauvegarder dans storage)
    this.contextSubject.next('user');

    // Si l'utilisateur est connecté via Keycloak
    if (this.keycloak.isLoggedIn()) {
      const redirectUri = redirectTo
        ? `${window.location.origin}${redirectTo}`
        : window.location.origin;
      this.keycloak.logout(redirectUri);
    } else {
      // Sinon, redirection simple
      this.router.navigate([redirectTo || '/login']);
    }
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return this.keycloak.isLoggedIn();
  }

  /**
   * Récupérer le token
   */
  async getToken(): Promise<string> {
    const keycloakToken = await this.keycloak.getToken();
    const backendToken = this.getAuthToken();

    // Priorité 1: Token Keycloak (injecté ou OAuth)
    if (keycloakToken) {
      return keycloakToken;
    }

    // Priorité 2: Token backend stocké
    if (backendToken) {
      return backendToken;
    }

    return '';
  }

  /**
   * Parser un JWT token
   */
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Erreur parsing JWT:', e);
      return null;
    }
  }

  /**
   * Récupérer le refresh token
   */
  getRefreshToken(): string | undefined {
    return this.keycloak.getKeycloakInstance().refreshToken;
  }

  /**
   * Récupérer l'access token (synchrone)
   */
  getAccessToken(): string | undefined {
    return this.keycloak.getKeycloakInstance().token;
  }

  /**
   * Récupérer les informations complètes du token
   */
  getTokenInfo(): {
    token?: string;
    refreshToken?: string;
    idToken?: string;
    tokenParsed?: any;
    refreshTokenParsed?: any;
    idTokenParsed?: any;
  } {
    const keycloakInstance = this.keycloak.getKeycloakInstance();
    return {
      token: keycloakInstance.token,
      refreshToken: keycloakInstance.refreshToken,
      idToken: keycloakInstance.idToken,
      tokenParsed: keycloakInstance.tokenParsed,
      refreshTokenParsed: keycloakInstance.refreshTokenParsed,
      idTokenParsed: keycloakInstance.idTokenParsed
    };
  }

  /**
   * Forcer le rafraîchissement du token
   * Utilise la bonne méthode selon le type d'authentification
   */
  async refreshToken(minValidity: number = 5): Promise<boolean> {
    try {
      const ctx = this.getCurrentContext();
      const isBackendAuth = this.isBackendAuthenticated(ctx);

      if (isBackendAuth) {
        // ✅ Authentification backend → Refresh via backend endpoint
        const result = await firstValueFrom(this.refreshBackendToken(ctx));
        return !!result.access_token;
      } else {
        // ✅ Authentification OAuth → Refresh via Keycloak direct
        return await this.keycloak.getKeycloakInstance().updateToken(minValidity);
      }
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      return false;
    }
  }

  /**
   * Décoder un JWT token de manière sécurisée
   * ⚠️ Ne vérifie PAS l'expiration - permet d'extraire les rôles même d'un token expiré
   * Le refresh sera géré par l'intercepteur lors de la première requête
   */
  private decodeToken(token: string): any {
    try {
      // Valider le format du token
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        this.secureLog('Format de token invalide');
        return null;
      }

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decoded = JSON.parse(jsonPayload);

      // ⚠️ NE PAS vérifier l'expiration ici !
      // Cela permet au guard de vérifier les rôles même avec un token expiré
      // L'intercepteur HTTP se chargera du refresh automatique lors de la première requête

      return decoded;
    } catch (error) {
      this.secureLog('Erreur lors du décodage du token');
      return null;
    }
  }

  /**
   * Récupérer les rôles depuis le token backend
   */
  private getRolesFromBackendToken(context?: AppContext): string[] {
    const token = this.getAuthToken(context);
    if (!token) return [];

    const decoded = this.decodeToken(token);
    if (!decoded) return [];

    // Les rôles sont dans realm_access.roles
    return decoded.realm_access?.roles || [];
  }

  /**
   * Récupérer tous les rôles de l'utilisateur (Keycloak ou Backend)
   */
  getUserRoles(context?: AppContext): string[] {
    // Priorité 1: Token backend
    const backendToken = this.getAuthToken(context);
    if (backendToken) {
      return this.getRolesFromBackendToken(context);
    }

    // Priorité 2: Token Keycloak
    if (this.isLoggedIn()) {
      return this.keycloak.getUserRoles();
    }

    return [];
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   * @param role Le rôle à vérifier
   * @param context Le contexte dans lequel vérifier (optionnel, utilise le contexte actuel si non spécifié)
   */
  hasRole(role: string, context?: AppContext): boolean {
    const ctx = context || this.getCurrentContext();

    // Priorité 1: Token backend depuis localStorage
    const backendToken = this.getAuthToken(ctx);
    if (backendToken) {
      const roles = this.getRolesFromBackendToken(ctx);
      return roles.includes(role) || roles.includes(`ROLE_${role}`);
    }

    // Priorité 2: Token Keycloak injecté (depuis localStorage aussi)
    if (this.isLoggedIn()) {
      const keycloakInstance = this.keycloak.getKeycloakInstance();

      // Extraire les rôles du token JWT directement
      if (keycloakInstance.tokenParsed) {
        const tokenRoles = keycloakInstance.tokenParsed.realm_access?.roles || [];
        return tokenRoles.includes(role) || tokenRoles.includes(`ROLE_${role}`);
      }

      // Fallback: utiliser isUserInRole de Keycloak
      return this.keycloak.isUserInRole(role);
    }

    return false;
  }

  /**
   * Vérifier si l'utilisateur est un admin
   * @param context Le contexte dans lequel vérifier (optionnel, utilise le contexte actuel si non spécifié)
   */
  isAdmin(context?: AppContext): boolean {
    return this.hasRole('ADMIN', context) || this.hasRole('ROLE_ADMIN', context);
  }

  /**
   * Vérifier si l'utilisateur est un client
   * @param context Le contexte dans lequel vérifier (optionnel, utilise le contexte actuel si non spécifié)
   */
  isClient(context?: AppContext): boolean {
    return this.hasRole('CLIENT_COMPANY', context) || this.hasRole('CLIENT', context) || this.hasRole('ROLE_CLIENT', context);
  }

  /**
   * Vérifier si l'utilisateur est un candidat
   */
  isCandidate(): boolean {
    return this.hasRole('CANDIDATE') || this.hasRole('ROLE_CANDIDATE');
  }

  /**
   * Définir le contexte de connexion (alias pour setContext pour rétro-compatibilité)
   * @deprecated Utiliser setContext à la place
   */
  setLoginContext(context: AppContext): void {
    this.setContext(context);
    this.secureLog('Contexte de connexion défini:', context);
  }

  /**
   * Récupérer le contexte de connexion
   * @deprecated Utiliser getCurrentContext à la place
   */
  getLoginContext(context?: AppContext): AppContext {
    return this.getCurrentContext();
  }

  /**
   * Vérifier si l'utilisateur est dans le contexte admin
   */
  isInAdminContext(): boolean {
    return this.getCurrentContext() === 'admin';
  }

  /**
   * Vérifier si l'utilisateur est dans le contexte utilisateur
   */
  isInUserContext(): boolean {
    return this.getCurrentContext() === 'user';
  }

  /**
   * Effacer le contexte de connexion
   */
  clearLoginContext(context?: AppContext): void {
    const ctx = context || this.getCurrentContext();
    this.secureStorage.removeItem(this.getKey('login_context', ctx));
    // Réinitialiser le contexte à 'user' par défaut
    this.setContext('user');
  }

  /**
   * Récupérer le rôle principal de l'utilisateur
   */
  getUserRole(): string | null {
    if (this.isAdmin()) return 'ADMIN';
    if (this.isClient()) return 'CLIENT';
    if (this.isCandidate()) return 'CANDIDATE';
    return null;
  }

  /**
   * Récupérer le profil utilisateur
   */
  async getUserProfile(): Promise<KeycloakProfile> {
    return this.keycloak.loadUserProfile();
  }

  /**
   * Récupérer l'ID de l'utilisateur
   */
  getUserId(): string | undefined {
    return this.keycloak.getKeycloakInstance().subject;
  }

  /**
   * 🔥 Vérifier et initialiser l'utilisateur Google après authentification
   */
  async checkAndSetupGoogleUser(): Promise<void> {
    try {
      this.secureLog('=== VÉRIFICATION GOOGLE USER ===');

      // Vérifier s'il y a un rôle en attente dans sessionStorage
      const selectedRole = sessionStorage.getItem('selectedRole');
      const oauthContext = sessionStorage.getItem('oauth_context') as 'admin' | 'user' | null;
      this.secureLog('Rôle dans sessionStorage:', selectedRole);
      this.secureLog('Contexte OAuth:', oauthContext);

      // Définir le contexte de connexion en fonction du rôle sélectionné
      if (oauthContext) {
        this.setLoginContext(oauthContext);
        this.secureLog(`✅ Contexte défini: ${oauthContext}`);
      } else if (selectedRole === 'ADMIN') {
        this.setLoginContext('admin');
        this.secureLog('✅ Contexte défini: admin');
      } else if (selectedRole === 'CANDIDATE' || selectedRole === 'CLIENT_COMPANY') {
        this.setLoginContext('user');
        this.secureLog('✅ Contexte défini: user');
      }

      if (selectedRole) {
        // Vérifier si l'utilisateur a déjà un rôle
        const existingRoles = this.getUserRoles();
        this.secureLog('Rôles existants:', existingRoles);

        // Vérifier si l'utilisateur a déjà un rôle CLIENT ou CANDIDATE
        const hasClient = existingRoles.some(r =>
          r === 'CLIENT' || r === 'CLIENT_COMPANY' || r === 'ROLE_CLIENT' || r === 'ROLE_CLIENT_COMPANY'
        );
        const hasCandidate = existingRoles.some(r =>
          r === 'CANDIDATE' || r === 'ROLE_CANDIDATE'
        );
        const hasAdmin = existingRoles.some(r =>
          r === 'ADMIN' || r === 'ROLE_ADMIN'
        );

        // Si l'utilisateur a déjà un rôle
        if (hasClient || hasCandidate || hasAdmin) {
          let existingRoleType = '';
          if (hasClient) existingRoleType = 'CLIENT';
          else if (hasCandidate) existingRoleType = 'CANDIDATE';
          else if (hasAdmin) existingRoleType = 'ADMIN';

          // Normaliser le rôle sélectionné pour la comparaison
          const normalizedSelectedRole = selectedRole.replace('CLIENT_COMPANY', 'CLIENT');

          // Si le rôle existant est différent du rôle sélectionné
          if (existingRoleType !== normalizedSelectedRole) {
            this.secureLog(`Conflit de rôle: existant=${existingRoleType}, sélectionné=${normalizedSelectedRole}`);

            // Nettoyer les données
            sessionStorage.removeItem('selectedRole');
            sessionStorage.removeItem('targetRedirectUri');
            sessionStorage.removeItem('oauth_context');
            const ctx = oauthContext || (selectedRole === 'ADMIN' ? 'admin' : 'user');
            this.clearLoginContext(ctx);

            // Déconnecter l'utilisateur
            await this.keycloak.logout(window.location.origin + '/login?error=role_conflict&existing=' + existingRoleType.toLowerCase());
            return;
          }

          // Si c'est le même rôle, l'utilisateur est déjà configuré
          this.secureLog(`Utilisateur déjà configuré avec le rôle ${existingRoleType}`);

          sessionStorage.removeItem('selectedRole');
          sessionStorage.removeItem('oauth_context');

          const targetRedirectUri = sessionStorage.getItem('targetRedirectUri');
          sessionStorage.removeItem('targetRedirectUri');

          if (targetRedirectUri) {
            window.location.href = targetRedirectUri;
          } else {
            this.redirectToLastUrlOrDashboard();
          }
          return;
        }

        // L'utilisateur n'a pas encore de rôle, on peut l'attribuer
        this.secureLog(`Rôle trouvé: ${selectedRole} - Attribution en cours...`);
        await this.assignRoleToUser(selectedRole);
      } else {
        this.secureLog('Pas de rôle en attente (utilisateur déjà configuré ou connexion classique)');

        // Si pas de contexte défini, le définir en fonction du rôle actuel
        const currentContext = this.getCurrentContext();
        if (!this.getLoginContext(currentContext)) {
          if (this.isAdmin()) {
            this.setLoginContext('admin');
          } else if (this.isClient() || this.isCandidate()) {
            this.setLoginContext('user');
          }
        }
      }
    } catch (error) {
      this.secureLog('Erreur lors de la vérification');
      // Ne pas exposer les détails de l'erreur en production
      if (!environment.production) {
        console.error(error);
      }
    }
  }


  private async assignRoleToUser(role: string): Promise<void> {
    try {
      this.secureLog(`=== ATTRIBUTION DU RÔLE: ${role} ===`);

      // Récupérer le token pour l'authentification
      const token = await this.getToken();
      this.secureLog('Token récupéré:', token ? 'OK' : 'MANQUANT');

      // Appeler le backend pour attribuer le rôle
      this.secureLog(`Appel API: POST ${environment.apiUrl}/auth/complete-google-login`);
      this.secureLog('Body:', { role });

      const response = await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/auth/complete-google-login`,
          { role },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      this.secureLog('Réponse API reçue');

      // Récupérer le contexte
      const oauthContext = sessionStorage.getItem('oauth_context') as 'admin' | 'user' | null;
      const context = oauthContext || (role === 'ADMIN' ? 'admin' : 'user');
      this.secureLog(`Contexte: ${context}`);

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('selectedRole');
      sessionStorage.removeItem('oauth_context');
      this.secureLog('SessionStorage nettoyé');

      // Forcer le rafraîchissement du token pour obtenir les nouveaux rôles
      this.secureLog('Rafraîchissement du token...');
      try {
        await this.keycloak.updateToken(9999);
        this.secureLog('Token rafraîchi');
      } catch (error) {
        this.secureLog('Échec du refresh token, continuera au reload');
      }

      // Récupérer la redirectUri cible et rediriger
      const targetRedirectUri = sessionStorage.getItem('targetRedirectUri');
      sessionStorage.removeItem('targetRedirectUri');

      if (targetRedirectUri) {
        this.secureLog('Redirection vers:', targetRedirectUri);
        window.location.href = targetRedirectUri;
      } else {
        this.secureLog('Rechargement de la page...');
        window.location.reload();
      }

    } catch (error: any) {
      this.secureLog('Erreur lors de l\'attribution du rôle');

      // Ne pas exposer les détails de l'erreur en production
      if (!environment.production) {
        console.error('Détails:', error);
      }

      // Nettoyer le sessionStorage même en cas d'erreur
      sessionStorage.removeItem('selectedRole');

      throw error;
    }
  }

  /**
   * Sauvegarder la dernière URL visitée
   */
  saveLastUrl(url: string): void {
    if (url && url !== '/login' && url !== '/register' && !url.includes('/auth/callback')) {
      const key = this.getKey('last_url');
      localStorage.setItem(key, url);
    }
  }

  /**
   * Récupérer la dernière URL visitée
   */
  getLastUrl(): string | null {
    const key = this.getKey('last_url');
    return localStorage.getItem(key);
  }

  /**
   * Rediriger vers la dernière URL ou le dashboard
   */
  redirectToLastUrlOrDashboard(): void {
    const lastUrl = this.getLastUrl();
    if (lastUrl && lastUrl !== '/login' && lastUrl !== '/register') {
      this.router.navigateByUrl(lastUrl);
      const lastUrlKey = this.getKey('last_url');
      localStorage.removeItem(lastUrlKey);
    } else {
      if (this.isAdmin()) {
        this.router.navigate(['/admin/dashboard']);
      } else {
        // 🔥 Correction: rediriger vers /app/dashboard au lieu de /dashboard
        this.router.navigate(['/app/dashboard']);
      }
    }
  }
}
