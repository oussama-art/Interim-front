import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DemandeService } from '../../core/services/demande.service';
import { DemandeResponse } from '../../core/models/demande.model';

@Component({
  selector: 'app-demandes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './demandes.component.html',
  styleUrl: './demandes.component.scss'
})
export class DemandesComponent implements OnInit {
  demandes: DemandeResponse[] = [];
  isLoading = true;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;

  constructor(
    private demandeService: DemandeService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.isLoading = true;

    // Récupérer les demandes du client authentifié
    this.demandeService.getMyDemandes(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.demandes = response.content || [];
        this.totalElements = response.totalElements || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des demandes:', error);
        this.demandes = [];
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
}
