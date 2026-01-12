import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CandidateService } from '../../../core/services/candidate.service';
import { CandidateCreateRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-create-candidate-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './create-candidate-form.component.html',
  styleUrls: ['./create-candidate-form.component.scss']
})
export class CreateCandidateFormComponent {
  @Output() candidateCreated = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  candidateForm: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar
  ) {
    this.candidateForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      experienceYear: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
      skills: ['', [Validators.required]],
      professional: ['', [Validators.required]],
      cin: ['', [Validators.required, Validators.minLength(8)]],
      cssNumber: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.candidateForm.valid) {
      this.loading = true;
      const formValue = this.candidateForm.value;

      const candidateData: CandidateCreateRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        emailAddress: formValue.emailAddress,
        phoneNumber: formValue.phoneNumber,
        password: formValue.password,
        confirmPassword: formValue.confirmPassword,
        experienceYear: formValue.experienceYear,
        skills: formValue.skills,
        professional: formValue.professional,
        cin: formValue.cin,
        cssNumber: formValue.cssNumber
      };

      this.candidateService.createCandidate(candidateData).subscribe({
        next: (response) => {
          this.snackBar.open('Candidat créé avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.candidateForm.reset();
          this.loading = false;
          this.candidateCreated.emit();
        },
        error: (error) => {
          console.error('Erreur lors de la création du candidat:', error);
          const errorMessage = error?.message || 'Erreur lors de la création du candidat';
          this.snackBar.open(errorMessage, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.candidateForm);
      this.snackBar.open('Veuillez remplir tous les champs requis correctement', 'Fermer', {
        duration: 3000
      });
    }
  }

  onCancel(): void {
    this.candidateForm.reset();
    this.cancel.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.candidateForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Ce champ est requis';
    }
    if (control?.hasError('email')) {
      return 'Email invalide';
    }
    if (control?.hasError('minlength')) {
      return `Minimum ${control.errors?.['minlength'].requiredLength} caractères`;
    }
    if (control?.hasError('pattern')) {
      return 'Format invalide';
    }
    if (control?.hasError('min')) {
      return `Valeur minimale: ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Valeur maximale: ${control.errors?.['max'].max}`;
    }
    if (fieldName === 'confirmPassword' && this.candidateForm.hasError('passwordMismatch')) {
      return 'Les mots de passe ne correspondent pas';
    }
    return '';
  }
}
