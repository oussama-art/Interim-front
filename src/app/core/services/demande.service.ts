import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { DemandeRequest, DemandeResponse } from '../models/demande.model';

@Injectable({
  providedIn: 'root'
})
export class DemandeService {

  constructor(private http: HttpClient) {}

  /**
   * Créer une nouvelle demande
   * L'authentification est gérée automatiquement par l'intercepteur
   * @param demandeData Données de la demande à créer
   * @returns Observable<DemandeResponse>
   */
  createDemande(demandeData: DemandeRequest): Observable<DemandeResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.CREATE);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<DemandeResponse>(url, demandeData, { headers }).pipe(
      tap(response => {
        console.log('Demande créée avec succès', response);
      }),
      catchError(error => {
        console.error('Erreur lors de la création de la demande:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer toutes les demandes avec pagination
   */
  getAllDemandes(page: number = 0, size: number = 10): Observable<any> {
    const url = getApiUrl(`${API_CONFIG.ENDPOINTS.DEMANDES.GET_ALL}?page=${page}&size=${size}`);
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des demandes:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer les demandes du client authentifié avec pagination
   * L'authentification est gérée automatiquement par l'intercepteur
   */
  getMyDemandes(page: number = 0, size: number = 10): Observable<any> {
    const url = getApiUrl(`${API_CONFIG.ENDPOINTS.CLIENTS.MY_DEMANDES}?page=${page}&size=${size}`);
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des demandes:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer une demande par ID
   */
  getDemandeById(id: number): Observable<DemandeResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.GET_BY_ID(id));
    return this.http.get<DemandeResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération de la demande:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Récupérer les détails d'une demande du client authentifié
   * L'authentification est gérée automatiquement par l'intercepteur
   * @param demandeId ID de la demande
   * @returns Observable<DemandeResponse>
   */
  getMyDemandeDetail(demandeId: number): Observable<DemandeResponse> {
    const url = getApiUrl(`${API_CONFIG.ENDPOINTS.DEMANDES.MY_DEMANDE_DETAIL}?demandeId=${demandeId}`);
    return this.http.get<DemandeResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des détails de la demande:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Modifier une demande existante
   * L'authentification est gérée automatiquement par l'intercepteur
   * @param demandeId ID de la demande à modifier
   * @param demandeData Nouvelles données de la demande
   * @returns Observable<DemandeResponse>
   */
  updateDemande(demandeId: number, demandeData: DemandeRequest): Observable<DemandeResponse> {
    const url = getApiUrl(`${API_CONFIG.ENDPOINTS.DEMANDES.UPDATE}?demandeId=${demandeId}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.patch<DemandeResponse>(url, demandeData, { headers }).pipe(
      tap(response => {
        console.log('Demande modifiée avec succès', response);
      }),
      catchError(error => {
        console.error('Erreur lors de la modification de la demande:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Gestion des erreurs HTTP
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
          errorMessage = error.error?.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Demande non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}`;
      }
    }

    return new Error(errorMessage);
  }
}
