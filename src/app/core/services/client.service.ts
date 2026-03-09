import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ClientCreateRequest, ClientResponse, ClientPatchRequest } from '../models/user.model';
import { API_CONFIG, getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  constructor(private http: HttpClient) {}

  /**
   * Créer un nouveau client
   * @param clientData Données du client à créer
   * @returns Observable<ClientResponse>
   */
  createClient(clientData: ClientCreateRequest): Observable<ClientResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.CREATE);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Validation côté client avant l'envoi
    this.validateClientData(clientData);

    return this.http.post<ClientResponse>(url, clientData, { headers }).pipe(
      map(response => {
        console.log('Client créé avec succès', response);
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la création du client:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer tous les clients
   * @returns Observable<ClientResponse[]>
   */
  getAllClients(): Observable<ClientResponse[]> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.GET_ALL);
    return this.http.get<ClientResponse[]>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des clients:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer le client authentifié
   * @returns Observable<ClientResponse>
   */
  getMe(): Observable<ClientResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.ME);
    return this.http.get<ClientResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du client authentifié:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer un client par ID
   * @param id ID du client
   * @returns Observable<ClientResponse>
   */
  getClientById(id: number): Observable<ClientResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.GET_BY_ID(id));
    return this.http.get<ClientResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du client:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**   * Mettre à jour partiellement le profil du client authentifié
   * @param data Données à mettre à jour
   * @returns Observable<ClientResponse>
   */
  patchMe(data: ClientPatchRequest): Observable<ClientResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.PATCH_ME);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.patch<ClientResponse>(url, data, { headers }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer les clients créés pour une demande de création de compte approuvée
   * @param accountRequestId ID de la demande de création de compte
   * @returns Observable<ClientResponse[]>
   */
  getClientsByAccountRequest(accountRequestId: number): Observable<ClientResponse[]> {
    const url = getApiUrl(`/clients/by-account-request/${accountRequestId}`);
    return this.http.get<ClientResponse[]>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des clients liés:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**   * Validation des données du client
   * @param data Données à valider
   */
  private validateClientData(data: ClientCreateRequest): void {
    if (!data.emailAddress || !this.isValidEmail(data.emailAddress)) {
      throw new Error('Adresse email invalide');
    }

    if (!data.password || data.password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (data.password !== data.confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }

    if (!data.phoneNumber || !this.isValidPhoneNumber(data.phoneNumber)) {
      throw new Error('Numéro de téléphone invalide');
    }

    if (data.nbEmployee < 0) {
      throw new Error('Le nombre d\'employés ne peut pas être négatif');
    }
  }

  /**
   * Validation de l'email
   * @param email Email à valider
   * @returns boolean
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validation du numéro de téléphone
   * @param phone Numéro à valider
   * @returns boolean
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Gestion des erreurs HTTP
   * @param error Erreur HTTP
   * @returns Error
   */
  private handleError(error: any): Error {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier les informations saisies.';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous connecter.';
          break;
        case 403:
          errorMessage = 'Accès interdit.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée.';
          break;
        case 409:
          errorMessage = 'Un compte avec cet email existe déjà.';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    return new Error(errorMessage);
  }
}
