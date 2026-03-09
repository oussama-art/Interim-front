import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DemandeService } from '../../core/services/demande.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmDialogComponent } from '../offers/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-demandes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './demandes.component.html',
  styleUrl: './demandes.component.scss'
})
export class DemandesComponent implements OnInit, OnDestroy {
  demandes: DemandeResponse[] = [];
  filteredDemandes: DemandeResponse[] = [];
  isLoading = true;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  private destroy$ = new Subject<void>();

  // Filtres
  filterName: string = '';
  filterReference: string = '';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;

  constructor(
    private demandeService: DemandeService,
    private router: Router,
    private snackBar: MatSnackBar,
    private globalSearchService: GlobalSearchService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDemandes();

    // Écouter les changements de recherche globale
    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterName = query;
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchService.clearSearch();
  }

  loadDemandes(): void {
    this.isLoading = true;

    // Récupérer les demandes du client authentifié
    this.demandeService.getMyDemandes(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.demandes = response.content || [];
        this.filteredDemandes = [...this.demandes];
        this.totalElements = response.totalElements || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des demandes:', error);
        this.demandes = [];
        this.filteredDemandes = [];
        this.isLoading = false;
      }
    });
  }

  editDemande(demande: DemandeResponse): void {
    // Naviguer vers le composant de modification avec l'ID de la demande
    this.router.navigate(['/app/demandes/edit', demande.id]);
  }

  viewDemandeDetail(demande: DemandeResponse): void {
    // Naviguer vers le composant de détail avec l'ID de la demande
    this.router.navigate(['/app/demandes/detail', demande.id]);
  }

  onStartDateChange(): void {
    // Si la date de fin est antérieure à la date de début, réinitialiser la date de fin
    if (this.filterStartDate && this.filterEndDate && this.filterEndDate < this.filterStartDate) {
      this.filterEndDate = null;
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDemandes = this.demandes.filter(demande => {
      // Filtre par nom (titre ou référence)
      const matchesName = !this.filterName ||
        demande.title.toLowerCase().includes(this.filterName.toLowerCase()) ||
        (demande.reference && demande.reference.toLowerCase().includes(this.filterName.toLowerCase()));

      // Filtre par référence spécifique
      const matchesReference = !this.filterReference ||
        (demande.reference && demande.reference.toLowerCase().includes(this.filterReference.toLowerCase()));

      // Filtre par chevauchement de dates
      let matchesDateRange = true;

      if (this.filterStartDate && this.filterEndDate) {
        // Les deux dates : la demande doit chevaucher l'intervalle
        // Chevauchement si: demande.startDate <= filterEndDate ET demande.endDate >= filterStartDate
        const demandeStart = new Date(demande.startDate);
        const demandeEnd = new Date(demande.endDate);
        const filterStart = new Date(this.filterStartDate);
        const filterEnd = new Date(this.filterEndDate);

        matchesDateRange = demandeStart <= filterEnd && demandeEnd >= filterStart;
      } else if (this.filterStartDate) {
        // Seulement date début : afficher les demandes qui se terminent à partir de cette date
        matchesDateRange = new Date(demande.endDate) >= new Date(this.filterStartDate);
      } else if (this.filterEndDate) {
        // Seulement date fin : afficher les demandes qui commencent avant cette date
        matchesDateRange = new Date(demande.startDate) <= new Date(this.filterEndDate);
      }

      return matchesName && matchesReference && matchesDateRange;
    });
  }

  clearFilters(): void {
    this.filterName = '';
    this.filterReference = '';
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filteredDemandes = [...this.demandes];
  }

  closeDemande(demandeId: number): void {
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
          'Vous ne pourrez plus accepter de nouveaux candidats pour cette demande',
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

            // Recharger les demandes pour mettre à jour l'affichage
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
