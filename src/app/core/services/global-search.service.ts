import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalSearchService {
  private searchQuerySubject = new BehaviorSubject<string>('');
  public searchQuery$: Observable<string> = this.searchQuerySubject.asObservable();

  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  clearSearch(): void {
    this.searchQuerySubject.next('');
  }

  getCurrentQuery(): string {
    return this.searchQuerySubject.value;
  }
}
