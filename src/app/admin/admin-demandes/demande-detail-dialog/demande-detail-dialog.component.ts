import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DemandeResponse } from '../../../core/models/demande.model';
import { CandidateResponse, ClientResponse } from '../../../core/models/user.model';
import { CandidateService } from '../../../core/services/candidate.service';
import { ClientService } from '../../../core/services/client.service';
import { OfferService } from '../../../core/services/offer.service';
import { AdminService } from '../../../core/services/admin.service';
import { OfferCreateRequest } from '../../../core/models/offer.model';
import { UploadCvDialogComponent } from '../../admin-candidates/upload-cv-dialog/upload-cv-dialog.component';
import { ConfirmOfferDialogComponent, ProfilSummary } from '../confirm-offer-dialog/confirm-offer-dialog.component';

@Component({
  selector: 'app-demande-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatCheckboxModule,
    MatDialogModule
  ],
  templateUrl: './demande-detail-dialog.component.html',
  styleUrls: ['./demande-detail-dialog.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
})
export class DemandeDetailDialogComponent implements OnInit {
  demande: DemandeResponse | null = null;
  clientDetails: ClientResponse | null = null;
  loadingClient = false;
  loadingDemande = true;
  allCandidates: CandidateResponse[] = [];
  profilCandidates: Map<number, Set<number>> = new Map();
  expandedProfils: Set<number> = new Set();
  selectedProfilId: number | null = null;
  loadingCandidates = false;
  loadingOffer = false;
  showCreateOffer = false;
  existingOffers: any[] = [];
  loadingOffers = false;
  hasExistingOffer = false;
  existingOfferId: number | null = null; // ID de l'offre existante pour cette demande
  profilsEligibleForNewOffer: Set<number> = new Set();
  profilOfferMap: Map<number, number> = new Map(); // Map<profilId, offerId>

  constructor(
    private candidateService: CandidateService,
    private clientService: ClientService,
    private offerService: OfferService,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID de la demande depuis la route
    const demandeId = this.route.snapshot.paramMap.get('id');
    if (!demandeId) {
      this.snackBar.open('ID de demande manquant', 'Fermer', { duration: 3000 });
      this.goBack();
      return;
    }

    // Charger la demande
    this.loadDemande(parseInt(demandeId, 10));
  }

