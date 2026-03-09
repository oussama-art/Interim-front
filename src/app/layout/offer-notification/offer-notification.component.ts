import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
  selector: 'app-offer-notification',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="offer-notification">
      <div class="notification-header">
        <div class="header-left">
          <div class="notification-icon-wrapper">
            <mat-icon class="notification-icon">workspace_premium</mat-icon>
          </div>
          <div class="notification-text">
            <span class="notification-title">Nouvelle opportunité</span>
            <span class="notification-message">{{ data.message }}</span>
          </div>
        </div>
        <button mat-icon-button (click)="dismiss()" class="btn-close" aria-label="Marquer comme lu">
          <mat-icon>check</mat-icon>
        </button>
      </div>
      <div class="notification-actions">
        <button mat-flat-button color="primary" (click)="viewOffers()" class="btn-view">
          Consulter les offres
        </button>
      </div>
    </div>
  `,
  styles: [`
    .offer-notification {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 1.25rem;
      min-width: 380px;
      max-width: 420px;
      background: linear-gradient(135deg, #f8f9fc 0%, #ffffff 100%);
      border-left: 3px solid #4a90e2;
      border-radius: 4px;
    }

    .notification-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .header-left {
      display: flex;
      gap: 0.875rem;
      flex: 1;
    }

    .notification-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
      border-radius: 8px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(74, 144, 226, 0.25);
    }

    .notification-icon {
      color: #ffffff;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .notification-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      letter-spacing: 0.2px;
    }

    .notification-message {
      font-size: 13px;
      font-weight: 400;
      color: #64748b;
      line-height: 1.5;
    }

    .btn-close {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      color: #64748b;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .btn-close:hover {
      background: rgba(100, 116, 139, 0.1);
      color: #2c3e50;
    }

    .notification-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.25rem;
    }

    .btn-view {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.3px;
      padding: 0 20px;
      height: 36px;
      background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
      box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
      transition: all 0.2s ease;
    }

    .btn-view:hover {
      background: linear-gradient(135deg, #357abd 0%, #2a6599 100%);
      box-shadow: 0 4px 10px rgba(74, 144, 226, 0.4);
      transform: translateY(-1px);
    }

    .btn-view:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);
    }
  `]
})
export class OfferNotificationComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: { message: string },
    private snackBarRef: MatSnackBarRef<OfferNotificationComponent>
  ) {}

  dismiss(): void {
    this.snackBarRef.dismiss();
  }

  viewOffers(): void {
    this.snackBarRef.dismissWithAction();
  }
}
