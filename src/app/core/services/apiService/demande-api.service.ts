import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG, getApiUrl } from '../../config/api.config';
import { DemandeResponse } from '../../models/demande.model';

interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DemandeApiService {
  constructor(private http: HttpClient) {}

  getAllDemandes(): Observable<DemandeResponse[]> {
    return this.http
      .get<PageResponse<DemandeResponse> | DemandeResponse[]>(
        getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.GET_ALL)
      )
      .pipe(
        map(response => Array.isArray(response) ? response : response.content ?? [])
      );
  }

  getDemandeById(id: number): Observable<DemandeResponse> {
    return this.http.get<DemandeResponse>(
      getApiUrl(API_CONFIG.ENDPOINTS.DEMANDES.GET_BY_ID(id))
    );
  }
}
