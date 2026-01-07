export interface DemandeProfilRequest {
  profilName: string;
  quantity: number;
}

export interface DemandeRequest {
  title: string;
  description: string;
  totalEmployeesNeeded: number;
  profils: DemandeProfilRequest[];
}

export interface DemandeResponse {
  id: number;
  title: string;
  description: string;
  totalEmployeesNeeded: number;
  clientId: number;
  clientTitle?: string;
  profils: DemandeProfilResponse[];
}

export interface DemandeProfilResponse {
  id: number;
  profilName: string;
  quantity: number;
}
