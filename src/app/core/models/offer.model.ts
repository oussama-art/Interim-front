export interface OfferCreateRequest {
  demandeId: number;
  candidateIds: number[];
}

export interface OfferResponse {
  id: number;
  demandeId: number;
  candidateIds: number[];
  clientId: number;
  createdAt: string;
  status?: string;
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
