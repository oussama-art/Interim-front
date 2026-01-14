import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

import { OfferService } from '../../core/services/offer.service';
import { OfferResponse } from '../../core/models/offer.model';
import { ClientService } from '../../core/services/client.service';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateResponse } from '../../core/models/user.model';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: '0', overflow: 'hidden', margin: '0' })),
      state('expanded', style({ height: '*', opacity: '1', margin: '1rem 0' })),
      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class OffersComponent implements OnInit {
  offers: OfferResponse[] = [];
  loading = false;
  clientId: number | null = null;
  candidatesDetails: Map<number, CandidateResponse> = new Map();
  expandedOffers = new Set<number>();
  expandedCandidates: Set<number> = new Set();

  constructor(
    private offerService: OfferService,
    private clientService: ClientService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadClientAndOffers();
  }

  loadClientAndOffers(): void {
    this.loading = true;
    this.clientService.getMe().subscribe({
      next: (client) => {
        this.clientId = client.id;
        this.loadOffers();
      },
      error: () => {
        this.showError('Erreur chargement profil');
        this.loading = false;
      }
    });
  }

  loadOffers(): void {
    if (!this.clientId) return;
    this.offerService.getOffersByClientId(this.clientId).subscribe({
      next: (data) => {
        this.offers = data;
        this.loadCandidatesDetails();
      },
      error: () => {
        this.showError('Erreur chargement offres');
        this.loading = false;
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

  acceptCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous retenir ce profil ?')) return;
    this.updateStatus(offerId, candidateId, 'ACCEPTED', 'Candidat retenu avec succès');
  }

  rejectCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous décliner ce candidat ?')) return;
    this.updateStatus(offerId, candidateId, 'REJECTED', 'Candidat décliné');
  }

  private updateStatus(offerId: number, candidateId: number, status: string, message: string) {
    this.offerService.updateCandidateStatus(offerId, candidateId, status).subscribe({
      next: () => {
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
        this.loadOffers();
      },
      error: () => this.showError('Erreur lors de la mise à jour')
    });
  }

  private showError(msg: string) {
    this.snackBar.open(msg, 'Fermer', { duration: 3000 });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}