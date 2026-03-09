import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CandidateService } from '../../../core/services/candidate.service';
import { ProfilService } from '../../../core/services/profil.service';
import { CandidateResponse, CandidatePatchRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-candidate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
  ],
  templateUrl: './edit-candidate-dialog.component.html',
  styleUrls: ['./edit-candidate-dialog.component.scss'],
})
export class EditCandidateDialogComponent implements OnInit {
  candidateForm: FormGroup;
  loading = false;
  availableProfils: string[] = [];
  filteredProfils: string[] = [];

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private profilService: ProfilService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EditCandidateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { candidate: CandidateResponse }
  ) {
    this.availableProfils = this.profilService.getAllProfils();
    this.filteredProfils = [...this.availableProfils];

    this.candidateForm = this.fb.group({
      firstName: [
        '',
        [Validators.required, Validators.minLength(2)],
      ],
      lastName: [
        '',
        [Validators.required, Validators.minLength(2)],
      ],
      emailAddress: ['', [Validators.required, Validators.email]],
      phoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^\+[1-9]\d{1,2}\d{6,12}$/)],
      ],
      experienceYear: [
        0,
        [Validators.required, Validators.min(0), Validators.max(50)],
      ],
      skills: [''],
      professional: ['', [Validators.required]],
      cin: [''],
      cssNumber: [''],
      active: [true],
    });
  }

  ngOnInit(): void {
    // Pré-remplir le formulaire avec les données du candidat
    const candidate = this.data.candidate;
    this.candidateForm.patchValue({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      emailAddress: candidate.emailAddress,
      phoneNumber: candidate.phoneNumber,
      experienceYear: candidate.experienceYear,
      skills: candidate.skills || '',
      professional: candidate.professional,
      cin: candidate.cin || '',
      cssNumber: candidate.cssNumber || '',
      active: candidate.active,
    });

    // Configurer l'autocomplete pour le champ professional
    this.candidateForm.get('professional')?.valueChanges.subscribe((value) => {
      this.filterProfils(value || '');
    });
  }

  filterProfils(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredProfils = this.availableProfils.filter((profil) =>
      profil.toLowerCase().includes(filterValue)
    );
  }

  onProfessionalFocus(): void {
    const currentValue = this.candidateForm.get('professional')?.value || '';
    this.filterProfils(currentValue);
  }

  onSubmit(): void {
    if (this.candidateForm.valid) {
      this.loading = true;
      const formValue = this.candidateForm.value;

      const patchData: CandidatePatchRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        emailAddress: formValue.emailAddress,
        phoneNumber: formValue.phoneNumber,
        experienceYear: formValue.experienceYear,
        skills: formValue.skills || null,
        professional: formValue.professional,
        cin: formValue.cin || null,
        cssNumber: formValue.cssNumber || null,
        active: formValue.active,
      };

      this.candidateService
        .updateCandidateById(this.data.candidate.id, patchData)
        .subscribe({
          next: (response) => {
            this.snackBar.open('Candidat modifié avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            this.loading = false;
            this.dialogRef.close(response);
          },
          error: (error) => {
            console.error('Erreur lors de la modification du candidat:', error);
            const errorMessage =
              error?.message || 'Erreur lors de la modification du candidat';
            this.snackBar.open(errorMessage, 'Fermer', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            this.loading = false;
          },
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
