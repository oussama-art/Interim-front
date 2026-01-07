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
    const url = getApiUrl(`/clients/offers`);
    return this.http.post<OfferResponse>(url, request);
  }
}
