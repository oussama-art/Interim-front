import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DemandeResponse } from '../../models/demande.model';

@Injectable({
  providedIn: 'root'
})
export class DemandeStoreService {
  private readonly demandesSubject = new BehaviorSubject<DemandeResponse[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  getDemandes(): Observable<DemandeResponse[]> {
    return this.demandesSubject.asObservable();
  }

  getLoading(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  getSnapshot(): DemandeResponse[] {
    return this.demandesSubject.value;
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  setAll(demandes: DemandeResponse[]): void {
    this.demandesSubject.next(demandes);
  }

  add(demande: DemandeResponse): void {
    const current = this.demandesSubject.value;
    const exists = current.some(d => d.id === demande.id);

    if (exists) {
      return;
    }

    this.demandesSubject.next([demande, ...current]);
  }

  upsert(demande: DemandeResponse): void {
    const current = this.demandesSubject.value;
    const index = current.findIndex(d => d.id === demande.id);

    if (index === -1) {
      this.demandesSubject.next([demande, ...current]);
      return;
    }

    const updated = [...current];
    updated[index] = demande;
    this.demandesSubject.next(updated);
  }

  remove(demandeId: number): void {
    const updated = this.demandesSubject.value.filter(d => d.id !== demandeId);
    this.demandesSubject.next(updated);
  }

  clear(): void {
    this.demandesSubject.next([]);
    this.loadingSubject.next(false);
  }
}
