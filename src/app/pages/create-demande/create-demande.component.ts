import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DemandeService } from '../../core/services/demande.service';
import { DemandeRequest } from '../../core/models/demande.model';

@Component({
  selector: 'app-create-demande',
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
    MatSelectModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ScrollingModule
  ],
  templateUrl: './create-demande.component.html',
  styleUrl: './create-demande.component.scss'
})
export class CreateDemandeComponent implements OnInit {
  demandeForm!: FormGroup;
  isLoading = false;
  filteredProfils: Observable<string[]>[] = [];
  quantityValidationError: string | null = null;
  isEditMode = false;
  demandeId: number | null = null;
  pageTitle = 'Créer une nouvelle demande';
  pageSubtitle = 'Remplissez les informations ci-dessous pour créer une demande';

  // Liste complète des profils organisés par domaine
  availableProfils: string[] = [
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private demandeService: DemandeService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupProfilFilter(0);
    this.setupQuantityValidation();

    // Vérifier si on est en mode édition
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.demandeId = +id;
        this.pageTitle = 'Modifier la demande';
        this.pageSubtitle = 'Modifiez les informations de votre demande';
        this.loadDemandeData(this.demandeId);
      }
    });
  }

  initForm(): void {
    this.demandeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      totalEmployeesNeeded: [1, [Validators.required, Validators.min(1)]],
      profils: this.fb.array([this.createProfilFormGroup()])
    });
  }

  loadDemandeData(id: number): void {
    this.isLoading = true;
    this.demandeService.getMyDemandeDetail(id).subscribe({
      next: (demande) => {
        this.demandeForm.patchValue({
          title: demande.title,
          description: demande.description,
          totalEmployeesNeeded: demande.totalEmployeesNeeded
        });

        // Supprimer le profil initial vide
        this.profils.clear();

        // Ajouter les profils existants
        demande.profils.forEach((profil, index) => {
          const profilGroup = this.fb.group({
            profilName: [profil.profilName, [Validators.required, Validators.minLength(2)]],
            quantity: [profil.quantity, [Validators.required, Validators.min(1)]]
          });
          this.profils.push(profilGroup);
          this.setupProfilFilter(index);

          // Ajouter le listener pour la validation
          profilGroup.get('quantity')?.valueChanges.subscribe(() => {
            this.validateTotalQuantity();
          });
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la demande:', error);
        this.snackBar.open('Erreur lors du chargement de la demande', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.router.navigate(['/app/demandes']);
        this.isLoading = false;
      }
    });
  }

  setupQuantityValidation(): void {
    // Écouter les changements sur totalEmployeesNeeded
    this.demandeForm.get('totalEmployeesNeeded')?.valueChanges.subscribe(() => {
      this.validateTotalQuantity();
    });

    // Écouter les changements sur les quantités des profils
    this.profils.controls.forEach((control, index) => {
      control.get('quantity')?.valueChanges.subscribe(() => {
        this.validateTotalQuantity();
      });
    });
  }

  createProfilFormGroup(): FormGroup {
    return this.fb.group({
      profilName: ['', [Validators.required, Validators.minLength(2)]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  get profils(): FormArray {
    return this.demandeForm.get('profils') as FormArray;
  }

  addProfil(): void {
    const index = this.profils.length;
    this.profils.push(this.createProfilFormGroup());
    this.setupProfilFilter(index);

    // Ajouter le listener pour la validation de quantité
    this.profils.at(index).get('quantity')?.valueChanges.subscribe(() => {
      this.validateTotalQuantity();
    });
  }

  validateTotalQuantity(): void {
    const totalEmployeesNeeded = this.demandeForm.get('totalEmployeesNeeded')?.value || 0;
    const totalQuantity = this.profils.controls.reduce((sum, control) => {
      const quantity = control.get('quantity')?.value || 0;
      return sum + quantity;
    }, 0);

    if (totalQuantity > totalEmployeesNeeded) {
      this.quantityValidationError = `La somme des quantités (${totalQuantity}) dépasse le nombre total d'employés requis (${totalEmployeesNeeded})`;
    } else {
      this.quantityValidationError = null;
    }
  }

  getTotalQuantity(): number {
    return this.profils.controls.reduce((sum, control) => {
      const quantity = control.get('quantity')?.value || 0;
      return sum + quantity;
    }, 0);
  }

  setupProfilFilter(index: number): void {
    const profilControl = this.profils.at(index).get('profilName');
    if (profilControl) {
      this.filteredProfils[index] = profilControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filterProfils(value || ''))
      );
    }
  }

  private _filterProfils(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.availableProfils.filter(profil =>
      profil.toLowerCase().includes(filterValue)
    );
  }

  removeProfil(index: number): void {
    if (this.profils.length > 1) {
      this.profils.removeAt(index);
    } else {
      this.snackBar.open('Au moins un profil est requis', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
    }
  }

  onSubmit(): void {
    // Vérifier d'abord la validation de quantité
    this.validateTotalQuantity();

    if (this.quantityValidationError) {
      this.snackBar.open(this.quantityValidationError, 'Fermer', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (this.demandeForm.valid) {
      this.isLoading = true;
      const demandeData: DemandeRequest = this.demandeForm.value;

      const request$ = this.isEditMode && this.demandeId
        ? this.demandeService.updateDemande(this.demandeId, demandeData)
        : this.demandeService.createDemande(demandeData);

      const successMessage = this.isEditMode ? 'Demande modifiée avec succès !' : 'Demande créée avec succès !';
      const errorMessage = this.isEditMode ? 'Erreur lors de la modification de la demande' : 'Erreur lors de la création de la demande';

      request$.subscribe({
        next: (response) => {
          console.log('Opération réussie:', response);
          this.isLoading = false;
          this.snackBar.open(successMessage, 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/app/demandes']);
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.isLoading = false;
          this.snackBar.open(error.message || errorMessage, 'Fermer', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.demandeForm);
      this.snackBar.open('Veuillez remplir tous les champs requis', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string, groupIndex?: number): string {
    let control;

    if (groupIndex !== undefined) {
      control = this.profils.at(groupIndex).get(fieldName);
    } else {
      control = this.demandeForm.get(fieldName);
    }

    if (control?.hasError('required')) {
      return 'Ce champ est requis';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} caractères requis`;
    }
    if (control?.hasError('min')) {
      return 'La valeur doit être au moins 1';
    }
    return '';
  }
}
