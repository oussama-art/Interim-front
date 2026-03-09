import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { ClientResponse, CandidateResponse } from '../models/user.model';
import { DemandeResponse } from '../models/demande.model';
import { PageResponse } from '../models/offer.model';

export interface DashboardStats {
  totalClients: number;
  totalCandidates: number;
  totalDemandes: number;
  activeDemandes: number;
  pendingDemandes: number;
  completedDemandes: number;
}

export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
  };
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) {}

  // Pas de getDashboardStats() car l'endpoint n'existe pas
  // Les statistiques seront calculées localement dans le composant

  // Clients Management
  getAllClients(page: number = 0, size: number = 10): Observable<PageResponse<ClientResponse>> {
    const params = { page: page.toString(), size: size.toString() };
    return this.http.get<PageResponse<ClientResponse>>(
      getApiUrl(API_CONFIG.ENDPOINTS.ADMIN.CLIENTS),
      { params }
    );
  }

  getClientById(id: number): Observable<ClientResponse> {
    return this.http.get<ClientResponse>(getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.GET_BY_ID(id)));
  }

  updateClient(id: number, data: Partial<ClientResponse>): Observable<ClientResponse> {
    return this.http.patch<ClientResponse>(getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.UPDATE(id)), data);
  }

  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(getApiUrl(API_CONFIG.ENDPOINTS.CLIENTS.DELETE(id)));
  }

  // Candidates Management
  getAllCandidates(): Observable<CandidateResponse[]> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.PAGE);
    const params = new HttpParams().set('page', '0').set('size', '10000');
    return this.http.get<PagedResponse<CandidateResponse>>(url, { params }).pipe(
      map(response => response.content)
    );
  }

  getCandidateById(id: number): Observable<CandidateResponse> {
    return this.http.get<CandidateResponse>(getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.GET_BY_ID(id)));
  }

  updateCandidate(id: number, data: Partial<CandidateResponse>): Observable<CandidateResponse> {
    return this.http.patch<CandidateResponse>(getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.UPDATE(id)), data);
  }

  deleteCandidate(id: number): Observable<void> {
    return this.http.delete<void>(getApiUrl(API_CONFIG.ENDPOINTS.CANDIDATES.DELETE(id)));
  }

  // Demandes Management
  getAllDemandes(): Observable<DemandeResponse[]> {
    return this.http.get<PagedResponse<DemandeResponse>>(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN.DEMANDES))
      .pipe(map(response => response.content));
  }

  getDemandeById(id: number): Observable<DemandeResponse> {
    return this.http.get<DemandeResponse>(getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.GET_BY_ID(id)));
  }

  updateDemande(id: number, data: Partial<DemandeResponse>): Observable<DemandeResponse> {
    return this.http.patch<DemandeResponse>(getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.GET_BY_ID(id)), data);
  }

  deleteDemande(id: number): Observable<void> {
    return this.http.delete<void>(getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.DELETE(id)));
  }

  // Contracts Management
  getAllContracts(): Observable<any[]> {
    // Récupérer tous les contrats via toutes les demandes
    return this.getAllDemandes().pipe(
      switchMap(demandes => {
        if (!demandes || demandes.length === 0) {
          return of([]);
        }

        // Récupérer les contrats pour chaque demande
        const contractRequests = demandes.map(demande =>
          this.http.get<any[]>(`${API_CONFIG.BASE_URL}/contracts/${demande.id}/contracts`).pipe(
            catchError(error => {
              console.error(`Erreur chargement contrats demande ${demande.id}:`, error);
              return of([]);
            })
          )
        );

        // Combiner tous les contrats
        return forkJoin(contractRequests).pipe(
          map(contractArrays => contractArrays.flat())
        );
      })
    );
  }

  // Account Requests Management
  getAllAccountRequests(): Observable<any[]> {
    return this.http.get<any[]>(getApiUrl('/account-requests'));
  }
}
