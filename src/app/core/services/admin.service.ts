import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { ClientResponse, CandidateResponse } from '../models/user.model';
import { DemandeResponse } from '../models/demande.model';

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

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN.STATS));
  }

  // Clients Management
  getAllClients(): Observable<ClientResponse[]> {
    return this.http.get<ClientResponse[]>(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN.CLIENTS));
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
}
