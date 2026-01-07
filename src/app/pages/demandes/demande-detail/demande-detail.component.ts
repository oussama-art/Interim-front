import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DemandeService } from '../../../core/services/demande.service';
import { ClientService } from '../../../core/services/client.service';
import { DemandeResponse } from '../../../core/models/demande.model';

@Component({
  selector: 'app-demande-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatSnackBarModule
  ],
  templateUrl: './demande-detail.component.html',
  styleUrl: './demande-detail.component.scss'
})
export class DemandeDetailComponent implements OnInit {
  demande: DemandeResponse | null = null;
  isLoading = true;
  demandeId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private demandeService: DemandeService,
    private clientService: ClientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.demandeId = +id;
        this.loadDemandeDetail(this.demandeId);
      } else {
        this.router.navigate(['/app/demandes']);
      }
    });
  }

  loadDemandeDetail(id: number): void {
    this.isLoading = true;
    this.demandeService.getMyDemandeDetail(id).subscribe({
      next: (response) => {
        this.demande = response;
        // Charger les informations du client pour obtenir le titre
        this.loadClientInfo();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails de la demande:', error);
        this.snackBar.open('Erreur lors du chargement des détails de la demande', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
        this.router.navigate(['/app/demandes']);
      }
    });
  }

  loadClientInfo(): void {
    this.clientService.getMe().subscribe({
      next: (client) => {
        if (this.demande) {
          this.demande.clientTitle = client.title;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des informations du client:', error);
        // On continue quand même même si on ne peut pas charger le titre
        this.isLoading = false;
      }
    });
  }

  editDemande(): void {
    if (this.demandeId) {
      this.router.navigate(['/app/demandes/edit', this.demandeId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/app/demandes']);
  }

  getTotalProfilQuantity(): number {
    if (!this.demande?.profils) return 0;
    return this.demande.profils.reduce((sum, profil) => sum + profil.quantity, 0);
  }
}
