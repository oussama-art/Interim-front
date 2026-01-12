import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { OfferService } from '../../core/services/offer.service';
import { OfferResponse, ProposedCandidate } from '../../core/models/offer.model';
import { ClientService } from '../../core/services/client.service';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateResponse } from '../../core/models/user.model';
import { forkJoin } from 'rxjs';

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
      state('collapsed', style({
        height: '0',
        overflow: 'hidden',
        opacity: 0
      })),
      state('expanded', style({
        height: '*',
        overflow: 'visible',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class OffersComponent implements OnInit {
  offers: OfferResponse[] = [];
  loading = false;
  clientId: number | null = null;
  candidatesDetails: Map<number, CandidateResponse> = new Map();
  expandedOffers: Set<number> = new Set();

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
        console.error('Erreur lors du chargement du client:', err);
        this.snackBar.open('Erreur lors du chargement du profil client', 'Fermer', {
          duration: 3000
        });
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
      error: (err) => {
        console.error('Erreur lors du chargement des offres:', err);
        this.snackBar.open('Erreur lors du chargement des offres', 'Fermer', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  loadCandidatesDetails(): void {
    const candidateIds: number[] = [];

    this.offers.forEach(offer => {
      offer.proposedCandidates.forEach(candidate => {
        if (!candidateIds.includes(candidate.candidateId)) {
          candidateIds.push(candidate.candidateId);
        }
      });
    });

    if (candidateIds.length === 0) {
      this.loading = false;
      return;
    }

    const requests = candidateIds.map(id =>
      this.candidateService.getCandidateById(id)
    );

    forkJoin(requests).subscribe({
      next: (candidates) => {
        candidates.forEach(candidate => {
          this.candidatesDetails.set(candidate.id, candidate);
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails des candidats:', err);
        this.loading = false;
      }
    });
  }

  getCandidateDetail(candidateId: number): CandidateResponse | undefined {
    return this.candidatesDetails.get(candidateId);
  }

  toggleCandidates(offerId: number): void {
    if (this.expandedOffers.has(offerId)) {
      this.expandedOffers.delete(offerId);
    } else {
      this.expandedOffers.add(offerId);
    }
  }

  isCandidatesExpanded(offerId: number): boolean {
    return this.expandedOffers.has(offerId);
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Active',
      'closed': 'Fermée',
      'filled': 'Pourvue'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  acceptCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous accepter ce candidat ?')) return;

    this.offerService.updateCandidateStatus(offerId, candidateId, 'ACCEPTED').subscribe({
      next: () => {
        this.snackBar.open('Candidat accepté avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadOffers();
      },
      error: (err) => {
        console.error('Erreur lors de l\'acceptation du candidat:', err);
        this.snackBar.open('Erreur lors de l\'acceptation du candidat', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  rejectCandidate(offerId: number, candidateId: number): void {
    if (!confirm('Voulez-vous refuser ce candidat ?')) return;

    this.offerService.updateCandidateStatus(offerId, candidateId, 'REJECTED').subscribe({
      next: () => {
        this.snackBar.open('Candidat refusé', 'Fermer', {
          duration: 3000
        });
        this.loadOffers();
      },
      error: (err) => {
        console.error('Erreur lors du refus du candidat:', err);
        this.snackBar.open('Erreur lors du refus du candidat', 'Fermer', {
          duration: 3000
        });
      }
    });
  }
}
