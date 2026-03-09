import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

import { OfferService } from '../../core/services/offer.service';
import { OfferResponse } from '../../core/models/offer.model';
import { DemandeService } from '../../core/services/demande.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateResponse } from '../../core/models/user.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../pages/offers/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './admin-offers.component.html',
  styleUrl: './admin-offers.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: '0', overflow: 'hidden', margin: '0' })),
      state('expanded', style({ height: '*', opacity: '1', margin: '1rem 0' })),
      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class AdminOffersComponent implements OnInit {
  offers: OfferResponse[] = [];
  loading = false;
  candidatesDetails: Map<number, CandidateResponse> = new Map();
  demandesDetails: Map<number, DemandeResponse> = new Map();
  expandedOffers = new Set<number>();
  expandedCandidates: Set<number> = new Set();

  constructor(
    private offerService: OfferService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private demandeService: DemandeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAllOffers();
  }

  loadAllOffers(): void {
    this.loading = true;
    this.offerService.getAllOffersAdmin().subscribe({
      next: (data) => {
        this.offers = data;
        this.loadDemandeReferences();
      },
      error: () => {
        this.showError('Erreur chargement offres');
        this.loading = false;
      }
    });
  }

  loadDemandeReferences(): void {
    const demandeIds = new Set<number>();
    this.offers.forEach(offer => demandeIds.add(offer.demandeId));

    if (demandeIds.size === 0) {
      this.loadCandidatesDetails();
      return;
    }

    const requests = Array.from(demandeIds).map(id => this.demandeService.getDemandeById(id));
    forkJoin(requests).subscribe({
      next: (demandes) => {
        demandes.forEach((demande) => {
          this.demandesDetails.set(demande.id!, demande);

          const offer = this.offers.find(o => o.demandeId === demande.id);
          if (offer) {
            offer.demandeReference = demande.reference;
          }
        });
        this.loadCandidatesDetails();
      },
      error: () => {
        this.showError('Erreur chargement références demandes');
        this.loadCandidatesDetails();
      }
    });
  }

  loadCandidatesDetails(): void {
    const candidateIds = new Set<number>();
    this.offers.forEach(offer => {
      offer.proposedCandidates.forEach(c => candidateIds.add(c.candidateId));
    });

    if (candidateIds.size === 0) {
      this.loading = false;
      return;
    }

    const requests = Array.from(candidateIds).map(id => this.candidateService.getCandidateById(id));
    forkJoin(requests).subscribe({
      next: (candidates) => {
        candidates.forEach(c => this.candidatesDetails.set(c.id, c));
        this.loading = false;
      },
      error: () => {
        this.showError('Erreur détails candidats');
        this.loading = false;
      }
    });
  }

  toggleCandidates(offerId: number): void {
    this.expandedOffers.has(offerId) ? this.expandedOffers.delete(offerId) : this.expandedOffers.add(offerId);
  }

  toggleCandidateDetails(candidateId: number): void {
    this.expandedCandidates.has(candidateId) ? this.expandedCandidates.delete(candidateId) : this.expandedCandidates.add(candidateId);
  }

  isCandidatesExpanded(offerId: number): boolean {
    return this.expandedOffers.has(offerId);
  }

  getCandidateDetail(candidateId: number) {
    return this.candidatesDetails.get(candidateId);
  }

  viewCv(candidateId: number): void {
    const url = `${environment.apiUrl}/candidates/${candidateId}/cv`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: () => {
        this.showError('Erreur lors du chargement du CV');
      }
    });
  }

  private showError(msg: string) {
    this.snackBar.open(msg, 'Fermer', { duration: 3000 });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getAcceptedCount(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    return offer.proposedCandidates.filter(c => c.status === 'ACCEPTED').length;
  }

  getRejectedCount(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    return offer.proposedCandidates.filter(c => c.status === 'REJECTED').length;
  }

  getTotalNeeded(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    const demande = this.demandesDetails.get(offer.demandeId);
    return demande?.totalEmployeesNeeded || 0;
  }

  isMaxReached(offerId: number): boolean {
    return this.getAcceptedCount(offerId) >= this.getTotalNeeded(offerId);
  }

  getClientName(clientId: number): string {
    // À implémenter si vous avez besoin du nom du client
    return `Client #${clientId}`;
  }

  closeDemande(offerId: number, demandeId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '550px',
      data: {
        title: 'Clôturer la demande',
        message: 'Êtes-vous sûr de vouloir clôturer cette demande ?',
        confirmText: 'Clôturer',
        cancelText: 'Annuler',
        type: 'warn',
        details: [
          'Les candidats en attente (PROPOSED) seront automatiquement retirés',
          'Les candidats acceptés (ACCEPTED) continueront leur processus normalement',
          'Le client ne pourra plus accepter de nouveaux candidats',
          'Cette action est irréversible'
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.demandeService.closeDemande(demandeId).subscribe({
          next: (response) => {
            this.snackBar.open('Demande clôturée avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Recharger les offres pour mettre à jour l'affichage
            this.loadAllOffers();
          },
          error: (error) => {
            console.error('Erreur lors de la clôture:', error);
            this.snackBar.open(
              error.message || 'Erreur lors de la clôture de la demande',
              'Fermer',
              { duration: 5000, panelClass: ['error-snackbar'] }
            );
          }
        });
      }
    });
  }

  getDemandeStatus(demandeId: number): string {
    const demande = this.demandesDetails.get(demandeId);
    return demande?.status || 'UNKNOWN';
  }

  isDemandeOpen(demandeId: number): boolean {
    const status = this.getDemandeStatus(demandeId);
    return status === 'IN_PROGRESS';
  }

  deleteOffer(offerId: number, demandeReference: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '550px',
      data: {
        title: 'Supprimer l\'offre',
        message: `Êtes-vous sûr de vouloir supprimer l'offre #${offerId} (${demandeReference}) ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'warn',
        details: [
          'Cette action est irréversible',
          'Toutes les propositions de candidats seront supprimées',
          'Les candidats déjà acceptés ne seront pas affectés'
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.delete(`${environment.apiUrl}/offers/${offerId}`).subscribe({
          next: () => {
            this.snackBar.open('Offre supprimée avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Recharger les offres pour mettre à jour l'affichage
            this.loadAllOffers();
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.snackBar.open(
              error.error?.message || 'Erreur lors de la suppression de l\'offre',
              'Fermer',
              { duration: 5000, panelClass: ['error-snackbar'] }
            );
          }
        });
      }
    });
  }
}
