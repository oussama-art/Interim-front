import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { DemandeDetailDialogComponent } from './demande-detail-dialog/demande-detail-dialog.component';

@Component({
  selector: 'app-admin-demandes',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.scss']
})
export class AdminDemandesComponent implements OnInit {
  demandes: DemandeResponse[] = [];
  loading = true;
  displayedColumns: string[] = [
    'id',
    'clientTitle',
    'title',
    'description',
    'totalEmployeesNeeded',
    'nombreProfils',
    'actions'
  ];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading = true;
    this.adminService.getAllDemandes().subscribe({
      next: (data) => {
        this.demandes = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes:', err);
        this.snackBar.open('Erreur lors du chargement des demandes', 'Fermer', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  getTotalEmployees(): number {
    return this.demandes.reduce((sum, demande) => sum + demande.totalEmployeesNeeded, 0);
  }

  getTotalProfils(): number {
    const allProfils = this.demandes.flatMap(d => d.profils);
    return allProfils.reduce((sum, profil) => sum + profil.quantity, 0);
  }

  viewDemande(demande: DemandeResponse): void {
    const dialogRef = this.dialog.open(DemandeDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { demande },
      panelClass: 'demande-detail-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Offre créée avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  editDemande(demande: DemandeResponse): void {
    this.snackBar.open(`Édition de la demande: ${demande.title}`, 'Fermer', {
      duration: 2000
    });
  }

  deleteDemande(demande: DemandeResponse): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la demande "${demande.title}" ?`)) {
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
}
