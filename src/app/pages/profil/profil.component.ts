import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule, MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';
import { CandidateService } from '../../core/services/candidate.service';
import { ClientResponse, ClientPatchRequest, CandidateResponse, CandidatePatchRequest } from '../../core/models/user.model';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatAutocompleteModule
  ],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit, AfterViewInit {
  @ViewChildren(MatFormField) formFields!: QueryList<MatFormField>;

  client: ClientResponse | null = null;
  candidate: CandidateResponse | null = null;
  isLoading = true;
  profileImageUrl: string | null = null;
  isUploadingImage = false;
  isEditMode = false;
  isSaving = false;
  isClient = false;
  isCandidate = false;

  profileForm!: FormGroup;
  missingFields: string[] = [];

  // Liste des professions par domaine
  professions: string[] = [
    // Informatique & Technologies
    'Développeur Web Frontend',
    'Développeur Web Backend',
    'Développeur Full Stack',
    'Développeur Mobile iOS',
    'Développeur Mobile Android',
    'Développeur React Native',
    'Développeur Flutter',
    'Data Scientist',
    'Data Analyst',
    'Data Engineer',
    'Ingénieur DevOps',
    'Ingénieur Cloud (AWS/Azure/GCP)',
    'Administrateur Système',
    'Administrateur Réseau',
    'Ingénieur Sécurité / Cybersécurité',
    'Architecte Logiciel',
    'Architecte Cloud',
    'Testeur QA / Quality Assurance',
    'Ingénieur Machine Learning',
    'Ingénieur IA / Intelligence Artificielle',
    'Designer UI/UX',
    'Webdesigner',
    'Product Designer',
    'Graphic Designer',
    'Scrum Master',
    'Product Owner',
    'Chef de Projet IT',
    'Product Manager',
    'Business Analyst',
    'Technicien Informatique',
    'Support Technique',
    'Technicien Helpdesk',

    // BTP & Construction
    'Maçon',
    'Chef de Chantier',
    'Conducteur de Travaux',
    'Ingénieur BTP',
    'Ingénieur Civil',
    'Architecte',
    'Dessinateur en Bâtiment',
    'Métreur',
    'Charpentier',
    'Menuisier',
    'Ébéniste',
    'Carreleur',
    'Peintre en Bâtiment',
    'Plâtrier',
    'Couvreur',
    'Zingueur',
    'Étancheur',
    'Maçon-coffreur',
    'Ferrailleur',
    'Terrassier',
    'Canalisateur',
    'Géomètre',

    // Électricité & Énergie
    'Électricien',
    'Électricien Industriel',
    'Électricien Bâtiment',
    'Électrotechnicien',
    'Technicien en Automatisme',
    'Ingénieur Électrique',
    'Technicien Électronicien',
    'Monteur-Câbleur',
    'Technicien Fibre Optique',
    'Technicien Énergies Renouvelables',
    'Installateur Photovoltaïque',

    // Plomberie & Chauffage
    'Plombier',
    'Plombier-Chauffagiste',
    'Chauffagiste',
    'Installateur Sanitaire',
    'Technicien CVC (Climatisation Ventilation Chauffage)',
    'Frigoriste',
    'Climaticien',
    'Tuyauteur',

    // Mécanique & Automobile
    'Mécanicien Automobile',
    'Technicien Automobile',
    'Carrossier',
    'Peintre Automobile',
    'Mécanicien Poids Lourds',
    'Mécanicien Moto',
    'Mécanicien Agricole',
    'Mécanicien Industriel',
    'Technicien de Maintenance',
    'Agent de Maintenance',
    'Électromécanicien',
    'Tourneur-Fraiseur',
    'Usineur',
    'Soudeur',
    'Chaudronnier',
    'Tuyauteur Industriel',
    'Ajusteur-Monteur',

    // Santé & Médical
    'Médecin Généraliste',
    'Médecin Spécialiste',
    'Chirurgien',
    'Infirmier',
    'Infirmier Anesthésiste',
    'Infirmier de Bloc Opératoire',
    'Aide-Soignant',
    'Auxiliaire de Puériculture',
    'Sage-Femme',
    'Pharmacien',
    'Préparateur en Pharmacie',
    'Kinésithérapeute',
    'Ergothérapeute',
    'Orthophoniste',
    'Psychologue',
    'Psychiatre',
    'Radiologue',
    'Biologiste Médical',
    'Laborantin',
    'Dentiste',
    'Prothésiste Dentaire',
    'Opticien',
    'Audioprothésiste',
    'Ambulancier',
    'Brancardier',
    'Aide Médico-Psychologique',
    'Agent Hospitalier',

    // Administration & Gestion
    'Secrétaire',
    'Assistant Administratif',
    'Secrétaire de Direction',
    'Assistant de Gestion',
    'Gestionnaire Administratif',
    'Office Manager',
    'Responsable Administratif',
    'Comptable',
    'Assistant Comptable',
    'Chef Comptable',
    'Contrôleur de Gestion',
    'Auditeur',
    'Expert-Comptable',
    'Gestionnaire de Paie',
    'Assistant Juridique',
    'Juriste',
    'Avocat',
    'Notaire',

    // Ressources Humaines
    'Responsable RH',
    'Chargé de Recrutement',
    'Responsable Recrutement',
    'Chargé de Formation',
    'Responsable Formation',
    'Gestionnaire RH',
    'Assistant RH',
    'Responsable Paie',

    // Commerce & Vente
    'Vendeur',
    'Conseiller de Vente',
    'Commercial',
    'Technico-Commercial',
    'Commercial Terrain',
    'Commercial Sédentaire',
    'Responsable Commercial',
    'Directeur Commercial',
    'Chef des Ventes',
    'Ingénieur Commercial',
    'Account Manager',
    'Business Developer',
    'Responsable Grand Compte',
    'Chargé d\'Affaires',
    'Acheteur',
    'Responsable Achats',
    'Category Manager',
    'Trade Marketeur',
    'Merchandiser',
    'Responsable de Magasin',
    'Chef de Rayon',
    'Caissier',
    'Hôte de Caisse',

    // Marketing & Communication
    'Responsable Marketing',
    'Chargé de Marketing',
    'Chef de Produit',
    'Digital Marketeur',
    'Traffic Manager',
    'Community Manager',
    'Social Media Manager',
    'Content Manager',
    'Rédacteur Web',
    'SEO Manager',
    'SEM Manager',
    'Responsable Communication',
    'Chargé de Communication',
    'Attaché de Presse',
    'Graphiste',
    'Motion Designer',
    'Vidéaste',
    'Photographe',
    'Monteur Vidéo',

    // Logistique & Transport
    'Chauffeur',
    'Chauffeur Poids Lourds',
    'Chauffeur Livreur',
    'Chauffeur VTC',
    'Chauffeur de Bus',
    'Conducteur de Train',
    'Livreur',
    'Coursier',
    'Magasinier',
    'Cariste',
    'Préparateur de Commandes',
    'Agent Logistique',
    'Responsable Logistique',
    'Responsable d\'Entrepôt',
    'Supply Chain Manager',
    'Chef d\'Équipe Logistique',
    'Gestionnaire de Stock',
    'Réceptionnaire',
    'Expéditionnaire',
    'Technicien Planification',

    // Hôtellerie & Restauration
    'Cuisinier',
    'Chef de Cuisine',
    'Second de Cuisine',
    'Commis de Cuisine',
    'Pâtissier',
    'Boulanger',
    'Serveur',
    'Chef de Rang',
    'Sommelier',
    'Barman',
    'Réceptionniste Hôtel',
    'Concierge',
    'Gouvernant',
    'Femme de Chambre',
    'Employé d\'Étage',
    'Responsable Hôtelier',
    'Directeur d\'Hôtel',
    'Responsable Restauration',
    'Maître d\'Hôtel',
    'Plongeur',

    // Services à la Personne
    'Aide à Domicile',
    'Auxiliaire de Vie',
    'Assistant Familial',
    'Garde d\'Enfants',
    'Aide Ménagère',
    'Agent d\'Entretien',
    'Agent de Propreté',
    'Agent de Service Hospitalier',
    'Femme de Ménage',
    'Jardinier',
    'Paysagiste',
    'Élagueur',
    'Garde d\'Immeuble',
    'Concierge d\'Immeuble',

    // Sécurité
    'Agent de Sécurité',
    'Agent de Sécurité Incendie',
    'Vigile',
    'Agent Cynophile',
    'Agent de Sûreté Aéroportuaire',
    'Convoyeur de Fonds',
    'Responsable Sécurité',
    'Pompier',
    'Policier',
    'Gendarme',
    'Militaire',

    // Enseignement & Formation
    'Professeur',
    'Enseignant',
    'Instituteur',
    'Professeur des Écoles',
    'Formateur',
    'Formateur Professionnel',
    'Moniteur Auto-École',
    'Éducateur Spécialisé',
    'Éducateur de Jeunes Enfants',
    'Animateur',
    'Animateur Socio-Culturel',
    'Directeur d\'École',

    // Agriculture & Environnement
    'Agriculteur',
    'Éleveur',
    'Viticulteur',
    'Maraîcher',
    'Arboriculteur',
    'Ouvrier Agricole',
    'Tractoriste',
    'Technicien Agricole',
    'Ingénieur Agronome',
    'Vétérinaire',
    'Assistant Vétérinaire',
    'Paysagiste',
    'Technicien Environnement',
    'Agent d\'Entretien Espaces Verts',

    // Industrie & Production
    'Opérateur de Production',
    'Agent de Production',
    'Technicien de Production',
    'Responsable de Production',
    'Chef d\'Équipe Production',
    'Conducteur de Ligne',
    'Conducteur de Machine',
    'Opérateur sur Machine',
    'Contrôleur Qualité',
    'Technicien Qualité',
    'Responsable Qualité',
    'Ingénieur Qualité',
    'Technicien Méthodes',
    'Ingénieur Méthodes',
    'Agent de Fabrication',
    'Monteur-Assembleur',
    'Préparateur de Matières',

    // Banque & Finance
    'Conseiller Bancaire',
    'Chargé de Clientèle Bancaire',
    'Conseiller en Gestion de Patrimoine',
    'Analyste Financier',
    'Contrôleur Financier',
    'Directeur Financier',
    'Trader',
    'Gestionnaire de Portefeuille',
    'Analyste Crédit',
    'Risk Manager',

    // Immobilier
    'Agent Immobilier',
    'Négociateur Immobilier',
    'Conseiller Immobilier',
    'Gestionnaire de Biens',
    'Administrateur de Biens',
    'Syndic de Copropriété',
    'Promoteur Immobilier',

    // Artisanat & Arts
    'Coiffeur',
    'Esthéticien',
    'Prothésiste Ongulaire',
    'Barbier',
    'Fleuriste',
    'Bijoutier',
    'Horloger',
    'Cordonnier',
    'Tapissier',
    'Sellier',
    'Couturier',
    'Styliste',
    'Modéliste',
    'Céramiste',
    'Potier',
    'Sculpteur',
    'Artiste Peintre',

    // Autre
    'Réceptionniste',
    'Standardiste',
    'Agent d\'Accueil',
    'Hôtesse d\'Accueil',
    'Conseiller Client',
    'Téléconseiller',
    'Agent de Centre d\'Appels',
    'Chargé de Clientèle',
    'Enquêteur',
    'Statisticien',
    'Documentaliste',
    'Bibliothécaire',
    'Archiviste',
    'Traducteur',
    'Interprète'
  ];
  filteredProfessions!: Observable<string[]>;

  stats = [
    { label: 'Contrats actifs', value: 0, icon: 'description', color: '#1a237e' },
    { label: 'Missions terminées', value: 0, icon: 'check_circle', color: '#10b981' },
    { label: 'Intérimaires', value: 0, icon: 'people', color: '#8b5cf6' },
    { label: 'Factures', value: 0, icon: 'receipt_long', color: '#f59e0b' }
  ];

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // Ne pas initialiser le formulaire ici, attendre ngOnInit
  }

  ngOnInit(): void {
    // Déterminer le type d'utilisateur AVANT d'initialiser le formulaire
    this.isClient = this.authService.isClient();
    this.isCandidate = this.authService.isCandidate();

    // Maintenant initialiser le formulaire avec le bon type
    this.initForm();

    // Initialiser le filtre des professions pour les candidats
    if (this.isCandidate) {
      this.setupProfessionFilter();
    }

    if (this.isClient) {
      this.loadClientProfile();
    } else if (this.isCandidate) {
      this.loadCandidateProfile();
    }
  }

  setupProfessionFilter(): void {
    if (this.profileForm && this.profileForm.get('professional')) {
      this.filteredProfessions = this.profileForm.get('professional')!.valueChanges.pipe(
        startWith(''),
        map(value => this._filterProfessions(value || ''))
      );
    }
  }

  private _filterProfessions(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.professions.filter(profession =>
      profession.toLowerCase().includes(filterValue)
    );
  }

  ngAfterViewInit(): void {
    // Force update of all form fields after view initialization
    this.updateFormFields();
  }

  updateFormFields(): void {
    setTimeout(() => {
      // Force detection of changes to properly render mat-form-fields
      this.cdr.detectChanges();

      // Trigger layout recalculation by accessing form fields
      if (this.formFields) {
        this.formFields.forEach(field => {
          // Force the field to update by accessing its internal state
          const element = field._elementRef?.nativeElement;
          if (element) {
            // Trigger a reflow to force outline rendering
            void element.offsetHeight;
          }
        });
      }
    }, 100);
  }

  initForm(): void {
    // Formulaire de base commun
    const baseFields = {
      firstName: [''],
      lastName: [''],
      phoneNumber: ['', Validators.pattern(/^[0-9]{10}$/)]
    };

    // Ajouter les champs spécifiques selon le type d'utilisateur
    if (this.isClient) {
      this.profileForm = this.fb.group({
        ...baseFields,
        title: ['', Validators.required],
        description: [''],
        sector: ['', Validators.required],
        nbEmployee: [0, [Validators.required, Validators.min(1)]]
      });
    } else if (this.isCandidate) {
      this.profileForm = this.fb.group({
        ...baseFields,
        experienceYear: [0, Validators.min(0)],
        skills: [''],
        professional: [''],
        cin: [''],
        cssNumber: ['']
      });
    } else {
      // Fallback pour client par défaut
      this.profileForm = this.fb.group({
        ...baseFields,
        title: [''],
        description: [''],
        sector: [''],
        nbEmployee: [0]
      });
    }
  }

  loadClientProfile(): void {
    this.isLoading = true;
    this.clientService.getMe().subscribe({
      next: (client) => {
        this.client = client;
        this.populateClientForm(client);
        this.checkMissingFieldsClient(client);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil:', error);
        this.snackBar.open('Erreur lors du chargement du profil', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  loadCandidateProfile(): void {
    this.isLoading = true;
    this.candidateService.getMe().subscribe({
      next: (candidate) => {
        this.candidate = candidate;
        this.populateCandidateForm(candidate);
        this.checkMissingFieldsCandidate(candidate);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du profil candidat:', error);
        this.snackBar.open('Erreur lors du chargement du profil', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  populateClientForm(client: ClientResponse): void {
    this.profileForm.patchValue({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phoneNumber: client.phoneNumber || '',
      title: client.title || '',
      description: client.description || '',
      sector: client.sector || '',
      nbEmployee: client.nbEmployee || 0
    });
  }

  populateCandidateForm(candidate: CandidateResponse): void {
    this.profileForm.patchValue({
      firstName: candidate.firstName || '',
      lastName: candidate.lastName || '',
      phoneNumber: candidate.phoneNumber || '',
      experienceYear: candidate.experienceYear || 0,
      skills: candidate.skills || '',
      professional: candidate.professional || '',
      cin: candidate.cin || '',
      cssNumber: candidate.cssNumber || ''
    });
  }

  checkMissingFieldsClient(client: ClientResponse): void {
    this.missingFields = [];

    // Pour les clients, on vérifie uniquement ces champs (pas firstName ni lastName)
    const fieldLabels: { [key: string]: string } = {
      phoneNumber: 'Téléphone',
      title: 'Titre de l\'entreprise',
      sector: 'Secteur d\'activité',
      nbEmployee: 'Nombre d\'employés'
    };

    Object.keys(fieldLabels).forEach(field => {
      const value = (client as any)[field];

      // Vérifier si le champ est vide, null ou undefined
      if (field === 'nbEmployee') {
        // Pour nbEmployee, considérer comme manquant seulement si null, undefined, ou < 1
        if (value === null || value === undefined || value < 1) {
          this.missingFields.push(fieldLabels[field]);
        }
      } else {
        // Pour les autres champs (strings), vérifier si vide, null ou undefined
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          this.missingFields.push(fieldLabels[field]);
        }
      }
    });
  }

  checkMissingFieldsCandidate(candidate: CandidateResponse): void {
    this.missingFields = [];

    // Pour les candidats, vérifier ces champs
    const fieldLabels: { [key: string]: string } = {
      phoneNumber: 'Téléphone',
      experienceYear: 'Années d\'expérience',
      skills: 'Compétences',
      professional: 'Profession',
      cin: 'CIN',
      cssNumber: 'Numéro CSS'
    };

    Object.keys(fieldLabels).forEach(field => {
      const value = (candidate as any)[field];

      if (field === 'experienceYear') {
        if (value === null || value === undefined || value < 0) {
          this.missingFields.push(fieldLabels[field]);
        }
      } else {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          this.missingFields.push(fieldLabels[field]);
        }
      }
    });
  }

  get hasIncompleteProfile(): boolean {
    return this.missingFields.length > 0;
  }

  enableEditMode(): void {
    this.isEditMode = true;

    // Pour les candidats, forcer une reconstruction du formulaire
    if (this.isCandidate && this.candidate) {
      this.initForm();
      this.populateCandidateForm(this.candidate);
      // Réinitialiser le filtre des professions après reconstruction du formulaire
      setTimeout(() => {
        this.setupProfessionFilter();
      }, 0);
    } else if (this.isClient && this.client) {
      this.initForm();
      this.populateClientForm(this.client);
    }

    // Force re-render by temporarily hiding and showing the form
    this.cdr.detectChanges();

    // Use multiple timeouts to ensure proper rendering
    setTimeout(() => {
      this.profileForm.updateValueAndValidity();

      // Mark all fields as touched to trigger Material's internal updates
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control) {
          control.markAsTouched();
          control.updateValueAndValidity({ emitEvent: false });
        }
      });

      this.cdr.detectChanges();

      // Force reflow on all form fields
      setTimeout(() => {
        const formFields = document.querySelectorAll('.profile-form mat-form-field');
        formFields.forEach((field: any) => {
          void field.offsetHeight;
        });

        // Also force reflow on inputs
        const inputs = document.querySelectorAll('.profile-form input, .profile-form textarea');
        inputs.forEach((input: any) => {
          void input.offsetHeight;
        });

        this.updateFormFields();
      }, 100);
    }, 50);
  }

  cancelEdit(): void {
    this.isEditMode = false;
    if (this.isClient && this.client) {
      this.populateClientForm(this.client);
    } else if (this.isCandidate && this.candidate) {
      this.populateCandidateForm(this.candidate);
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isSaving = true;

    if (this.isClient) {
      const patchData: ClientPatchRequest = this.profileForm.value;
      this.clientService.patchMe(patchData).subscribe({
        next: (updatedClient) => {
          this.client = updatedClient;
          this.isEditMode = false;
          this.isSaving = false;
          this.checkMissingFieldsClient(updatedClient);
          this.snackBar.open('Profil mis à jour avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.isSaving = false;
          this.snackBar.open(error.message || 'Erreur lors de la mise à jour du profil', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else if (this.isCandidate) {
      const patchData: CandidatePatchRequest = this.profileForm.value;
      this.candidateService.patchMe(patchData).subscribe({
        next: (updatedCandidate) => {
          this.candidate = updatedCandidate;
          this.isEditMode = false;
          this.isSaving = false;
          this.checkMissingFieldsCandidate(updatedCandidate);
          this.snackBar.open('Profil mis à jour avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.isSaving = false;
          this.snackBar.open(error.message || 'Erreur lors de la mise à jour du profil', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getInitials(): string {
    const user = this.client || this.candidate;
    if (!user) return 'U';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  }

  getFullName(): string {
    const user = this.client || this.candidate;
    if (!user) return '';
    const parts = [];
    if (user.firstName) parts.push(user.firstName);
    if (user.lastName) parts.push(user.lastName);
    return parts.join(' ') || 'Utilisateur';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Veuillez sélectionner une image', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('L\'image ne doit pas dépasser 5MB', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Prévisualiser l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      // TODO: Implémenter l'upload vers le serveur
      this.uploadProfileImage(file);
    }
  }

  uploadProfileImage(file: File): void {
    this.isUploadingImage = true;

    // TODO: Implémenter l'appel API pour uploader l'image
    // Pour l'instant, simulation
    setTimeout(() => {
      this.isUploadingImage = false;
      this.snackBar.open('Photo de profil mise à jour avec succès', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    }, 1500);
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    fileInput?.click();
  }

  logout(): void {
    this.authService.logout();
  }
}
