import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, firstValueFrom, Observable, tap } from 'rxjs';
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
    } else {
      // Par défaut, utiliser le contexte 'user'
      this.setContext('user');
    }
  }

  /**
   * Stockage sécurisé - utilise sessionStorage au lieu de localStorage
   */
  private secureStorage = sessionStorage;

  /**
   * Logger sécurisé - ne log que en développement
   */
  private secureLog(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }

  /**
   * Connexion avec email/password via le backend
   * IMPORTANT: Définit également le contexte de l'application
   */
  loginWithCredentials(credentials: LoginRequest, context?: AppContext): Observable<TokenResponse> {
    const loginUrl = `${environment.apiUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`;
    const ctx = context || this.getCurrentContext();

    // Définir le contexte AVANT la connexion pour assurer la cohérence
    if (context) {
      this.setContext(context);
    }

    return this.http.post<TokenResponse>(loginUrl, credentials).pipe(
      tap(response => {
        // Sauvegarder les tokens dans sessionStorage avec préfixe
        this.secureStorage.setItem(this.getKey('access_token', ctx), response.access_token);
        this.secureStorage.setItem(this.getKey('refresh_token', ctx), response.refresh_token);

        // Calculer et sauvegarder l'heure d'expiration
        if (response.expires_in) {
          const expiryTime = Date.now() + (response.expires_in * 1000);
          this.secureStorage.setItem(this.getKey('token_expiry', ctx), expiryTime.toString());
        }

        this.secureLog(`Tokens ${ctx} sauvegardés de manière sécurisée`);
      })
    );
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
   * IMPORTANT: Vérifie le token backend OU le marqueur Keycloak du contexte
   * Si aucun contexte n'est fourni, utilise le contexte actuel
   */
  isAuthenticated(context?: AppContext): boolean {
    const ctx = context || this.getCurrentContext();
    const hasBackendToken = !!this.secureStorage.getItem(this.getKey('access_token', ctx));
    const hasKeycloakMarker = this.secureStorage.getItem(this.getKey('keycloak_authenticated', ctx)) === 'true';

    if (hasBackendToken && this.isTokenExpired(ctx)) {
      // Token expiré, nettoyer
      this.clearBackendTokens(ctx);
      return hasKeycloakMarker && this.isLoggedIn();
    }

    // Vérifier le token backend OU (Keycloak actif ET marqueur pour ce contexte)
    return hasBackendToken || (hasKeycloakMarker && this.isLoggedIn());
  }

  /**
   * Récupérer le token d'authentification (backend)
   */
  getAuthToken(context?: AppContext): string | null {
    const ctx = context || this.getCurrentContext();
    const token = this.secureStorage.getItem(this.getKey('access_token', ctx));

    // Vérifier l'expiration avant de retourner le token
    if (token && this.isTokenExpired(ctx)) {
      this.clearBackendTokens(ctx);
      return null;
    }

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
   * Rafraîchir le token d'authentification backend
   */
  refreshBackendToken(context?: AppContext): Observable<TokenResponse> {
    const ctx = context || this.getCurrentContext();
    const refreshToken = this.getAuthRefreshToken(ctx);

    if (!refreshToken) {
      throw new Error('Aucun refresh token disponible');
    }

    const refreshUrl = `${environment.apiUrl}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`;

    return this.http.post<TokenResponse>(refreshUrl, { refresh_token: refreshToken }).pipe(
      tap(response => {
        // Mettre à jour les tokens
        this.secureStorage.setItem(this.getKey('access_token', ctx), response.access_token);
        this.secureStorage.setItem(this.getKey('refresh_token', ctx), response.refresh_token);

        // Mettre à jour l'heure d'expiration
        if (response.expires_in) {
          const expiryTime = Date.now() + (response.expires_in * 1000);
          this.secureStorage.setItem(this.getKey('token_expiry', ctx), expiryTime.toString());
        }

        this.secureLog(`Token ${ctx} rafraîchi avec succès`);
      })
    );
  }

  /**
   * Nettoyer les tokens backend du storage pour un contexte spécifique
   */
  private clearBackendTokens(context?: AppContext): void {
    const ctx = context || this.getCurrentContext();
    this.secureStorage.removeItem(this.getKey('access_token', ctx));
    this.secureStorage.removeItem(this.getKey('refresh_token', ctx));
    this.secureStorage.removeItem(this.getKey('token_expiry', ctx));
    this.secureStorage.removeItem(this.getKey('login_context', ctx));
    this.secureStorage.removeItem(this.getKey('keycloak_authenticated', ctx));
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
   * Déconnexion
   */
  logout(redirectTo?: string): void {
    const ctx = this.getCurrentContext();
    
    // Nettoyer les tokens backend de manière sécurisée
    this.clearBackendTokens(ctx);
    this.clearLoginContext(ctx);
    const lastUrlKey = this.getKey('last_url', ctx);
    localStorage.removeItem(lastUrlKey);

    // Réinitialiser le contexte à 'user' par défaut
    this.setContext('user');

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
    return this.keycloak.getToken();
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
   */
  async refreshToken(minValidity: number = 5): Promise<boolean> {
    try {
      return await this.keycloak.getKeycloakInstance().updateToken(minValidity);
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      return false;
    }
  }

  /**
   * Décoder un JWT token de manière sécurisée
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

      // Vérifier l'expiration du token
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        this.secureLog('Token expiré');
        return null;
      }

      return decoded;
    } catch (error) {
      this.secureLog('Erreur lors du décodage du token');
      return null;
    }
  }

  /**
   * Récupérer les rôles depuis le token backend
   */
  private getRolesFromBackendToken(): string[] {
    const token = this.getAuthToken();
    if (!token) return [];

    const decoded = this.decodeToken(token);
    if (!decoded) return [];

    // Les rôles sont dans realm_access.roles
    return decoded.realm_access?.roles || [];
  }

  /**
   * Récupérer tous les rôles de l'utilisateur (Keycloak ou Backend)
   */
  getUserRoles(): string[] {
    // Priorité 1: Token backend
    const backendToken = this.getAuthToken();
    if (backendToken) {
      return this.getRolesFromBackendToken();
    }

    // Priorité 2: Token Keycloak
    if (this.isLoggedIn()) {
      return this.keycloak.getUserRoles();
    }

    return [];
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    // Priorité 1: Token backend
    const backendToken = this.getAuthToken();
    if (backendToken) {
      const roles = this.getRolesFromBackendToken();
      return roles.includes(role) || roles.includes(`ROLE_${role}`);
    }

    // Priorité 2: Token Keycloak
    if (this.isLoggedIn()) {
      return this.keycloak.isUserInRole(role);
    }

    return false;
  }

  /**
   * Vérifier si l'utilisateur est un admin
   */
  isAdmin(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('ROLE_ADMIN');
  }

  /**
   * Vérifier si l'utilisateur est un client
   */
  isClient(): boolean {
    return this.hasRole('CLIENT_COMPANY') || this.hasRole('CLIENT') || this.hasRole('ROLE_CLIENT');
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

          // Marquer que Keycloak est authentifié pour ce contexte
          const ctx = oauthContext || (existingRoleType === 'ADMIN' ? 'admin' : 'user');
          this.secureStorage.setItem(this.getKey('keycloak_authenticated', ctx), 'true');

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

      // Récupérer le contexte pour sauvegarder le marqueur Keycloak
      const oauthContext = sessionStorage.getItem('oauth_context') as 'admin' | 'user' | null;
      const context = oauthContext || (role === 'ADMIN' ? 'admin' : 'user');

      // Marquer que Keycloak est authentifié pour ce contexte
      this.secureStorage.setItem(this.getKey('keycloak_authenticated', context), 'true');
      this.secureLog(`Marqueur Keycloak défini pour contexte: ${context}`);

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
