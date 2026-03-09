import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { DemandeService } from '../../core/services/demande.service';
import { OfferService } from '../../core/services/offer.service';
import { ClientService } from '../../core/services/client.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { OfferResponse } from '../../core/models/offer.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

interface DashboardStats {
  totalDemandes: number;
  demandesActives: number;
  demandesEnAttente: number;
  totalOffres: number;
  offresNouvelles: number;
  candidatsAcceptes: number;
  candidatsEnAttente: number;
  totalContrats: number;
  contratsActifs: number;
}

interface StatusData {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface RecentItem {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  type: 'demande' | 'offer' | 'contract';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  isLoading = true;
  stats: DashboardStats = {
    totalDemandes: 0,
    demandesActives: 0,
    demandesEnAttente: 0,
    totalOffres: 0,
    offresNouvelles: 0,
    candidatsAcceptes: 0,
    candidatsEnAttente: 0,
    totalContrats: 0,
    contratsActifs: 0
  };

  demandesStatus: StatusData[] = [];
  offresStatus: StatusData[] = [];

  recentDemandes: RecentItem[] = [];
  recentOffers: RecentItem[] = [];

  demandes: DemandeResponse[] = [];
  offers: OfferResponse[] = [];

  constructor(
    private demandeService: DemandeService,
    private offerService: OfferService,
    private clientService: ClientService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // 1. Récupérer d'abord le client ID
    this.clientService.getMe().pipe(
      switchMap(client => {
        const clientId = client.id;

        // 2. Charger les demandes, offres et contrats en parallèle
        return forkJoin({
          demandes: this.demandeService.getMyDemandes(0, 100),
          offers: this.offerService.getOffersByClientId(clientId),
          demandesForContracts: this.demandeService.getMyDemandes(0, 100)
        }).pipe(
          switchMap(data => {
            // 3. Charger les contrats pour chaque demande
            const demandesData = data.demandesForContracts.content || [];

            if (demandesData.length === 0) {
              return of({
                demandes: data.demandes,
                offers: data.offers,
                contracts: []
              });
            }

            const contractRequests = demandesData.map((demande: any) =>
              this.http.get<any[]>(`${environment.apiUrl}/contracts/${demande.id}/contracts`).pipe(
                catchError(error => {
                  console.error(`Erreur chargement contrats demande ${demande.id}:`, error);
                  return of<any[]>([]);
                })
              )
            );

            return (forkJoin(contractRequests) as any).pipe(
              switchMap((contractArrays: any[][]) => {
                const allContracts = contractArrays.flat();
                return of({
                  demandes: data.demandes,
                  offers: data.offers,
                  contracts: allContracts
                });
              })
            );
          })
        );
      })
    ).subscribe({
      next: (data: any) => {
        this.demandes = data.demandes.content || [];
        this.offers = data.offers || [];
        const contracts = data.contracts || [];

        this.calculateStats(this.demandes, this.offers, contracts);
        this.prepareChartData(this.demandes, this.offers);
        this.prepareRecentItems(this.demandes, this.offers);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.isLoading = false;
      }
    });
  }

  calculateStats(demandes: DemandeResponse[], offers: OfferResponse[], contracts: any[]): void {
    // Statistiques des demandes
    this.stats.totalDemandes = demandes.length;
    this.stats.demandesActives = demandes.filter(d => d.status === 'ACTIVE' || !d.status).length;
    this.stats.demandesEnAttente = demandes.filter(d => d.status === 'PENDING').length;

    // Statistiques des offres
    this.stats.totalOffres = offers.length;
    this.stats.offresNouvelles = offers.filter(o => o.isNew).length;

    // Compter les candidats
    let acceptedCount = 0;
    let pendingCount = 0;

    offers.forEach(offer => {
      if (offer.proposedCandidates) {
        acceptedCount += offer.proposedCandidates.filter(c => c.status === 'ACCEPTED').length;
        pendingCount += offer.proposedCandidates.filter(c => c.status === 'PROPOSED').length;
      }
    });

    this.stats.candidatsAcceptes = acceptedCount;
    this.stats.candidatsEnAttente = pendingCount;

    // Statistiques des contrats
    this.stats.totalContrats = contracts.length;
    this.stats.contratsActifs = contracts.filter(c => {
      const endDate = new Date(c.endDate);
      return endDate >= new Date();
    }).length;
  }

  prepareChartData(demandes: DemandeResponse[], offers: OfferResponse[]): void {
    // Données pour les graphiques de statut des demandes
    const activeCount = demandes.filter(d => d.status === 'ACTIVE' || !d.status).length;
    const pendingCount = demandes.filter(d => d.status === 'PENDING').length;
    const closedCount = demandes.filter(d => d.status === 'CLOSED').length;

    this.demandesStatus = [
      { label: 'Actives', value: activeCount, color: '#10b981', icon: 'check_circle' },
      { label: 'En attente', value: pendingCount, color: '#f59e0b', icon: 'schedule' },
      { label: 'Fermées', value: closedCount, color: '#6b7280', icon: 'cancel' }
    ];

    // Données pour les offres
    const newOffersCount = offers.filter(o => o.isNew).length;
    const activeOffersCount = offers.filter(o => !o.isNew).length;

    this.offresStatus = [
      { label: 'Nouvelles', value: newOffersCount, color: '#3b82f6', icon: 'fiber_new' },
      { label: 'En cours', value: activeOffersCount, color: '#8b5cf6', icon: 'trending_up' }
    ];
  }

  prepareRecentItems(demandes: DemandeResponse[], offers: OfferResponse[]): void {
    // Dernières demandes (3 max)
    this.recentDemandes = demandes
      .slice(0, 3)
      .map(d => ({
        id: d.id,
        title: d.title,
        subtitle: `${d.totalEmployeesNeeded} postes • ${d.profils.length} profil(s)`,
        date: d.startDate,
        status: d.status || 'ACTIVE',
        type: 'demande' as const
      }));

    // Dernières offres (3 max)
    this.recentOffers = offers
      .slice(0, 3)
      .map(o => ({
        id: o.offerId,
        title: `Offre #${o.offerId}`,
        subtitle: `${o.proposedCandidates?.length || 0} candidat(s) proposé(s)`,
        date: o.createdAt,
        status: o.isNew ? 'NEW' : 'ACTIVE',
        type: 'offer' as const
      }));
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'ACTIVE': '#10b981',
      'PENDING': '#f59e0b',
      'CLOSED': '#6b7280',
      'NEW': '#3b82f6',
      'ACCEPTED': '#10b981',
      'REJECTED': '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'ACTIVE': 'Active',
      'PENDING': 'En attente',
      'CLOSED': 'Fermée',
      'NEW': 'Nouvelle',
      'ACCEPTED': 'Accepté',
      'REJECTED': 'Rejeté'
    };
    return labels[status] || status;
  }
}
