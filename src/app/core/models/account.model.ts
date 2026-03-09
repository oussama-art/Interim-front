export interface AccountCreationRequest {
  firstName: string;
  lastName: string;
  emailAddress: string;
  additionalEmails: string[];
  phoneNumber?: string;
  experienceYear?: number;
  companyTitle: string;
  companyDescription?: string;
  sector?: string;
  nbEmployee?: number;
  requestedAccounts: number;
}

export interface EmailCheckResponse {
  exists: boolean;
}

export interface EmailWithStatus {
  email: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
}

export interface AccountCreationResponse {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  emails?: EmailWithStatus[];
  phoneNumber?: string;
  experienceYear?: number;
  companyTitle: string;
  companyDescription?: string;
  sector?: string;
  nbEmployee?: number;
  requestedAccounts: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  validatedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface AccountApprovalRequest {
  firstName: string;
  lastName: string;
  emailAddress: string;
  selectedEmails: string[];
  phoneNumber?: string;
  experienceYear?: number;
  companyTitle: string;
  companyDescription?: string;
  sector?: string;
  nbEmployee?: number;
  requestedAccounts: number;
}

export interface CreatedAccountInfo {
  email: string;
  password: string;
}

