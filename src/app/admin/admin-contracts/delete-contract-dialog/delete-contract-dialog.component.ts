import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DeleteDialogData {
  candidateName: string;
}

@Component({
  selector: 'app-delete-contract-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-icon">
        <mat-icon>warning</mat-icon>
      </div>
      <h2 mat-dialog-title>Confirmer la suppression</h2>
      <mat-dialog-content>
        <p>Êtes-vous sûr de vouloir supprimer le contrat de <strong>{{ data.candidateName }}</strong> ?</p>
        <p class="warning-text">Cette action est irréversible.</p>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-stroked-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Annuler
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()">
          <mat-icon>delete</mat-icon>
          Supprimer
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 1rem;
      text-align: center;
    }

    .dialog-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #f59e0b;
        background: #fef3c7;
        border-radius: 50%;
        padding: 1rem;
      }
    }

    h2 {
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    mat-dialog-content {
      padding: 0 1rem 1.5rem 1rem;

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: #4b5563;
        line-height: 1.5;

        strong {
          color: #1f2937;
          font-weight: 600;
        }
      }

      .warning-text {
        font-size: 0.875rem;
        color: #dc2626;
        font-weight: 500;
      }
    }

    mat-dialog-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 0 1rem 0.5rem 1rem;
      margin: 0;

      button {
        min-width: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;

        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
        }
      }
    }
  `]
})
export class DeleteContractDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteContractDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
