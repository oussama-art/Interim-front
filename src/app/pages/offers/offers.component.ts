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

// Services & Models (Assurez-vous que les chemins sont corrects)
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
      transition('expanded <=> collapsed', animate('300ms ease-in-out'))
    ])
  ]
})
export class OffersComponent implements OnInit {
  offers: OfferResponse[] = [];
  loading = false;
  clientId: number | null = null;
  candidatesDetails: Map<number, CandidateResponse> = new Map();
  expandedOffers: Set<number> = new Set();
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
      error: (err) => {
        this.showError('Erreur lors du chargement du profil client');
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
        this.showError('Erreur lors du chargement des offres');
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

  getCandidateDetail(candidateId: number): CandidateResponse | undefined {
    return this.candidatesDetails.get(candidateId);
  }

  toggleCandidates(offerId: number): void {
    this.expandedOffers.has(offerId) ? this.expandedOffers.delete(offerId) : this.expandedOffers.add(offerId);
  }

  isCandidatesExpanded(offerId: number): boolean {
    return this.expandedOffers.has(offerId);
  }

  acceptCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous accepter ce candidat ?')) return;
    this.updateStatus(offerId, candidateId, 'ACCEPTED', 'Candidat accepté');
  }

  rejectCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous refuser ce candidat ?')) return;
    this.updateStatus(offerId, candidateId, 'REJECTED', 'Candidat refusé');
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
  toggleCandidateDetails(candidateId: number): void {
  if (this.expandedCandidates.has(candidateId)) {
    this.expandedCandidates.delete(candidateId);
  } else {
    this.expandedCandidates.add(candidateId);
  }
}
} 