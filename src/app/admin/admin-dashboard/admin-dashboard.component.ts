import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { AdminService, DashboardStats } from '../../core/services/admin.service';

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

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques:', err);
        this.error = 'Erreur lors du chargement des statistiques';
        this.loading = false;
        // Use mock data for development
        this.stats = {
          totalClients: 0,
          totalCandidates: 0,
          totalDemandes: 0,
          activeDemandes: 0,
          pendingDemandes: 0,
          completedDemandes: 0
        };
      }
    });
  }

  getStatValue(key: keyof DashboardStats): number {
    return this.stats ? this.stats[key] : 0;
  }
}
