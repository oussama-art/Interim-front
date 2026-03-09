export interface BaseUserRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  experienceYear: number;
  password: string;
  confirmPassword: string;
}

export interface ClientCreateRequest extends BaseUserRequest {
  title: string;
  description?: string;
  sector: string;
  nbEmployee: number;
}

export interface CandidateCreateRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  experienceYear: number;
  skills: string;
  professional: string;
  cin: string;
  cssNumber: string;
  active?: boolean;
}

export interface ClientResponse {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  title: string;
  description?: string;
  sector: string;
  nbEmployee: number;
  numDemande?: number;
  globalEmailAddress?: string;
  approvedEmails?: string[];
  createdAt: string;
}

export interface ClientPatchRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  title?: string;
  description?: string;
  sector?: string;
  nbEmployee?: number;
}

export interface AdminResponse {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  role: 'ADMIN';
  createdAt: string;
}

export interface CandidateResponse {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  experienceYear: number;
  skills: string;
  professional: string;
  cin: string;
  cssNumber: string;
  cvPath?: string;
  createdAt: string;
  active: boolean;
  suspendedUntil?: string;
  status?: string;
  nextAvailableDate?: string;
}

export interface CandidatePatchRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailAddress?: string;
  experienceYear?: number;
  skills?: string;
  professional?: string;
  cin?: string;
  cssNumber?: string;
  active?: boolean;
  suspendedUntil?: string;
}

// OAuth Models
export interface OAuthCallbackResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  isNewUser: boolean;
  userType?: 'candidate' | 'client';
  userId?: number;
}
