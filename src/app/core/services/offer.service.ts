import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OfferCreateRequest, OfferResponse, OfferAcceptRequest, AssignmentResponse, OfferAddCandidatesRequest } from '../models/offer.model';
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
    const url = getApiUrl(`/${clientId}/offers`);
    return this.http.post<OfferResponse>(url, request);
  }

  /**
   * Récupérer toutes les offres d'un client
   * @param clientId ID du client
   * @returns Observable<OfferResponse[]>
   */
  getOffersByClientId(clientId: number): Observable<OfferResponse[]> {
    const url = getApiUrl(`/${clientId}/offers`);
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

  /**
   * Récupérer les offres d'une demande
   * @param demandeId ID de la demande
   * @returns Observable<OfferResponse[]>
   */
  getOffersByDemandeId(demandeId: number): Observable<OfferResponse[]> {
    const url = getApiUrl(`/demandes/${demandeId}/offers`);
    return this.http.get<OfferResponse[]>(url);
  }

  /**
   * Accepter une offre et créer une affectation
   * @param clientId ID du client
   * @param offerId ID de l'offre
   * @param request Données d'acceptation (candidateId, dates)
   * @returns Observable<AssignmentResponse>
   */
  acceptOffer(clientId: number, offerId: number, request: OfferAcceptRequest): Observable<AssignmentResponse> {
    const url = getApiUrl(`/${clientId}/offers/${offerId}/accept`);
    return this.http.post<AssignmentResponse>(url, request);
  }

  /**
   * Récupérer toutes les offres (Admin uniquement)
   * @returns Observable<OfferResponse[]>
   */
  getAllOffersAdmin(): Observable<OfferResponse[]> {
    const url = getApiUrl('/offers');
    return this.http.get<OfferResponse[]>(url);
  }

  /**
   * Créer une nouvelle offre pour une demande existante
   * @param clientId ID du client
   * @param demandeId ID de la demande
   * @returns Observable<OfferResponse>
   */
  createOfferForDemande(clientId: number, demandeId: number): Observable<OfferResponse> {
    const url = getApiUrl(`/${clientId}/demandes/${demandeId}/new-offer`);
    return this.http.post<OfferResponse>(url, {});
  }

  /**
   * Rejeter un candidat proposé dans une offre
   * @param clientId ID du client
   * @param offerId ID de l'offre
   * @param candidateId ID du candidat
   * @returns Observable<void>
   */
  rejectCandidate(clientId: number, offerId: number, candidateId: number): Observable<void> {
    const url = getApiUrl(`/${clientId}/offers/${offerId}/reject/${candidateId}`);
    return this.http.post<void>(url, {});
  }

  /**
   * Accepter un candidat proposé dans une offre
   * @param clientId ID du client
   * @param offerId ID de l'offre
   * @param candidateId ID du candidat
   * @param startDate Date de début
   * @param endDate Date de fin
   * @returns Observable<AssignmentResponse>
   */
  acceptCandidate(
    clientId: number,
    offerId: number,
    candidateId: number,
    startDate: string,
    endDate: string
  ): Observable<AssignmentResponse> {
    const url = getApiUrl(`/${clientId}/offers/${offerId}/accept`);
    return this.http.post<AssignmentResponse>(url, {
      candidateId,
      startDate,
      endDate
    });
  }

  /**
   * Ajouter de nouveaux candidats à une offre existante
   * @param clientId ID du client
   * @param offerId ID de l'offre
   * @param request Données des candidats à ajouter (demandeProfilId, candidateIds)
   * @returns Observable<OfferResponse>
   */
  addCandidatesToOffer(
    clientId: number,
    offerId: number,
    request: OfferAddCandidatesRequest
  ): Observable<OfferResponse> {
    const url = getApiUrl(`/${clientId}/offers/${offerId}/candidates`);
    return this.http.post<OfferResponse>(url, request);
  }
}
