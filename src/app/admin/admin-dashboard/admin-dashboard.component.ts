import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, DashboardStats } from '../../core/services/admin.service';
import { OfferService } from '../../core/services/offer.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;

  statsCards = [
    {
      title: 'Total Clients',
      icon: 'business',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: '/admin/clients',
      key: 'totalClients' as keyof DashboardStats
    },
    {
      title: 'Total Candidats',
      icon: 'people',
      color: '#10b981',
      bgColor: '#ecfdf5',
      route: '/admin/candidates',
      key: 'totalCandidates' as keyof DashboardStats
    },
    {
      title: 'Total Demandes',
      icon: 'assignment',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      route: '/admin/demandes',
      key: 'totalDemandes' as keyof DashboardStats
    },
    {
      title: 'Demandes Actives',
      icon: 'pending_actions',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      route: '/admin/demandes',
      key: 'activeDemandes' as keyof DashboardStats
    }
  ];

  additionalStatsCards = [
    {
      title: 'Total Contrats',
      icon: 'description',
      color: '#ec4899',
      bgColor: '#fdf2f8',
      route: '/admin/contracts',
      key: 'totalContracts' as keyof DashboardStats
    },
    {
      title: 'Total Offres',
      icon: 'local_offer',
      color: '#f97316',
      bgColor: '#fff7ed',
      route: '/admin/offers',
      key: 'totalOffers' as keyof DashboardStats
    }
  ];

  recentActivities = [
    {
      title: 'Demandes en Attente',
      icon: 'hourglass_empty',
      color: '#f59e0b',
      key: 'pendingDemandes' as keyof DashboardStats
    },
    {
      title: 'Demandes Complétées',
      icon: 'check_circle',
      color: '#10b981',
      key: 'completedDemandes' as keyof DashboardStats
    }
  ];

  constructor(
    private adminService: AdminService,
    private offerService: OfferService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;

    // Charger les données de tous les services et calculer les stats localement
    forkJoin({
      clients: this.adminService.getAllClients(0, 10000).pipe(
        map(response => response.content || []),
        catchError(() => of([]))
      ),
      candidates: this.adminService.getAllCandidates().pipe(
        catchError(() => of([]))
      ),
      demandes: this.adminService.getAllDemandes().pipe(
        catchError(() => of([]))
      ),
      offers: this.offerService.getAllOffersAdmin().pipe(
        catchError(() => of([]))
      ),
      contracts: this.adminService.getAllContracts().pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: (data) => {
        // Calculer les statistiques
        const totalClients = data.clients.length;
        const totalCandidates = data.candidates.length;
        const totalDemandes = data.demandes.length;
        const totalOffers = data.offers.length;
        const totalContracts = data.contracts.length;

        // Filtrer les demandes actives (celles qui ne sont pas clôturées)
        const activeDemandes = data.demandes.filter(d => d.status !== 'CLOSED' && d.status !== 'COMPLETED').length;

        // Demandes en attente (statut PENDING ou OPEN)
        const pendingDemandes = data.demandes.filter(d =>
          d.status === 'PENDING' || d.status === 'OPEN'
        ).length;

        // Demandes complétées (statut COMPLETED ou CLOSED)
        const completedDemandes = data.demandes.filter(d =>
          d.status === 'COMPLETED' || d.status === 'CLOSED'
        ).length;

        this.stats = {
          totalClients,
          totalCandidates,
          totalDemandes,
          activeDemandes,
          pendingDemandes,
          completedDemandes,
          totalContracts,
          totalOffers
        } as any;

        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques:', err);
        this.error = 'Erreur lors du chargement des statistiques';
        this.loading = false;

        // Utiliser des données vides en cas d'erreur
        this.stats = {
          totalClients: 0,
          totalCandidates: 0,
          totalDemandes: 0,
          activeDemandes: 0,
          pendingDemandes: 0,
          completedDemandes: 0,
          totalContracts: 0,
          totalOffers: 0
        } as any;
      }
    });
  }

  getStatValue(key: keyof DashboardStats): number {
    return this.stats ? (this.stats as any)[key] || 0 : 0;
  }
}
