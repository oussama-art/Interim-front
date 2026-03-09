import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Gère les erreurs HTTP et affiche un message approprié
   * @param error L'erreur HTTP
   * @param customMessage Message personnalisé optionnel (utilisé uniquement si le backend n'envoie pas de message)
   * @returns Le message d'erreur affiché
   */
  handleError(error: any, customMessage?: string): string {
    let message = '';

    // Debug : Afficher la structure complète de l'erreur
    console.log('🔍 [ErrorHandler] Erreur complète:', error);
    console.log('🔍 [ErrorHandler] Type:', error?.constructor?.name);
    console.log('🔍 [ErrorHandler] Status:', error?.status);
    console.log('🔍 [ErrorHandler] error.error:', error?.error);
    console.log('🔍 [ErrorHandler] Type de error.error:', typeof error?.error);

    if (error?.error) {
      console.log('🔍 [ErrorHandler] error.error.message:', error.error.message);
      console.log('🔍 [ErrorHandler] error.error.error:', error.error.error);
    }

    if (error instanceof HttpErrorResponse) {
      // Essayer différentes façons d'extraire le message du backend

      // Cas 1: error.error est un objet avec un champ message
      if (error.error && typeof error.error === 'object' && error.error.message) {
        message = String(error.error.message);
        console.log('✅ [ErrorHandler] Message du backend (objet.message):', message);
      }
      // Cas 2: error.message contient directement le message
      else if (error.message && !error.message.startsWith('Http failure response')) {
        message = String(error.message);
        console.log('✅ [ErrorHandler] Message direct (error.message):', message);
      }
      // Cas 3: error.error est un objet avec un champ error
      else if (error.error && typeof error.error === 'object' && error.error.error) {
        message = String(error.error.error);
        console.log('✅ [ErrorHandler] Message alternatif (objet.error):', message);
      }
      // Cas 4: error.error est une string
      else if (typeof error.error === 'string' && error.error.trim().length > 0) {
        message = error.error;
        console.log('✅ [ErrorHandler] Message string:', message);
      }
      // Cas 5: Essayer de parser error.error si c'est du JSON en string
      else if (typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          if (parsed.message) {
            message = String(parsed.message);
            console.log('✅ [ErrorHandler] Message JSON parsé:', message);
          }
        } catch (e) {
          console.log('⚠️ [ErrorHandler] Impossible de parser error.error comme JSON');
        }
      }

      // Si aucun message du backend n'a été trouvé
      if (!message) {
        console.log('⚠️ [ErrorHandler] Aucun message backend trouvé, utilisation fallback');

        // Priorité 2 : Utiliser le message personnalisé si fourni
        if (customMessage) {
          message = customMessage;
        } else {
          // Priorité 3 : Messages par défaut selon le code HTTP
          switch (error.status) {
            case 0:
              message = '❌ Impossible de se connecter au serveur. Vérifiez votre connexion.';
              break;
            case 400:
              message = '⚠️ Données invalides. Veuillez vérifier les informations saisies.';
              break;
            case 401:
              message = '🔒 Session expirée. Veuillez vous reconnecter.';
              break;
            case 403:
              message = '⛔ Accès refusé. Vous n\'avez pas les autorisations nécessaires.';
              break;
            case 404:
              message = '🔍 Ressource introuvable.';
              break;
            case 409:
              message = '⚠️ Conflit : cette ressource existe déjà ou ne peut pas être modifiée.';
              break;
            case 422:
              message = '⚠️ Données non valides. Veuillez vérifier les informations.';
              break;
            case 500:
              message = '💥 Erreur serveur. Veuillez réessayer plus tard.';
              break;
            case 503:
              message = '🔧 Service temporairement indisponible. Veuillez réessayer.';
              break;
            default:
              message = `❌ Une erreur est survenue (${error.status}).`;
          }
        }
      }
    } else if (error?.message) {
      // Erreurs JavaScript
      message = `❌ ${error.message}`;
    } else {
      message = customMessage || '❌ Une erreur inattendue est survenue.';
    }

    console.log('📢 [ErrorHandler] Message final à afficher:', message);

    // Afficher le message
    this.showError(message);

    return message;
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message: string, duration: number = 5000): void {
    this.snackBar.open(message, 'Fermer', {
      duration,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Affiche un message de succès
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Fermer', {
      duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Affiche un message d'avertissement
   */
  showWarning(message: string, duration: number = 4000): void {
    this.snackBar.open(message, 'Fermer', {
      duration,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Affiche un message d'information
   */
  showInfo(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Fermer', {
      duration,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Vérifie si l'erreur est due à une session expirée
   */
  isSessionExpired(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  /**
   * Vérifie si l'erreur est due à un problème réseau
   */
  isNetworkError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 0;
  }
}