  loadDemande(demandeId: number): void {
    this.loadingDemande = true;
    this.adminService.getDemandeById(demandeId).subscribe({
      next: (demande) => {
        this.demande = demande;
        this.loadingDemande = false;

        // Initialiser les sets pour chaque profil
        this.demande.profils.forEach(profil => {
          this.profilCandidates.set(profil.id, new Set());
        });

        // Charger les données associées
        this.loadClientDetails();
        this.loadExistingOffers();
        this.loadCandidates();
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la demande:', err);
        this.snackBar.open('Erreur lors du chargement de la demande', 'Fermer', { duration: 3000 });
        this.loadingDemande = false;
        this.goBack();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/demandes']);
  }

  isDemandeClosed(): boolean {
    if (!this.demande) return false;
    return this.demande.status === 'CLOSED' || this.demande.status === 'REJECTED';
  }

  getProposedCandidatesByProfil(profilId: number): any[] {
    const candidates: any[] = [];
    this.existingOffers.forEach(offer => {
      if (offer.proposedCandidates) {
        offer.proposedCandidates.forEach((candidate: any) => {
          if (candidate.demandeProfilId === profilId) {
            candidates.push(candidate);
          }
        });
      }
    });
    return candidates;
  }

  getProfilsWithCandidates(): any[] {
    if (!this.demande) return [];
    return this.demande.profils.filter(profil =>
      this.getProposedCandidatesByProfil(profil.id).length > 0
    );
  }

  loadClientDetails(): void {
    if (!this.demande) return;

    this.loadingClient = true;
    console.log('🔍 [CLIENT] Chargement du client ID:', this.demande.clientId);
    this.clientService.getClientById(this.demande.clientId).subscribe({
      next: (client) => {
        console.log('✅ [CLIENT] Client chargé:', client);
        this.clientDetails = client;
        this.loadingClient = false;
      },
      error: (err) => {
        console.error('❌ [CLIENT] Erreur lors du chargement du client:', err);
        this.loadingClient = false;
      }
    });
  }

  loadExistingOffers(): void {
    if (!this.demande) return;

    this.loadingOffers = true;
    this.offerService.getOffersByDemandeId(this.demande.id).subscribe({
      next: (offers) => {
        this.existingOffers = offers;
        this.hasExistingOffer = offers.length > 0;
        // Stocker l'ID de la première offre si elle existe
        if (offers.length > 0) {
          this.existingOfferId = offers[0].offerId;
          console.log('📦 [OFFER] Offre existante trouvée pour cette demande:', this.existingOfferId);
        }
        this.analyzeProfilsEligibility(offers);
        this.loadingOffers = false;

        // Sélectionner le premier profil éligible
        const eligibleProfils = this.getEligibleProfils();
        if (eligibleProfils.length > 0) {
          this.selectedProfilId = eligibleProfils[0].id;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des offres:', err);
        this.loadingOffers = false;
      }
    });
  }

  analyzeProfilsEligibility(offers: any[]): void {
    if (!this.demande) return;

    // Map pour stocker les statuts et compteurs par profil
    const profilStatus = new Map<number, {
      hasProposed: boolean;
      hasAccepted: boolean;
      proposedCount: number;
      acceptedCount: number;
    }>();

    // Initialiser tous les profils
    this.demande.profils.forEach(profil => {
      profilStatus.set(profil.id, {
        hasProposed: false,
        hasAccepted: false,
        proposedCount: 0,
        acceptedCount: 0
      });
    });

    // Analyser chaque offre
    offers.forEach(offer => {
      offer.proposedCandidates.forEach((candidate: any) => {
        const profilId = candidate.demandeProfilId;
        if (profilId && profilStatus.has(profilId)) {
          const status = profilStatus.get(profilId)!;

          // Stocker l'offre associée à ce profil (toujours, même si tous refusés)
          if (!this.profilOfferMap.has(profilId)) {
            this.profilOfferMap.set(profilId, offer.offerId);
          }

          if (candidate.status === 'PROPOSED') {
            status.hasProposed = true;
            status.proposedCount++;
          } else if (candidate.status === 'ACCEPTED') {
            status.hasAccepted = true;
            status.acceptedCount++;
          }
        }
      });
    });

    // Déterminer quels profils sont éligibles pour une nouvelle offre
    this.profilsEligibleForNewOffer.clear();

    this.demande.profils.forEach(profil => {
      const status = profilStatus.get(profil.id);

      // Un profil est éligible si:
      // 1. Aucune offre n'a été envoyée pour ce profil
      if (!status) {
        this.profilsEligibleForNewOffer.add(profil.id);
        return;
      }

      // 2. Tous les candidats ont été refusés (pas de PROPOSED ni ACCEPTED)
      if (!status.hasProposed && !status.hasAccepted) {
        this.profilsEligibleForNewOffer.add(profil.id);
        return;
      }

      // 3. Le nombre de candidats en cours (PROPOSED + ACCEPTED) est inférieur à la quantité demandée
      const totalInProgress = status.proposedCount + status.acceptedCount;
      if (totalInProgress < profil.quantity) {
        this.profilsEligibleForNewOffer.add(profil.id);
      }
    });
  }

  loadCandidates(): void {
    if (!this.demande) return;

    this.loadingCandidates = true;

    // Use demande dates for availability filter
    if (!this.demande.startDate || !this.demande.endDate) {
      this.snackBar.open('Les dates de la demande sont manquantes', 'Fermer', {
        duration: 3000
      });
      this.loadingCandidates = false;
      return;
    }

    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(this.demande.startDate);
    const endDateStr = formatDate(this.demande.endDate);

    this.candidateService.getAvailableCandidates(startDateStr, endDateStr).subscribe({
      next: (candidates) => {
        this.allCandidates = candidates;
        this.loadingCandidates = false;
        // this.snackBar.open(`${candidates.length} candidat(s) disponible(s) trouvé(s)`, 'Fermer', {
        //   duration: 3000
        // });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des candidats disponibles:', err);
        this.snackBar.open('Erreur lors du chargement des candidats disponibles', 'Fermer', {
          duration: 3000
        });
        this.loadingCandidates = false;
      }
    });
  }

  toggleCandidate(profilId: number, candidateId: number): void {
    const profilSet = this.profilCandidates.get(profilId);
    if (!profilSet) return;

    if (profilSet.has(candidateId)) {
      profilSet.delete(candidateId);
    } else {
      profilSet.add(candidateId);
    }
  }

  isCandidateSelectedForProfil(profilId: number, candidateId: number): boolean {
    return this.profilCandidates.get(profilId)?.has(candidateId) || false;
  }

  isCandidateSelectedInAnyProfil(candidateId: number): boolean {
    for (const [_, candidates] of this.profilCandidates) {
      if (candidates.has(candidateId)) {
        return true;
      }
    }
    return false;
  }

  isCandidateSelectedInOtherProfil(profilId: number, candidateId: number): boolean {
    for (const [otherProfilId, candidates] of this.profilCandidates) {
      if (otherProfilId !== profilId && candidates.has(candidateId)) {
        return true;
      }
    }
    return false;
  }

  getAvailableCandidatesForProfil(profilId: number): CandidateResponse[] {
    if (!this.demande) return [];

    // Trouver le profil correspondant
    const profil = this.demande.profils.find(p => p.id === profilId);
    if (!profil) {
      return [];
    }

    // Obtenir les candidats déjà proposés pour ce profil (PROPOSED ou ACCEPTED)
    const proposedCandidates = this.getProposedCandidatesByProfil(profilId);
    const alreadyProposedIds = new Set<number>(
      proposedCandidates
        .filter(c => c.status === 'PROPOSED' || c.status === 'ACCEPTED')
        .map(c => c.candidateId)
    );

    // Filtrer les candidats par leur profession/profil et qui ne sont pas déjà proposés
    return this.allCandidates.filter(candidate => {
      // Vérifier que le profil professionnel du candidat correspond au nom du profil demandé
      const professionalMatch = candidate.professional.toLowerCase().trim() === profil.profilName.toLowerCase().trim();

      // Vérifier que le candidat n'est pas sélectionné dans un autre profil
      const notSelectedInOther = !this.isCandidateSelectedInOtherProfil(profilId, candidate.id);

      // Vérifier que le candidat n'a pas déjà été proposé ou accepté pour ce profil
      const notAlreadyProposed = !alreadyProposedIds.has(candidate.id);

      return professionalMatch && notSelectedInOther && notAlreadyProposed;
    });
  }

  getSelectedCountForProfil(profilId: number): number {
    return this.profilCandidates.get(profilId)?.size || 0;
  }

  getTotalSelectedCount(): number {
    let total = 0;
    for (const [_, candidates] of this.profilCandidates) {
      total += candidates.size;
    }
    return total;
  }

  toggleProfilExpansion(profilId: number): void {
    // Fermer tous les profils sauf celui qu'on veut ouvrir
    if (this.expandedProfils.has(profilId)) {
      // Si on clique sur le profil déjà ouvert, on le ferme
      this.expandedProfils.clear();
    } else {
      // Sinon, on ferme tous les autres et on ouvre uniquement celui-ci
      this.expandedProfils.clear();
      this.expandedProfils.add(profilId);
    }
  }

  onProfilChange(profilId: number): void {
    this.selectedProfilId = profilId;
  }

  getProfilQuantity(profilId: number): number {
    if (!this.demande) return 0;
    const profil = this.demande.profils.find(p => p.id === profilId);
    return profil ? profil.quantity : 0;
  }

  getProfilInProgressCount(profilId: number): number {
    let count = 0;
    this.existingOffers.forEach(offer => {
      offer.proposedCandidates.forEach((candidate: any) => {
        if (candidate.demandeProfilId === profilId &&
            (candidate.status === 'PROPOSED' || candidate.status === 'ACCEPTED')) {
          count++;
        }
      });
    });
    return count;
  }

  getRemainingNeeded(profilId: number): number {
    const total = this.getProfilQuantity(profilId);
    const inProgress = this.getProfilInProgressCount(profilId);
    return Math.max(0, total - inProgress);
  }

  isProfilEligibleForNewOffer(profilId: number): boolean {
    return this.profilsEligibleForNewOffer.has(profilId);
  }

  hasEligibleProfils(): boolean {
    return this.profilsEligibleForNewOffer.size > 0;
  }

  getEligibleProfils(): any[] {
    if (!this.demande) return [];
    return this.demande.profils.filter(profil =>
      this.profilsEligibleForNewOffer.has(profil.id)
    );
  }

  getProfilStatusMessage(profilId: number): string {
    if (this.isProfilEligibleForNewOffer(profilId)) {
      return 'Peut recevoir une nouvelle offre';
    }
    return 'Candidats en attente ou acceptés - Nouvelle offre non autorisée';
  }

  isProfilExpanded(profilId: number): boolean {
    return this.expandedProfils.has(profilId);
  }

  toggleCreateOffer(): void {
    this.showCreateOffer = !this.showCreateOffer;
    if (this.showCreateOffer) {
      if (this.allCandidates.length === 0) {
        this.loadCandidates();
      }
      // Déplier le premier profil par défaut
      if (this.demande && this.demande.profils.length > 0) {
        this.expandedProfils.add(this.demande.profils[0].id);
      }
    }
  }

  createOffer(): void {
    if (!this.demande) return;

    const totalSelected = this.getTotalSelectedCount();
    if (totalSelected === 0) {
      this.snackBar.open('Veuillez sélectionner au moins un candidat', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // Vérifier qu'au moins un profil a des candidats sélectionnés
    const profilsWithCandidates = Array.from(this.profilCandidates.entries())
      .filter(([_, candidates]) => candidates.size > 0);

    if (profilsWithCandidates.length === 0) {
      this.snackBar.open('Veuillez sélectionner au moins un candidat pour un profil', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // Vérifier que seuls les profils éligibles ont des candidats sélectionnés
    const ineligibleProfils = profilsWithCandidates.filter(
      ([profilId, _]) => !this.profilsEligibleForNewOffer.has(profilId)
    );

    if (ineligibleProfils.length > 0) {
      const profilNames = ineligibleProfils.map(([profilId, _]) => {
        const profil = this.demande!.profils.find(p => p.id === profilId);
        return profil?.profilName || `Profil ${profilId}`;
      }).join(', ');

      this.snackBar.open(
        `Impossible d'envoyer une offre pour: ${profilNames}. Des candidats sont déjà en attente ou acceptés.`,
        'Fermer',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    // Préparer le résumé de TOUS les profils (pas uniquement ceux avec des candidats sélectionnés)
    const profilsSummary: ProfilSummary[] = this.demande.profils.map(profil => {
      const candidateIds = this.profilCandidates.get(profil.id) || new Set<number>();
      const alreadyProposed = this.getProfilInProgressCount(profil.id);
      const selected = candidateIds.size;
      const totalWithNew = alreadyProposed + selected;
      const required = profil.quantity;
      const remaining = Math.max(0, required - totalWithNew);

      return {
        profilName: profil.profilName,
        required: required,
        selected: selected,
        alreadyProposed: alreadyProposed,
        remaining: remaining,
        isComplete: totalWithNew >= required
      };
    });

    const hasIncomplete = profilsSummary.some(p => !p.isComplete);

    // Ouvrir le dialog de confirmation
    const dialogRef = this.dialog.open(ConfirmOfferDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: {
        profils: profilsSummary,
        totalSelected: totalSelected,
        hasIncomplete: hasIncomplete
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.proceedWithOfferCreation(profilsWithCandidates);
      }
    });
  }

  private proceedWithOfferCreation(profilsWithCandidates: [number, Set<number>][]): void {
    if (!this.demande) return;

    this.loadingOffer = true;

    // Si une offre existe déjà pour cette demande, ajouter des candidats à cette offre
    // Sinon, créer une nouvelle offre
    if (this.existingOfferId) {
      console.log('🔄 [OFFER] Ajout de candidats à l\'offre existante:', this.existingOfferId);

      // Ajouter tous les candidats sélectionnés à l'offre existante
      let operationsCompleted = 0;
      const totalOperations = profilsWithCandidates.length;

      const checkCompletion = () => {
        operationsCompleted++;
        if (operationsCompleted === totalOperations) {
          this.loadingOffer = false;
          this.snackBar.open('Candidats ajoutés à l\'offre avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.goBack();
        }
      };

      const handleError = (err: any) => {
        console.error('Erreur lors de l\'ajout de candidats:', err);
        this.loadingOffer = false;
        this.snackBar.open(
          err.error?.message || 'Erreur lors de l\'ajout de candidats',
          'Fermer',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      };

      // Ajouter des candidats pour chaque profil
      profilsWithCandidates.forEach(([profilId, candidateIds]) => {
        this.offerService.addCandidatesToOffer(
          this.demande!.clientId,
          this.existingOfferId!,
          { demandeProfilId: profilId, candidateIds: Array.from(candidateIds) }
        ).subscribe({
          next: () => checkCompletion(),
          error: handleError
        });
      });
    } else {
      console.log('➕ [OFFER] Création d\'une nouvelle offre');

      // Créer une nouvelle offre avec tous les candidats sélectionnés
      const profilsCandidates: { [profilId: number]: number[] } = {};
      profilsWithCandidates.forEach(([profilId, candidateIds]) => {
        profilsCandidates[profilId] = Array.from(candidateIds);
      });

      const request: OfferCreateRequest = {
        demandeId: this.demande.id,
        profilsCandidates
      };

      this.offerService.createOffer(this.demande.clientId, request).subscribe({
        next: () => {
          this.loadingOffer = false;
          this.snackBar.open('Offre créée avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.goBack();
        },
        error: (err) => {
          console.error('Erreur lors de la création de l\'offre:', err);
          this.loadingOffer = false;
          this.snackBar.open(
            err.error?.message || 'Erreur lors de la création de l\'offre',
            'Fermer',
            { duration: 3000, panelClass: ['error-snackbar'] }
          );
        }
      });
    }
  }

  navigateToCandidates(): void {
    this.router.navigate(['/admin/candidates']);
  }

  openUploadCvDialog(): void {
    const dialogRef = this.dialog.open(UploadCvDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recharger les candidats après l'upload
        this.loadCandidates();
        this.snackBar.open('Candidat créé avec succès. Vous pouvez maintenant le sélectionner.', 'Fermer', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }
}
