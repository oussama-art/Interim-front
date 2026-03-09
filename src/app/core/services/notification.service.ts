import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private newOffersCount = new BehaviorSubject<number>(0);

  getNewOffersCount(): Observable<number> {
    return this.newOffersCount.asObservable();
  }

  incrementNewOffers(count: number = 1): void {
    const current = this.newOffersCount.value;
    const newValue = current + count;
    this.newOffersCount.next(newValue);
  }

  resetNewOffers(): void {
    this.newOffersCount.next(0);
  }
}
