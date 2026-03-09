import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CandidateCreateRequest, CandidateResponse, CandidatePatchRequest } from '../models/user.model';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { PageResponse } from '../models/offer.model';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {

  constructor(private http: HttpClient) {}

  /**
   * Créer un nouveau candidat
   * @param candidateData Données du candidat à créer
   * @returns Observable<CandidateResponse>
   */
  createCandidate(candidateData: CandidateCreateRequest): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.CREATE);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Validation côté client avant l'envoi
    this.validateCandidateData(candidateData);

    return this.http.post<CandidateResponse>(url, candidateData, { headers }).pipe(
      map(response => {
        console.log('Candidat créé avec succès', response);
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la création du candidat:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer tous les candidats
   * @returns Observable<CandidateResponse[]>
   */
  getAllCandidates(): Observable<CandidateResponse[]> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.GET_ALL);
    return this.http.get<CandidateResponse[]>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des candidats:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer les candidats avec pagination
   * @param page Numéro de page (0-based)
   * @param size Taille de la page
   * @returns Observable<PageResponse<CandidateResponse>>
   */
  getCandidatesPage(page: number = 0, size: number = 10): Observable<PageResponse<CandidateResponse>> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.PAGE);
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<CandidateResponse>>(url, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des candidats paginés:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer un candidat par son ID
   * @param id ID du candidat
   * @returns Observable<CandidateResponse>
   */
  getCandidateById(id: number): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.GET_BY_ID(id));
    return this.http.get<CandidateResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du candidat:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer le candidat authentifié
   * DÉSACTIVÉ - Keycloak retiré pour les candidats
   */
  /*
  getMe(): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.ME);
    return this.http.get<CandidateResponse>(url).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du candidat authentifié:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }
  */

  /**
   * Mettre à jour partiellement le profil du candidat authentifié
   * DÉSACTIVÉ - Keycloak retiré pour les candidats
   */
  /*
  patchMe(data: CandidatePatchRequest): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.PATCH_ME);
    return this.http.patch<CandidateResponse>(url, data).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour du candidat:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }
  */

  /**
   * Récupérer les candidats disponibles pour une période donnée (Admin)
   * @param startDate Date de début
   * @param endDate Date de fin
   * @returns Observable<CandidateResponse[]>
   */
  getAvailableCandidates(startDate: string, endDate: string): Observable<CandidateResponse[]> {
    const url = getApiUrl('/candidates/available');
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<CandidateResponse[]>(url, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des candidats disponibles:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validation des données du candidat
   * @param data Données à valider
   */
  private validateCandidateData(data: CandidateCreateRequest): void {
    if (!data.emailAddress || !this.isValidEmail(data.emailAddress)) {
      throw new Error('Adresse email invalide');
    }

    if (data.experienceYear < 0) {
      throw new Error('L\'expérience ne peut pas être négative');
    }
  }

  /**
   * Créer un candidat à partir de l'upload de son CV
   * @param formData FormData contenant firstName, lastName, professional et cv
   * @returns Observable<CandidateResponse>
   */
  uploadCandidateWithCV(formData: FormData): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.UPLOAD_CV);

    return this.http.post<CandidateResponse>(url, formData).pipe(
      map(response => {
        console.log('Candidat créé avec succès via upload CV', response);
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de l\'upload du CV:', error);
        // Retourner directement l'erreur HTTP sans la transformer
        // pour que le ErrorHandlerService puisse extraire le message du backend
        return throwError(() => error);
      })
    );
  }

  /**
   * Mettre à jour un candidat par son ID (Admin)
   * @param id ID du candidat
   * @param data Données à mettre à jour
   * @returns Observable<CandidateResponse>
   */
  updateCandidateById(id: number, data: CandidatePatchRequest): Observable<CandidateResponse> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.UPDATE(id));
    return this.http.patch<CandidateResponse>(url, data).pipe(
      map(response => {
        console.log('Candidat mis à jour avec succès', response);
        return response;
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du candidat:', error);
        return throwError(() => error);
      })
    );
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
   * Gestion des erreurs HTTP
   * @param error Erreur HTTP
   * @returns Error
   */
  private handleError(error: any): Error {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier les informations saisies.';
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
