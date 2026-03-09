import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CandidateService } from '../../../core/services/candidate.service';
import { ProfilService } from '../../../core/services/profil.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { CandidateCreateRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-create-candidate-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  availableProfils: string[] = [];

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private profilService: ProfilService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService
  ) {
    this.availableProfils = this.profilService.getAllProfils();
    this.candidateForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,2}\d{6,12}$/)]],
      experienceYear: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
      skills: ['', [Validators.required]],
      professional: ['', [Validators.required]],
      cin: ['', [Validators.required, Validators.minLength(8)]],
      cssNumber: ['', [Validators.required]],
      active: [true]
    });
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
        experienceYear: formValue.experienceYear,
        skills: formValue.skills,
        professional: formValue.professional,
        cin: formValue.cin,
        cssNumber: formValue.cssNumber,
        active: formValue.active
      };

      this.candidateService.createCandidate(candidateData).subscribe({
        next: (response) => {
          this.snackBar.open('Candidat créé avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.candidateForm.reset({ active: true });
          this.loading = false;
          this.candidateCreated.emit();
        },
        error: (error) => {
          console.error('Erreur lors de la création du candidat:', error);
          if (!this.errorHandler.isSessionExpired(error)) {
            this.errorHandler.handleError(error);
          }
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
      if (fieldName === 'phoneNumber') {
        return 'Format invalide (ex: +21612345678, +33612345678)';
      }
      return 'Format invalide';
    }
    if (control?.hasError('min')) {
      return `Valeur minimale: ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Valeur maximale: ${control.errors?.['max'].max}`;
    }
    return '';
  }
}
