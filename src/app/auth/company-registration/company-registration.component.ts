import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountService } from '../../core/services/account.service';
import { AccountCreationRequest } from '../../core/models/account.model';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, switchMap, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-company-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './company-registration.component.html',
  styleUrls: ['./company-registration.component.scss']
})
export class CompanyRegistrationComponent implements OnInit {
  registrationForm!: FormGroup;
  isLoading = false;
  sectorDropdownOpen = false;
  filteredSectors: string[] = [];
  emailCheckErrors: { [key: number]: boolean } = {};
  emailCheckLoading: { [key: number]: boolean } = {};

  sectors: string[] = [
    'Agriculture, sylviculture et pêche',
    'Agroalimentaire',
    'Architecture et urbanisme',
    'Artisanat',
    'Assurance',
    'Audiovisuel et médias',
    'Automobile',
    'Banque et services financiers',
    'Biotechnologie',
    'BTP et construction',
    'Chimie',
    'Commerce et distribution',
    'Communication et publicité',
    'Comptabilité et audit',
    'Conseil et stratégie',
    'Culture et arts',
    'Défense et sécurité',
    'Design',
    'E-commerce',
    'Édition',
    'Éducation et formation',
    'Énergie',
    'Environnement et développement durable',
    'Événementiel',
    'Hôtellerie et restauration',
    'Immobilier',
    'Industrie manufacturière',
    'Informatique et services IT',
    'Ingénierie',
    'Juridique',
    'Logistique et transport',
    'Luxe',
    'Marketing digital',
    'Métallurgie',
    'Mode et textile',
    'Pétrole et gaz',
    'Pharmaceutique',
    'Recherche et développement',
    'Recrutement et ressources humaines',
    'Santé et services médicaux',
    'Services aux entreprises',
    'Services à la personne',
    'Spectacle et divertissement',
    'Sport et loisirs',
    'Télécommunications',
    'Tourisme',
    'Traduction et interprétation'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private accountService: AccountService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.filteredSectors = [...this.sectors];
  }

  toggleSectorDropdown(): void {
    this.sectorDropdownOpen = !this.sectorDropdownOpen;
    if (this.sectorDropdownOpen) {
      this.filteredSectors = [...this.sectors];
    }
  }

  selectSector(sector: string): void {
    this.registrationForm.patchValue({ sector });
    this.sectorDropdownOpen = false;
  }

  filterSectors(event: Event): void {
    const input = event.target as HTMLInputElement;
    const searchTerm = input.value.toLowerCase();

    if (!searchTerm) {
      this.filteredSectors = [...this.sectors];
    } else {
      this.filteredSectors = this.sectors.filter(sector =>
        sector.toLowerCase().includes(searchTerm)
      );
    }
  }

  closeSectorDropdown(): void {
    setTimeout(() => {
      this.sectorDropdownOpen = false;
    }, 200);
  }

  checkEmailManually(index: number): void {
    const control = this.additionalEmails.at(index);
    const email = control.value;

    // Vérifier si l'email est valide avant d'appeler l'API
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailPattern.test(email)) {
      this.emailCheckErrors[index] = false;
      return;
    }

    // Marquer comme en cours de chargement
    this.emailCheckLoading[index] = true;
    this.emailCheckErrors[index] = false;

