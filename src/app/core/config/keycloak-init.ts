import { KeycloakService } from 'keycloak-angular';
import { environment } from '../../../environments/environment';

/**
 * Fonction pour parser un JWT
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Restaurer les tokens depuis localStorage après un reload
 * Vérifie les deux contextes (user et admin) et restaure celui qui est actif
 */
function restoreTokensFromStorage(keycloakInstance: any): void {
  try {
    // Déterminer le contexte actuel
    const currentContext = localStorage.getItem('app_current_context') || 'user';
    const contextPrefix = currentContext === 'admin' ? 'admin_' : 'user_';

    // Récupérer les tokens depuis localStorage
    const accessToken = localStorage.getItem(`${contextPrefix}access_token`);
    const refreshToken = localStorage.getItem(`${contextPrefix}refresh_token`);

    // Si des tokens existent, les injecter dans Keycloak
    if (accessToken && refreshToken) {
      keycloakInstance.token = accessToken;
      keycloakInstance.refreshToken = refreshToken;
      keycloakInstance.tokenParsed = parseJwt(accessToken);
      keycloakInstance.refreshTokenParsed = parseJwt(refreshToken);

      // ✅ CRITIQUE: Définir le flag authenticated sur true
      // Sans cela, isLoggedIn() retournera false même avec des tokens valides
      keycloakInstance.authenticated = true;

      // Vérifier si le token est encore valide
      if (keycloakInstance.tokenParsed) {
        const exp = keycloakInstance.tokenParsed.exp;
        const now = Math.floor(Date.now() / 1000);

        if (exp && exp <= now) {
          // ⚠️ NE PAS mettre authenticated = false ici!
          // Le token sera rafraîchi automatiquement lors de la première requête
          // Garder authenticated = true pour permettre au guard de passer
          // et laisser l'intercepteur gérer le refresh
        }
      }
    }
  } catch (error) {
    console.error('❌ [KEYCLOAK RESTORE] Erreur lors de la restauration des tokens:', error);
  }
}

export function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId,
      },
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      },
      enableBearerInterceptor: true,
      bearerPrefix: 'Bearer',
      shouldUpdateToken: (request) => {
        // Don't add token to Keycloak's own endpoints
        return !request.url.includes('/realms/');
      },
    }).then(() => {
      // Configurer les callbacks pour gérer l'expiration du token
      const keycloakInstance = keycloak.getKeycloakInstance();

      // ✅ RESTAURER LES TOKENS DEPUIS LOCALSTORAGE APRÈS LE RELOAD
      // Cela permet de maintenir la session même après une recompilation
      restoreTokensFromStorage(keycloakInstance);

      // Callback appelé quand le token expire
      keycloakInstance.onTokenExpired = () => {
        keycloakInstance.updateToken(30)
          .then((refreshed) => {
            // Token rafraîcht ou toujours valide
          })
          .catch(() => {
            console.error('❌ [KEYCLOAK] Impossible de rafraîchir le token');
            // La déconnexion sera gérée par l'intercepteur ou le service auth
          });
      };

      // Callback appelé après un rafraîchissement réussi
      keycloakInstance.onAuthRefreshSuccess = () => {
        // Token rafraîcht avec succès
      };

      // Callback appelé après un échec de rafraîchissement
      keycloakInstance.onAuthRefreshError = () => {
        // Échec du refresh
      };
    });
}
