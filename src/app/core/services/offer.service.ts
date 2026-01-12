import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OfferCreateRequest, OfferResponse } from '../models/offer.model';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class OfferService {

  constructor(private http: HttpClient) {}

  /**
   * Créer une nouvelle offre pour un client
   * @param clientId ID du client
   * @param request Données de l'offre
   * @returns Observable<OfferResponse>
   */
  createOffer(clientId: number, request: OfferCreateRequest): Observable<OfferResponse> {
    const url = getApiUrl(`/clients/${clientId}/offers`);
    return this.http.post<OfferResponse>(url, request);
  }

  /**
   * Récupérer toutes les offres d'un client
   * @param clientId ID du client
   * @returns Observable<OfferResponse[]>
   */
  getOffersByClientId(clientId: number): Observable<OfferResponse[]> {
    const url = getApiUrl(`/clients/${clientId}/offers`);
    return this.http.get<OfferResponse[]>(url);
  }

  /**
   * Mettre à jour le statut d'un candidat dans une offre
   * @param offerId ID de l'offre
   * @param candidateId ID du candidat
   * @param status Nouveau statut (ACCEPTED, REJECTED)
   * @returns Observable<void>
   */
  updateCandidateStatus(offerId: number, candidateId: number, status: string): Observable<void> {
    const url = getApiUrl(`/offers/${offerId}/candidates/${candidateId}/status`);
    return this.http.patch<void>(url, { status });
  }
}
