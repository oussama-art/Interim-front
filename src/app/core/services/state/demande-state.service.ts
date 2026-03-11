import { Injectable } from '@angular/core';
import { DemandeApiService } from '../apiService/demande-api.service';
import { DemandeStoreService } from '../store/demande-store.service';

@Injectable({
  providedIn: 'root'
})
export class DemandeStateService {
  constructor(
    private demandeApiService: DemandeApiService,
    private demandeStoreService: DemandeStoreService
  ) {}

  loadAll(): void {
    this.demandeStoreService.setLoading(true);

    this.demandeApiService.getAllDemandes().subscribe({
      next: (demandes) => {
        this.demandeStoreService.setAll(demandes);
        this.demandeStoreService.setLoading(false);
      },
      error: (error) => {
        console.error('Erreur chargement demandes:', error);
        this.demandeStoreService.setLoading(false);
      }
    });
  }

  refreshOne(demandeId: number): void {
    this.demandeApiService.getDemandeById(demandeId).subscribe({
      next: (demande) => {
        this.demandeStoreService.upsert(demande);
      },
      error: (error) => {
        console.error('Erreur chargement demande:', error);
      }
    });
  }

  remove(demandeId: number): void {
    this.demandeStoreService.remove(demandeId);
  }
}
