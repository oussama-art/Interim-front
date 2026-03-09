export interface OfferCreateRequest {
  demandeId: number;
  profilsCandidates: { [profilId: number]: number[] };
}

export interface OfferAddCandidatesRequest {
  demandeProfilId: number;
  candidateIds: number[];
}

export interface OfferAcceptRequest {
  candidateId: number;
  startDate: string;
  endDate: string;
}

export interface AssignmentResponse {
  id: number;
  candidateId: number;
  clientId: number;
  offerId: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface ProposedCandidate {
  candidateId: number;
  firstName: string;
  lastName: string;
  skills: string;
  professional: string;
  experienceYear?: number;
  emailAddress?: string;
  phoneNumber?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  demandeProfilId?: number;
  demandeProfilName?: string;
}

export interface OfferProfilGroup {
  profilId: number;
  profilName: string;
  quantityRequested: number;
  candidates: ProposedCandidate[];
  acceptedCount: number;
}

export interface OfferResponse {
  offerId: number;
  demandeId: number;
  clientId: number;
  createdAt: string;
  proposedCandidates: ProposedCandidate[];
  demandeReference?: string;
  profilGroups?: OfferProfilGroup[];
  isNew?: boolean;
  newOfferTimestamp?: number;
  hasNewCandidates?: boolean;
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
