import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

export interface AcceptOfferDialogData {
  candidateName: string;
  demandeStartDate: string;
  demandeEndDate: string;
}

export interface AcceptOfferDialogResult {
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-accept-offer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="accept-offer-dialog">
      <div class="dialog-header">
        <mat-icon>event</mat-icon>
        <h2>Définir les dates de mission</h2>
      </div>
      <div class="dialog-content">
        <p class="candidate-info">
          <strong>{{ data.candidateName }}</strong>
        </p>
        <p class="info-text">
          Veuillez définir les dates de début et de fin de la mission pour ce candidat.
        </p>

        <form [formGroup]="dateForm">
          <mat-form-field appearance="outline">
            <mat-label>Date de début</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" required>
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error *ngIf="dateForm.get('startDate')?.hasError('required')">
              La date de début est requise
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Date de fin</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" required>
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
            <mat-error *ngIf="dateForm.get('endDate')?.hasError('required')">
              La date de fin est requise
            </mat-error>
            <mat-error *ngIf="dateForm.get('endDate')?.hasError('endDateBeforeStart')">
              La date de fin doit être après la date de début
            </mat-error>
          </mat-form-field>

          <div class="demande-dates-info">
            <mat-icon>info</mat-icon>
            <span>Période demandée: {{ formatDate(data.demandeStartDate) }} - {{ formatDate(data.demandeEndDate) }}</span>
          </div>
        </form>
      </div>
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          Annuler
        </button>
        <button mat-raised-button (click)="onConfirm()"
                [disabled]="!dateForm.valid"
                class="btn-accept">
          Valider et retenir
        </button>
      </div>
    </div>
  `,
  styles: [`
    .accept-offer-dialog {
      padding: 0;
      min-width: 500px;
    }

    .dialog-header {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f0f9ff;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #3b82f6;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
      }
    }

    .dialog-content {
      padding: 2rem 1.5rem;

      .candidate-info {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        color: #333;
      }

      .info-text {
        margin: 0 0 1.5rem 0;
        color: #666;
        font-size: 0.95rem;
        line-height: 1.6;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      mat-form-field {
        width: 100%;
      }

      .demande-dates-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: #eff6ff;
        border-radius: 6px;
        color: #1e40af;
        font-size: 0.9rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
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

      &:hover:not(:disabled) {
        background-color: #2563eb;
      }

      &:disabled {
        background-color: #cbd5e1;
        color: #94a3b8;
      }
    }
  `]
})
export class AcceptOfferDialogComponent {
  dateForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AcceptOfferDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AcceptOfferDialogData,
    private fb: FormBuilder
  ) {
    const startDate = data.demandeStartDate ? new Date(data.demandeStartDate) : new Date();
    const endDate = data.demandeEndDate ? new Date(data.demandeEndDate) : null;

    this.dateForm = this.fb.group({
      startDate: [startDate, Validators.required],
      endDate: [endDate, Validators.required]
    }, { validators: this.dateRangeValidator });
  }

  dateRangeValidator(group: FormGroup) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;

    if (start && end && new Date(start) > new Date(end)) {
      group.get('endDate')?.setErrors({ endDateBeforeStart: true });
      return { endDateBeforeStart: true };
    }

    return null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  onConfirm(): void {
    if (this.dateForm.valid) {
      const result: AcceptOfferDialogResult = {
        startDate: this.formatDateToISO(this.dateForm.value.startDate),
        endDate: this.formatDateToISO(this.dateForm.value.endDate)
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
