import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface NotificationSnackBarData {
  message: string;
  title?: string;
  actionLabel?: string;
  icon?: string;
}

@Component({
  selector: 'app-offer-notification',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="offer-notification-card">
      <div class="offer-notification-row">
        <div class="offer-notification-icon-circle">
          <mat-icon class="offer-notification-icon">
            {{ data.icon || 'notifications' }}
          </mat-icon>
        </div>

        <div class="offer-notification-content">
          <div class="offer-notification-title">
            {{ data.title || 'Nouvelle notification' }}
          </div>
          <div class="offer-notification-message">
            {{ data.message }}
          </div>
        </div>

        <button
          mat-icon-button
          (click)="dismiss()"
          class="offer-notification-close"
          aria-label="Fermer"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <button
        mat-stroked-button
        color="primary"
        (click)="handleAction()"
        class="offer-notification-action"
      >
        <mat-icon>visibility</mat-icon>
        <span>{{ data.actionLabel || 'Voir les détails' }}</span>
      </button>
    </div>
  `,
  styles: [`
    .offer-notification-card {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
      padding: 1.2rem 1.5rem 1.3rem 1.5rem;
      min-width: 340px;
      max-width: 400px;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 6px 32px rgba(44, 62, 80, 0.13), 0 1.5px 6px rgba(74, 144, 226, 0.08);
      border: 1.5px solid #e3e8f7;
      position: relative;
    }

    .offer-notification-row {
      display: flex;
      align-items: flex-start;
      gap: 1.1rem;
    }

    .offer-notification-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6b7cff 0%, #4a90e2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(107, 124, 255, 0.18);
      flex-shrink: 0;
    }

    .offer-notification-icon {
      color: #fff;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .offer-notification-content {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1;
      min-width: 0;
    }

    .offer-notification-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a237e;
      letter-spacing: 0.1px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .offer-notification-message {
      font-size: 14px;
      color: #344054;
      line-height: 1.5;
      font-weight: 400;
      word-break: break-word;
    }

    .offer-notification-close {
      margin-left: 0.5rem;
      color: #b0b8d1;
      transition: background 0.2s, color 0.2s;
    }

    .offer-notification-close:hover {
      background: #f1f5ff;
      color: #4a90e2;
    }

    .offer-notification-action {
      align-self: flex-end;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      padding: 0 18px;
      height: 38px;
      box-shadow: 0 2px 8px rgba(107, 124, 255, 0.10);
      background: #fff;
      border: 1.5px solid #6b7cff;
      color: #4a90e2;
      transition: background 0.2s, color 0.2s, border 0.2s;
    }

    .offer-notification-action mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .offer-notification-action:hover {
      background: #f1f5ff;
      color: #1a237e;
      border-color: #4a90e2;
    }
  `]
})
export class OfferNotificationComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: NotificationSnackBarData,
    private snackBarRef: MatSnackBarRef<OfferNotificationComponent>
  ) {}

  dismiss(): void {
    this.snackBarRef.dismiss();
  }

  handleAction(): void {
    this.snackBarRef.dismissWithAction();
  }
}
