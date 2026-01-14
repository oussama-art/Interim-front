import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { CandidateResponse } from '../../core/models/user.model';
import { CreateCandidateFormComponent } from './create-candidate-form/create-candidate-form.component';
import { ImportCandidatesComponent } from './import-candidates/import-candidates.component';
import { CandidateDetailDialogComponent } from './candidate-detail-dialog/candidate-detail-dialog.component';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-admin-candidates',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDialogModule,
    CreateCandidateFormComponent,
    ImportCandidatesComponent
  ],
  templateUrl: './admin-candidates.component.html',
  styleUrls: ['./admin-candidates.component.scss']
})
export class AdminCandidatesComponent implements OnInit {
  candidates: CandidateResponse[] = [];
  loading = true;
  showCreateForm = false;
  showImportForm = false;
  displayedColumns: string[] = [
    'id',
    'firstName',
    'lastName',
    'emailAddress',
    'phoneNumber',
    'experienceYear',
    'professional',
    'cin',
    'cssNumber',
    'createdAt',
    'actions'
  ];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.loading = true;
    this.adminService.getAllCandidates().subscribe({
      next: (data) => {
        this.candidates = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des candidats:', err);
        this.snackBar.open('Erreur lors du chargement des candidats', 'Fermer', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  viewCandidate(candidate: CandidateResponse): void {
    const dialogRef = this.dialog.open(CandidateDetailDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { candidate: { ...candidate } },
      panelClass: 'candidate-detail-dialog'
    });

    dialogRef.afterClosed().subscribe((updatedCandidate: CandidateResponse) => {
      if (updatedCandidate) {
        // Mettre à jour le candidat dans la liste avec une nouvelle référence
        const index = this.candidates.findIndex(c => c.id === updatedCandidate.id);
        if (index !== -1) {
          this.candidates[index] = { ...updatedCandidate };
          // Forcer la détection de changement
          this.candidates = [...this.candidates];
        }
      }
    });
  }

  editCandidate(candidate: CandidateResponse): void {
    this.snackBar.open(`Édition du candidat: ${candidate.firstName} ${candidate.lastName}`, 'Fermer', {
      duration: 2000
    });
  }

  deleteCandidate(candidate: CandidateResponse): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer le candidat ${candidate.firstName} ${candidate.lastName} ?`,
        warning: 'Cette action est irréversible et supprimera toutes les données associées (CV, compte Keycloak, etc.).'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.adminService.deleteCandidate(candidate.id).subscribe({
          next: () => {
            this.snackBar.open('Candidat supprimé avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadCandidates();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            const errorMessage = err?.error?.message || 'Erreur lors de la suppression du candidat';
            this.snackBar.open(errorMessage, 'Fermer', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showImportForm = false;
  }

  toggleImportForm(): void {
    this.showImportForm = !this.showImportForm;
    this.showCreateForm = false;
  }

  onCandidateCreated(): void {
    this.showCreateForm = false;
    this.loadCandidates();
  }

  onCandidatesImported(): void {
    this.showImportForm = false;
    this.loadCandidates();
  }

  onFormCancel(): void {
    this.showCreateForm = false;
    this.showImportForm = false;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}
