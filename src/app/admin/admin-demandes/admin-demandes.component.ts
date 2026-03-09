import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { AdminService } from '../../core/services/admin.service';
import { DemandeService } from '../../core/services/demande.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { ConfirmDialogComponent } from '../../pages/offers/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-demandes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.scss']
})
export class AdminDemandesComponent implements OnInit {
  demandes: DemandeResponse[] = [];
  filteredDemandes: DemandeResponse[] = [];
  loading = true;

  // Filtres
  startDateFilter: Date | null = null;
  endDateFilter: Date | null = null;
  statusFilter: string = 'ALL';
  dateRangeError: string = '';
  displayedColumns: string[] = [
    'id',
    'title',
    'startDate',
    'endDate',
    'totalEmployeesNeeded',
    'status',
    'actions',
    'closeAction'
  ];

  constructor(
    private adminService: AdminService,
    private demandeService: DemandeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading = true;
    this.adminService.getAllDemandes().subscribe({
      next: (data) => {
        this.demandes = data;
        this.filteredDemandes = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes:', err);
        if (!this.errorHandler.isSessionExpired(err)) {
          this.errorHandler.handleError(err, '❌ Erreur lors du chargement des demandes');
        }
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.validateDateRange();

    let filtered = [...this.demandes];

    // Filtre par date de début
    if (this.startDateFilter) {
      filtered = filtered.filter(demande => {
        const demandeStartDate = new Date(demande.startDate);
        return demandeStartDate >= this.startDateFilter!;
      });
    }

    // Filtre par date de fin
    if (this.endDateFilter) {
      filtered = filtered.filter(demande => {
        const demandeEndDate = new Date(demande.endDate);
        return demandeEndDate <= this.endDateFilter!;
      });
    }

    // Filtre par statut
    if (this.statusFilter && this.statusFilter !== 'ALL') {
      filtered = filtered.filter(demande => demande.status === this.statusFilter);
    }

    this.filteredDemandes = filtered;
  }

  validateDateRange(): void {
    if (this.startDateFilter && this.endDateFilter) {
      if (this.startDateFilter > this.endDateFilter) {
        this.dateRangeError = 'La date de fin doit être après la date de début';
      } else {
        this.dateRangeError = '';
      }
    } else {
      this.dateRangeError = '';
    }
  }

  clearFilters(): void {
    this.startDateFilter = null;
    this.endDateFilter = null;
    this.statusFilter = 'ALL';
    this.dateRangeError = '';
    this.applyFilters();
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.startDateFilter) count++;
    if (this.endDateFilter) count++;
    if (this.statusFilter && this.statusFilter !== 'ALL') count++;
    return count;
  }

  getTotalEmployees(): number {
    return this.filteredDemandes.reduce((sum, demande) => sum + demande.totalEmployeesNeeded, 0);
  }

  getTotalProfils(): number {
    const allProfils = this.filteredDemandes.flatMap(d => d.profils);
    return allProfils.reduce((sum, profil) => sum + profil.quantity, 0);
  }

  viewDemande(demande: DemandeResponse): void {
    this.router.navigate(['/admin/demandes', demande.id]);
  }

  editDemande(demande: DemandeResponse): void {
    this.snackBar.open(`Édition de la demande: ${demande.title}`, 'Fermer', {
      duration: 2000
    });
  }

  deleteDemande(demande: DemandeResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Supprimer la demande',
        message: `Êtes-vous sûr de vouloir supprimer la demande "${demande.title}" ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'warn',
        details: [
          'Cette action est irréversible',
          'Toutes les offres liées seront impactées',
          `${demande.totalEmployeesNeeded} poste(s) concerné(s)`
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminService.deleteDemande(demande.id).subscribe({
          next: () => {
            this.snackBar.open('Demande supprimée avec succès', 'Fermer', {
              duration: 3000
            });
            this.loadDemandes();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            this.snackBar.open('Erreur lors de la suppression de la demande', 'Fermer', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  }

  isDemandeClosed(demande: DemandeResponse): boolean {
    return demande.status === 'CLOSED' || demande.status === 'REJECTED';
  }

  getDemandeStatusLabel(status?: string): string {
    switch(status) {
      case 'IN_PROGRESS':
        return 'En cours';
      case 'CLOSED':
        return 'Clôturée';
      case 'REJECTED':
        return 'Rejetée';
      default:
        return 'Inconnu';
    }
  }

  getDemandeStatusClass(status?: string): string {
    switch(status) {
      case 'IN_PROGRESS':
        return 'status-in-progress';
      case 'CLOSED':
        return 'status-closed';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-unknown';
    }
  }

  closeDemande(demande: DemandeResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '550px',
      data: {
        title: 'Clôturer la demande',
        message: `Êtes-vous sûr de vouloir clôturer la demande "${demande.title}" ?`,
        confirmText: 'Clôturer',
        cancelText: 'Annuler',
        type: 'warn',
        details: [
          'Les candidats en attente (PROPOSED) seront automatiquement retirés',
          'Les candidats acceptés (ACCEPTED) continueront leur processus normalement',
          'Vous ne pourrez plus accepter de nouveaux candidats pour cette demande',
          'Cette action est irréversible'
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.demandeService.closeDemande(demande.id).subscribe({
          next: () => {
            this.snackBar.open('Demande clôturée avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadDemandes();
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

  isDemandeOpen(demande: DemandeResponse): boolean {
    return demande.status === 'IN_PROGRESS';
  }
}
