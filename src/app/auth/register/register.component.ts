import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { ClientService } from '../../core/services/client.service';
import { CandidateService } from '../../core/services/candidate.service';
import { ClientCreateRequest, CandidateCreateRequest } from '../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatRadioModule,
    MatSnackBarModule,
    MatStepperModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  userTypeForm!: FormGroup;
  baseInfoForm!: FormGroup;
  specificInfoForm!: FormGroup;
  userType = signal<'candidate' | 'client'>('candidate');
  isLoading = false;
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private clientService: ClientService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar
  ) {
    this.userTypeForm = this.fb.group({
      userType: ['candidate', Validators.required]
    });

    this.baseInfoForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      experienceYear: [0, [Validators.required, Validators.min(0)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.specificInfoForm = this.fb.group({
      // Champs Candidat
      skills: [''],
      professional: [''],
      cin: [''],
      cssNumber: [''],

      // Champs Client
      title: [''],
      description: [''],
      sector: [''],
      nbEmployee: [0, Validators.min(0)]
    });

    this.userTypeForm.get('userType')?.valueChanges.subscribe((type: 'candidate' | 'client') => {
      this.userType.set(type);
      this.updateBaseValidators(type);
      this.updateSpecificValidators(type);
    });
  }

  ngOnInit(): void {
    // Récupérer le type d'utilisateur depuis les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'client' || params['type'] === 'candidate') {
        const userType = params['type'] as 'candidate' | 'client';
        this.userTypeForm.patchValue({ userType });
        this.userType.set(userType);
        this.updateBaseValidators(userType);
        this.updateSpecificValidators(userType);
      }
    });
  }

  /**
   * Mettre à jour les validateurs du formulaire de base selon le type d'utilisateur
   */
  updateBaseValidators(type: 'candidate' | 'client'): void {
    const firstNameControl = this.baseInfoForm.get('firstName');
    const lastNameControl = this.baseInfoForm.get('lastName');

    if (type === 'candidate') {
      // Pour les candidats, nom et prénom sont requis
      firstNameControl?.setValidators(Validators.required);
      lastNameControl?.setValidators(Validators.required);
    } else {
      // Pour les clients, nom et prénom ne sont pas requis
      firstNameControl?.clearValidators();
      lastNameControl?.clearValidators();
    }

    firstNameControl?.updateValueAndValidity();
    lastNameControl?.updateValueAndValidity();
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  updateSpecificValidators(type: 'candidate' | 'client'): void {
    const form = this.specificInfoForm;

    // Nettoyer tous les validateurs
    Object.keys(form.controls).forEach(key => {
      form.get(key)?.clearValidators();
      form.get(key)?.updateValueAndValidity();
    });

    if (type === 'candidate') {
      // Aucun champ obligatoire pour les candidats lors du register
      // Ils pourront compléter leur profil plus tard
    } else {
      // Validateurs pour les clients
      form.get('title')?.setValidators(Validators.required);
      form.get('sector')?.setValidators(Validators.required);
      form.get('nbEmployee')?.setValidators([Validators.required, Validators.min(0)]);
    }

    // Mettre à jour la validité
    Object.keys(form.controls).forEach(key => {
      form.get(key)?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.userTypeForm.valid && this.baseInfoForm.valid && this.specificInfoForm.valid) {
      this.isLoading = true;

      const userType = this.userTypeForm.value.userType;
      const baseData = this.baseInfoForm.value;
      const specificData = this.specificInfoForm.value;

      if (userType === 'client') {
        // Préparer les données pour le client
        const clientData: ClientCreateRequest = {
          firstName: baseData.firstName || '',
          lastName: baseData.lastName || '',
          emailAddress: baseData.emailAddress,
          phoneNumber: baseData.phoneNumber,
          experienceYear: baseData.experienceYear || 0,
          password: baseData.password,
          confirmPassword: baseData.confirmPassword,
          title: specificData.title,
          description: specificData.description || '',
          sector: specificData.sector,
          nbEmployee: specificData.nbEmployee
        };

        // Appel du service pour créer le client
        this.clientService.createClient(clientData).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.showSuccess('Compte entreprise créé avec succès !');
            console.log('Client créé:', response);
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1500);
          },
          error: (error) => {
            this.isLoading = false;
            this.showError(error.message || 'Erreur lors de la création du compte');
            console.error('Erreur création client:', error);
          }
        });
      } else {
        // Préparer les données pour le candidat
        const candidateData: CandidateCreateRequest = {
          firstName: baseData.firstName,
          lastName: baseData.lastName,
          emailAddress: baseData.emailAddress,
          phoneNumber: baseData.phoneNumber,
          experienceYear: baseData.experienceYear,
          skills: specificData.skills,
          professional: specificData.professional,
          cin: specificData.cin,
          cssNumber: specificData.cssNumber,
          active: true
        };

        // Appel du service pour créer le candidat
        this.candidateService.createCandidate(candidateData).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.showSuccess('Compte candidat créé avec succès !');
            console.log('Candidat créé:', response);
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1500);
          },
          error: (error) => {
            this.isLoading = false;
            this.showError(error.message || 'Erreur lors de la création du compte');
            console.error('Erreur création candidat:', error);
          }
        });
      }
    } else {
      this.showError('Veuillez remplir tous les champs requis');
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 7000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.hasError('required')) return 'Ce champ est requis';
    if (field?.hasError('email')) return 'Email invalide';
    if (field?.hasError('minlength')) return 'Minimum 6 caractères';
    if (field?.hasError('pattern')) return 'Format invalide';
    if (field?.hasError('min')) return 'Valeur minimale: 0';
    return '';
  }
}
