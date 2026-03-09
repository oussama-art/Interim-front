import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountCreationRequest, AccountCreationResponse, AccountApprovalRequest, EmailCheckResponse, CreatedAccountInfo } from '../models/account.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = `${environment.apiUrl}/account-requests`;

  constructor(private http: HttpClient) {}

  createAccountRequest(request: AccountCreationRequest): Observable<AccountCreationResponse> {
    return this.http.post<AccountCreationResponse>(`${this.apiUrl}/create`, request);
  }

  // Admin endpoints
  getAllAccountRequests(): Observable<AccountCreationResponse[]> {
    return this.http.get<AccountCreationResponse[]>(this.apiUrl);
  }

  getAccountRequestById(id: number): Observable<AccountCreationResponse> {
    return this.http.get<AccountCreationResponse>(`${this.apiUrl}/${id}`);
  }

  updateAccountRequest(id: number, request: AccountCreationRequest): Observable<AccountCreationResponse> {
    return this.http.put<AccountCreationResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteAccountRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  approveAccountRequest(id: number, approvalData: AccountApprovalRequest): Observable<CreatedAccountInfo[]> {
    return this.http.patch<CreatedAccountInfo[]>(`${this.apiUrl}/${id}/approve`, approvalData);
  }

  rejectAccountRequest(id: number, reason: string): Observable<void> {
    const params = new HttpParams().set('reason', reason);
    return this.http.patch<void>(`${this.apiUrl}/${id}/reject`, {}, { params });
  }

  checkEmailExists(email: string): Observable<EmailCheckResponse> {
    const params = new HttpParams().set('email', email);
    return this.http.get<EmailCheckResponse>(`${this.apiUrl}/check-email`, { params });
  }
}

