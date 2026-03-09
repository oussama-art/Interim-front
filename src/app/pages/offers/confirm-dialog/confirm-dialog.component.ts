import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'accept' | 'reject' | 'warn' | 'info';
  details?: string[];
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header"
           [class.accept]="data.type === 'accept'"
           [class.reject]="data.type === 'reject'"
           [class.warn]="data.type === 'warn'"
           [class.info]="data.type === 'info'">
        <mat-icon>
          {{ data.type === 'accept' ? 'check_circle' :
             data.type === 'reject' ? 'cancel' :
             data.type === 'warn' ? 'warning' : 'info' }}
        </mat-icon>
        <h2>{{ data.title }}</h2>
      </div>
      <div class="dialog-content">
        <p class="main-message">{{ data.message }}</p>
        <div class="details-section" *ngIf="data.details && data.details.length > 0">
          <ul class="details-list">
            <li *ngFor="let detail of data.details">
              <mat-icon>{{ data.type === 'warn' ? 'info' : 'check' }}</mat-icon>
              <span>{{ detail }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button mat-raised-button (click)="onConfirm()"
                [class.btn-accept]="data.type === 'accept'"
                [class.btn-reject]="data.type === 'reject'"
                [class.btn-warn]="data.type === 'warn'"
                [class.btn-info]="data.type === 'info'">
          {{ data.confirmText || 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 0;
      min-width: 400px;
    }

    .dialog-header {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #e0e0e0;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
      }

      &.accept {
        background-color: #f0f9ff;
        border-bottom-color: #3b82f6;

        mat-icon {
          color: #3b82f6;
        }
      }

      &.reject {
        background-color: #fef2f2;
        border-bottom-color: #ef4444;

        mat-icon {
          color: #ef4444;
        }
      }

      &.warn {
        background-color: #fffbeb;
        border-bottom-color: #f59e0b;

        mat-icon {
          color: #f59e0b;
        }
      }

      &.info {
        background-color: #f0f9ff;
        border-bottom-color: #0ea5e9;

        mat-icon {
          color: #0ea5e9;
        }
      }
    }

    .dialog-content {
      padding: 2rem 1.5rem;

      .main-message {
        margin: 0 0 1.5rem 0;
        color: #333;
        font-size: 1rem;
        line-height: 1.6;
        font-weight: 500;
      }

      .details-section {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid #e5e7eb;
      }

      .details-list {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;

    .btn-warn {
      background-color: #f59e0b;
      color: white;

      &:hover {
        background-color: #d97706;
      }
    }

    .btn-info {
      background-color: #0ea5e9;
      color: white;

      &:hover {
        background-color: #0284c7;
      }
    }
          padding: 0.5rem 0;
          color: #4b5563;
          font-size: 0.9rem;
          line-height: 1.5;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: #6b7280;
            flex-shrink: 0;
            margin-top: 2px;
          }

          span {
            flex: 1;
          }

          &:not(:last-child) {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.75rem;
            margin-bottom: 0.25rem;
          }
        }
      }
    }

    .dialog-actions {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid #e0e0e0;
      background-color: #f9fafb;
    }

    .btn-cancel {
      color: #666;

      &:hover {
        background-color: #e5e7eb;
      }
    }

    .btn-accept {
      background-color: #3b82f6;
      color: white;

      &:hover {
        background-color: #2563eb;
      }
    }

    .btn-reject {
      background-color: #ef4444;
      color: white;

      &:hover {
        background-color: #dc2626;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
