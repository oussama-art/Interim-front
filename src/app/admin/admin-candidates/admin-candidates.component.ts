import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '../../core/services/admin.service';
import { CandidateResponse } from '../../core/models/user.model';

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
    MatSnackBarModule
  ],
  templateUrl: './admin-candidates.component.html',
  styleUrls: ['./admin-candidates.component.scss']
})
export class AdminCandidatesComponent implements OnInit {
  candidates: CandidateResponse[] = [];
  loading = true;
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
    private snackBar: MatSnackBar
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
    this.snackBar.open(`Affichage du candidat: ${candidate.firstName} ${candidate.lastName}`, 'Fermer', {
      duration: 2000
    });
  }

  editCandidate(candidate: CandidateResponse): void {
    this.snackBar.open(`Édition du candidat: ${candidate.firstName} ${candidate.lastName}`, 'Fermer', {
      duration: 2000
    });
  }

  deleteCandidate(candidate: CandidateResponse): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le candidat ${candidate.firstName} ${candidate.lastName} ?`)) {
      this.adminService.deleteCandidate(candidate.id).subscribe({
        next: () => {
          this.snackBar.open('Candidat supprimé avec succès', 'Fermer', {
            duration: 3000
          });
          this.loadCandidates();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.snackBar.open('Erreur lors de la suppression du candidat', 'Fermer', {
            duration: 3000
          });
        }
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}
