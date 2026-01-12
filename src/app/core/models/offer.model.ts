export interface OfferCreateRequest {
  demandeId: number;
  candidateIds: number[];
}

export interface ProposedCandidate {
  candidateId: number;
  firstName: string;
  lastName: string;
  skills: string;
  professional: string;
  status: string;
}

export interface OfferResponse {
  offerId: number;
  demandeId: number;
  clientId: number;
  createdAt: string;
  proposedCandidates: ProposedCandidate[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
