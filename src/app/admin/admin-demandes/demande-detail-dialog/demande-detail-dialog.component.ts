import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DemandeResponse } from '../../../core/models/demande.model';
import { CandidateResponse } from '../../../core/models/user.model';
import { CandidateService } from '../../../core/services/candidate.service';
import { OfferService } from '../../../core/services/offer.service';
import { OfferCreateRequest } from '../../../core/models/offer.model';

@Component({
  selector: 'app-demande-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatCheckboxModule
  ],
  templateUrl: './demande-detail-dialog.component.html',
  styleUrls: ['./demande-detail-dialog.component.scss']
})
export class DemandeDetailDialogComponent implements OnInit {
  demande: DemandeResponse;
  candidates: CandidateResponse[] = [];
  selectedCandidates: Set<number> = new Set();
  loadingCandidates = false;
  loadingOffer = false;
  showCreateOffer = false;
  currentPage = 0;
  pageSize = 50;
  totalCandidates = 0;

  constructor(
    public dialogRef: MatDialogRef<DemandeDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { demande: DemandeResponse },
    private candidateService: CandidateService,
    private offerService: OfferService,
    private snackBar: MatSnackBar
  ) {
    this.demande = data.demande;
  }

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.loadingCandidates = true;
    this.candidateService.getCandidatesPage(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.candidates = response.content;
        this.totalCandidates = response.totalElements;
        this.loadingCandidates = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des candidats:', err);
        this.snackBar.open('Erreur lors du chargement des candidats', 'Fermer', {
          duration: 3000
        });
        this.loadingCandidates = false;
      }
    });
  }

  toggleCandidate(candidateId: number): void {
    if (this.selectedCandidates.has(candidateId)) {
      this.selectedCandidates.delete(candidateId);
    } else {
      this.selectedCandidates.add(candidateId);
    }
  }

  isCandidateSelected(candidateId: number): boolean {
    return this.selectedCandidates.has(candidateId);
  }

  toggleCreateOffer(): void {
    this.showCreateOffer = !this.showCreateOffer;
    if (this.showCreateOffer && this.candidates.length === 0) {
      this.loadCandidates();
    }
  }

  createOffer(): void {
    if (this.selectedCandidates.size === 0) {
      this.snackBar.open('Veuillez sélectionner au moins un candidat', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.loadingOffer = true;
    const request: OfferCreateRequest = {
      demandeId: this.demande.id,
      candidateIds: Array.from(this.selectedCandidates)
    };

    this.offerService.createOffer(this.demande.clientId, request).subscribe({
      next: (response) => {
        this.snackBar.open('Offre créée avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadingOffer = false;
        this.dialogRef.close(response);
      },
      error: (err) => {
        console.error('Erreur lors de la création de l\'offre:', err);
        this.snackBar.open('Erreur lors de la création de l\'offre', 'Fermer', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loadingOffer = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
