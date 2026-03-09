import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountService } from '../../../core/services/account.service';
import { AccountCreationRequest, AccountCreationResponse } from '../../../core/models/account.model';

@Component({
  selector: 'app-account-request-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './account-request-edit-dialog.component.html',
  styleUrls: ['./account-request-edit-dialog.component.scss']
})
export class AccountRequestEditDialogComponent implements OnInit {
  editForm!: FormGroup;
  isLoading = false;
  request: AccountCreationResponse;

  constructor(
    public dialogRef: MatDialogRef<AccountRequestEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { request: AccountCreationResponse },
    private fb: FormBuilder,
    private accountService: AccountService,
    private snackBar: MatSnackBar
  ) {
    this.request = data.request;
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.editForm = this.fb.group({
      firstName: [this.request.firstName, [Validators.required, Validators.minLength(2)]],
      lastName: [this.request.lastName, [Validators.required, Validators.minLength(2)]],
      emailAddress: [this.request.emailAddress, [Validators.required, Validators.email]],
      phoneNumber: [this.request.phoneNumber || '', [Validators.pattern(/^[0-9]{10}$/)]],
      experienceYear: [this.request.experienceYear, [Validators.min(0)]],
      companyTitle: [this.request.companyTitle, [Validators.required, Validators.minLength(2)]],
      companyDescription: [this.request.companyDescription || ''],
      sector: [this.request.sector || ''],
      nbEmployee: [this.request.nbEmployee, [Validators.min(1)]],
      requestedAccounts: [this.request.requestedAccounts, [Validators.required, Validators.min(1)]]
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.isLoading = true;
    const updatedRequest: AccountCreationRequest = this.editForm.value;

    this.accountService.updateAccountRequest(this.request.id, updatedRequest).subscribe({
      next: (response) => {
        this.snackBar.open('Demande mise à jour avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close('updated');
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        let message = 'Erreur lors de la mise à jour de la demande';

        if (error.status === 404) {
          message = 'Demande non trouvée';
        } else if (error.status === 400) {
          message = 'Données invalides';
        } else if (error.error?.message) {
          message = error.error.message;
        }

        this.snackBar.open(message, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    if (control?.hasError('email')) {
      return 'Email invalide';
    }
    if (control?.hasError('minLength')) {
      return `Minimum ${control.errors?.['minLength'].requiredLength} caractères`;
    }
    if (control?.hasError('min')) {
      return `Minimum ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('pattern')) {
      return 'Format invalide';
    }
    return '';
  }

  close(): void {
    this.dialogRef.close();
  }
}
