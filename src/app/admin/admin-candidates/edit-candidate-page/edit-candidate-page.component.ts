import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { CandidateService } from '../../../core/services/candidate.service';
import { ProfilService } from '../../../core/services/profil.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { CandidateResponse, CandidatePatchRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-candidate-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatCardModule,
  ],
  templateUrl: './edit-candidate-page.component.html',
  styleUrls: ['./edit-candidate-page.component.scss'],
})
export class EditCandidatePageComponent implements OnInit {
  candidateForm: FormGroup;
  loading = false;
  loadingCandidate = true;
  availableProfils: string[] = [];
  filteredProfils: string[] = [];
  candidate: CandidateResponse | null = null;
  candidateId: number = 0;

  // Liste des indicatifs téléphoniques
  countryCodes = [
    { code: '+212', country: 'Maroc', flag: '🇲🇦' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+1', country: 'États-Unis/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
    { code: '+49', country: 'Allemagne', flag: '🇩🇪' },
    { code: '+34', country: 'Espagne', flag: '🇪🇸' },
    { code: '+39', country: 'Italie', flag: '🇮🇹' },
    { code: '+32', country: 'Belgique', flag: '🇧🇪' },
    { code: '+41', country: 'Suisse', flag: '🇨🇭' },
    { code: '+213', country: 'Algérie', flag: '🇩🇿' },
    { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
    { code: '+20', country: 'Égypte', flag: '🇪🇬' },
    { code: '+971', country: 'Émirats arabes unis', flag: '🇦🇪' },
    { code: '+966', country: 'Arabie saoudite', flag: '🇸🇦' },
  ];

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private profilService: ProfilService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {
    this.availableProfils = this.profilService.getAllProfils();
    this.filteredProfils = [...this.availableProfils];

    this.candidateForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      emailAddress: [''],
      countryCode: ['+212'],
      phoneNumber: [''],
      experienceYear: [0],
      skills: [''],
      professional: [''],
      cin: [''],
      cssNumber: [''],
      active: [true],
    });
  }

  ngOnInit(): void {
    // Récupérer l'ID depuis les paramètres de route
    this.route.params.subscribe(params => {
      this.candidateId = +params['id'];
      if (this.candidateId) {
        this.loadCandidate();
      }
    });

    // Configurer l'autocomplete pour le champ professional
    this.candidateForm.get('professional')?.valueChanges.subscribe((value) => {
      this.filterProfils(value || '');
    });
  }

  loadCandidate(): void {
    this.loadingCandidate = true;
    this.candidateService.getCandidateById(this.candidateId).subscribe({
      next: (candidate) => {
        this.candidate = candidate;

        // Extraire l'indicatif et le numéro du téléphone
        let countryCode = '+212';
        let phoneNumber = candidate.phoneNumber || '';

        if (phoneNumber) {
          // Chercher si le numéro commence par un indicatif connu
          for (const country of this.countryCodes) {
            if (phoneNumber.startsWith(country.code)) {
              countryCode = country.code;
              phoneNumber = phoneNumber.substring(country.code.length).trim();
              break;
            }
          }
        }

        // Pré-remplir le formulaire avec les données du candidat
        this.candidateForm.patchValue({
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          emailAddress: candidate.emailAddress,
          countryCode: countryCode,
          phoneNumber: phoneNumber,
          experienceYear: candidate.experienceYear,
          skills: candidate.skills || '',
          professional: candidate.professional,
          cin: candidate.cin || '',
          cssNumber: candidate.cssNumber || '',
          active: candidate.active,
        });
        // Marquer le formulaire comme pristine après le chargement
        this.candidateForm.markAsPristine();
        this.loadingCandidate = false;
        console.log('Formulaire chargé:', {
          valid: this.candidateForm.valid,
          dirty: this.candidateForm.dirty,
          pristine: this.candidateForm.pristine
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement du candidat:', error);
        if (!this.errorHandler.isSessionExpired(error)) {
          this.errorHandler.handleError(error, '❌ Erreur lors du chargement du candidat');
        }
        this.loadingCandidate = false;
        this.goBack();
      },
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
    this.loading = true;
    const formValue = this.candidateForm.value;

    // Combiner l'indicatif et le numéro seulement si le numéro existe
    const fullPhoneNumber = formValue.phoneNumber && formValue.phoneNumber.trim()
      ? formValue.countryCode + formValue.phoneNumber
      : null;

    const patchData: CandidatePatchRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      emailAddress: formValue.emailAddress,
      phoneNumber: fullPhoneNumber,
      experienceYear: formValue.experienceYear,
      skills: formValue.skills || null,
      professional: formValue.professional,
      cin: formValue.cin || null,
      cssNumber: formValue.cssNumber || null,
      active: formValue.active,
    };

    this.candidateService
      .updateCandidateById(this.candidateId, patchData)
      .subscribe({
        next: (response) => {
          this.snackBar.open('Candidat modifié avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.loading = false;
          this.goBack();
        },
        error: (error) => {
          console.error('Erreur lors de la modification du candidat:', error);
          if (!this.errorHandler.isSessionExpired(error)) {
            this.errorHandler.handleError(error, '❌ Erreur lors de la modification du candidat');
          }
          this.loading = false;
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/candidates']);
  }
}