    // Appeler l'API
    this.accountService.checkEmailExists(email).subscribe({
      next: (response) => {
        this.emailCheckLoading[index] = false;
        this.emailCheckErrors[index] = response.exists;
      },
      error: () => {
        this.emailCheckLoading[index] = false;
        this.emailCheckErrors[index] = false;
      }
    });
  }

  clearEmailError(index: number): void {
    // Réinitialiser l'erreur quand l'utilisateur modifie l'email
    this.emailCheckErrors[index] = false;
    this.emailCheckLoading[index] = false;
  }

  get hasEmailErrors(): boolean {
    // Vérifier s'il y a des emails en erreur ou en cours de chargement
    return Object.values(this.emailCheckErrors).some(error => error === true) ||
           Object.values(this.emailCheckLoading).some(loading => loading === true);
  }

  get canSubmit(): boolean {
    // Le formulaire peut être soumis si:
    // - Il est valide
    // - Pas de chargement en cours
    // - Aucun email n'existe déjà
    return this.registrationForm.valid && !this.isLoading && !this.hasEmailErrors;
  }

  emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      // Vérifier d'abord si l'email est valide
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(control.value)) {
        return of(null); // Laisser le validateur email standard gérer ça
      }

      return of(control.value).pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email =>
          this.accountService.checkEmailExists(email).pipe(
            map(response => response.exists ? { emailExists: true } : null),
            catchError(() => of(null))
          )
        )
      );
    };
  }

  initForm(): void {
    this.registrationForm = this.fb.group({
      // Informations personnelles
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      additionalEmails: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      phoneNumber: ['', [Validators.pattern(/^\+[1-9]\d{1,2}\d{6,12}$/)]],
      experienceYear: [null, [Validators.min(0)]],

      // Informations entreprise
      companyTitle: ['', [Validators.required, Validators.minLength(2)]],
      companyDescription: [''],
      sector: [''],
      nbEmployee: [null, [Validators.min(1)]],
      requestedAccounts: [1, [Validators.required, Validators.min(1)]]
    });

    // Ajouter un email supplémentaire par défaut
    this.addAdditionalEmail();

    // Écouter les changements sur requestedAccounts
    this.registrationForm.get('requestedAccounts')?.valueChanges.subscribe(value => {
      this.updateAdditionalEmailsCount(value);
    });
  }

  get additionalEmails(): FormArray {
    return this.registrationForm.get('additionalEmails') as FormArray;
  }

  addAdditionalEmail(): void {
    const newIndex = this.additionalEmails.length;
    this.additionalEmails.push(
      this.fb.control('', [Validators.required, Validators.email])
    );
    this.emailCheckErrors[newIndex] = false;
    this.emailCheckLoading[newIndex] = false;
  }

  removeAdditionalEmail(index: number): void {
    if (this.additionalEmails.length > 1) {
      this.additionalEmails.removeAt(index);
      delete this.emailCheckErrors[index];
      delete this.emailCheckLoading[index];
    }
  }

  updateAdditionalEmailsCount(requestedAccounts: number): void {
    if (!requestedAccounts || requestedAccounts < 1) {
      requestedAccounts = 1;
    }

    const currentCount = this.additionalEmails.length;
    const targetCount = requestedAccounts;

    if (targetCount > currentCount) {
      // Ajouter des champs email
      for (let i = currentCount; i < targetCount; i++) {
        this.addAdditionalEmail();
      }
    } else if (targetCount < currentCount) {
      // Retirer des champs email
      for (let i = currentCount - 1; i >= targetCount; i--) {
        this.additionalEmails.removeAt(i);
      }
    }
  }

  onSubmit(): void {
    console.log('🔍 [FORM] onSubmit appelé');
    console.log('🔍 [FORM] Form valid:', this.registrationForm.valid);
    console.log('🔍 [FORM] Form value:', this.registrationForm.value);
    console.log('🔍 [FORM] Form errors:', this.getFormValidationErrors());

    if (this.registrationForm.invalid) {
      this.markFormGroupTouched(this.registrationForm);
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // Vérifier s'il y a des emails en erreur
    const hasEmailErrors = Object.values(this.emailCheckErrors).some(error => error === true);
    if (hasEmailErrors) {
      this.snackBar.open('Veuillez corriger les emails en erreur', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    const formValue = this.registrationForm.value;
    const request: AccountCreationRequest = {
      ...formValue,
      additionalEmails: formValue.additionalEmails || []
    };

    console.log('📤 [API] Envoi de la requête:', request);

    this.accountService.createAccountRequest(request).subscribe({
      next: (response) => {
        console.log('✅ [API] Réponse reçue:', response);
        this.snackBar.open('Demande envoyée avec succès ! Vous serez contacté prochainement.', 'Fermer', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('❌ [API] Erreur complète:', error);
        console.error('❌ [API] Status:', error.status);
        console.error('❌ [API] Error body:', error.error);
        console.error('❌ [API] Message:', error.message);
        console.error('❌ [API] URL:', error.url);

        let message = 'Erreur lors de l\'envoi de la demande';

        if (error.status === 0) {
          message = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
        } else if (error.status === 401) {
          message = 'Non autorisé. Veuillez vous connecter.';
        } else if (error.status === 403) {
          message = 'Accès refusé.';
        } else if (error.status === 404) {
          message = 'Endpoint non trouvé. URL: ' + error.url;
        } else if (error.status === 500) {
          message = 'Erreur serveur: ' + (error.error?.message || 'Erreur interne');
        } else if (error.error?.message) {
          message = error.error.message;
        }

        this.snackBar.open(message, 'Fermer', {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  private getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.registrationForm.controls).forEach(key => {
      const controlErrors = this.registrationForm.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      // Marquer aussi les contrôles du FormArray
      if (control instanceof FormArray) {
        control.controls.forEach(c => c.markAsTouched());
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registrationForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    if (control?.hasError('email')) {
      return 'Email invalide';
    }
    if (control?.hasError('emailExists')) {
      return 'Cet email est déjà utilisé';
    }
    if (control?.hasError('minLength')) {
      return `Minimum ${control.errors?.['minLength'].requiredLength} caractères`;
    }
    if (control?.hasError('pattern')) {
      if (fieldName === 'phoneNumber') {
        return 'Format invalide (ex: +33612345678)';
      }
      return 'Format invalide';
    }
    if (control?.hasError('min')) {
      return `Valeur minimale: ${control.errors?.['min'].min}`;
    }
    return '';
  }

  getAdditionalEmailError(index: number): string {
    const control = this.additionalEmails.at(index);
    if (control?.hasError('required') && control?.touched) {
      return 'Ce champ est obligatoire';
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Email invalide';
    }

    // Vérifier si l'email existe déjà
    if (this.emailCheckErrors[index]) {
      return 'Cet email est déjà utilisé';
    }

    return '';
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
