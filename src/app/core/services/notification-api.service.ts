import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationApiResponse {
  id: number;
  type: string;
  title: string;
  message: string;
  targetRoute?: string;
  referenceId?: number | null;
  referenceType?: string | null;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<NotificationApiResponse[]> {
    return this.http.get<NotificationApiResponse[]>(`${this.baseUrl}/me`);
  }

  getAdminNotifications(): Observable<NotificationApiResponse[]> {
    return this.http.get<NotificationApiResponse[]>(`${this.baseUrl}/admin`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllMyNotificationsAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/me/read-all`, {});
  }

  markAllAdminNotificationsAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/admin/read-all`, {});
  }
}
