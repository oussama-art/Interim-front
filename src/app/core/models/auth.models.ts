export interface LoginRequest {
  emailAddress: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
}

export interface UserProfile {
  id: number;
  emailAddress: string;
  fullName: string;
  role: string;
}
