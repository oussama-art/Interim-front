export interface DemandeProfilRequest {
  profilName: string;
  quantity: number;
}

export interface DemandeRequest {
  title: string;
  description: string;
  totalEmployeesNeeded: number;
  startDate: string;
  endDate: string;
  profils: DemandeProfilRequest[];
}

export interface DemandeResponse {
  id: number;
  reference?: string;
  title: string;
  description: string;
  totalEmployeesNeeded: number;
  startDate: string;
  endDate: string;
  clientId: number;
  clientTitle?: string;
  status?: string;
  profils: DemandeProfilResponse[];
}

export interface DemandeProfilResponse {
  id: number;
  profilName: string;
  quantity: number;
}
