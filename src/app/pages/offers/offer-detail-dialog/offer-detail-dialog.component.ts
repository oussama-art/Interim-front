import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { OfferResponse, OfferProfilGroup, ProposedCandidate } from '../../../core/models/offer.model';
import { OfferService } from '../../../core/services/offer.service';
import { DemandeService } from '../../../core/services/demande.service';
import { DemandeResponse } from '../../../core/models/demande.model';

@Component({
  selector: 'app-offer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  templateUrl: './offer-detail-dialog.component.html',
  styleUrls: ['./offer-detail-dialog.component.scss']
})
export class OfferDetailDialogComponent implements OnInit {
  offer: OfferResponse;
  clientId: number;
  demande: DemandeResponse | null = null;
  profilGroups: OfferProfilGroup[] = [];
  processing = false;
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<OfferDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { offer: OfferResponse; clientId: number },
    private offerService: OfferService,
    private demandeService: DemandeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.offer = data.offer;
    this.clientId = data.clientId;
  }

  ngOnInit(): void {
    this.loadDemandeAndOrganize();
  }

  loadDemandeAndOrganize(): void {
    this.loading = true;
    this.demandeService.getDemandeDetail(this.offer.demandeId).subscribe({
      next: (demande) => {
        this.demande = demande;
        this.organizeByProfil();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la demande:', err);
        this.snackBar.open('Erreur lors du chargement des profils', 'Fermer', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  organizeByProfil(): void {
    if (!this.demande) return;

    // Créer un map des profils avec leurs quantités
    const profilMap = new Map<number, OfferProfilGroup>();

    // Initialiser tous les profils de la demande
    this.demande.profils.forEach(profil => {
      profilMap.set(profil.id, {
        profilId: profil.id,
        profilName: profil.profilName,
        quantityRequested: profil.quantity,
        candidates: [],
        acceptedCount: 0
      });
    });

    // Ajouter les candidats à leurs profils respectifs
    this.offer.proposedCandidates.forEach(candidate => {
      const profilId = candidate.demandeProfilId;
      if (profilId && profilMap.has(profilId)) {
        const group = profilMap.get(profilId)!;
        group.candidates.push(candidate);
        if (candidate.status === 'ACCEPTED') {
          group.acceptedCount++;
        }
      }
    });

    this.profilGroups = Array.from(profilMap.values());
  }

  canAcceptCandidate(profilGroup: OfferProfilGroup): boolean {
    return profilGroup.acceptedCount < profilGroup.quantityRequested;
  }

  acceptCandidate(candidate: ProposedCandidate, profilGroup: OfferProfilGroup): void {
    if (!this.canAcceptCandidate(profilGroup)) {
      this.snackBar.open(
        `Vous avez déjà accepté ${profilGroup.acceptedCount} candidat(s) sur ${profilGroup.quantityRequested} demandé(s) pour ce profil`,
        'Fermer',
        { duration: 4000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    // Vérifier que les dates sont disponibles
    if (!this.demande?.startDate || !this.demande?.endDate) {
      this.snackBar.open('Les dates de la demande ne sont pas disponibles', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.processing = true;

    // Appeler le service pour accepter le candidat
    this.offerService.acceptCandidate(
      this.clientId,
      this.offer.offerId,
      candidate.candidateId,
      this.demande.startDate,
      this.demande.endDate
    ).subscribe({
      next: () => {
        candidate.status = 'ACCEPTED';
        profilGroup.acceptedCount++;
        this.processing = false;
        this.snackBar.open('Candidat accepté avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (err) => {
        console.error('Erreur lors de l\'acceptation du candidat:', err);
        this.processing = false;
        this.snackBar.open(
          err.error?.message || 'Erreur lors de l\'acceptation du candidat',
          'Fermer',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  rejectCandidate(candidate: ProposedCandidate, profilGroup: OfferProfilGroup): void {
    this.processing = true;

    // Appeler le service pour refuser le candidat
    this.offerService.rejectCandidate(this.clientId, this.offer.offerId, candidate.candidateId).subscribe({
      next: () => {
        if (candidate.status === 'ACCEPTED') {
          profilGroup.acceptedCount--;
        }
        candidate.status = 'REJECTED';
        this.processing = false;
        this.snackBar.open('Candidat refusé', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (err) => {
        console.error('Erreur lors du refus du candidat:', err);
        this.processing = false;
        this.snackBar.open(
          err.error?.message || 'Erreur lors du refus du candidat',
          'Fermer',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACCEPTED': return 'primary';
      case 'REJECTED': return 'warn';
      case 'PROPOSED': return 'accent';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACCEPTED': return 'Accepté';
      case 'REJECTED': return 'Refusé';
      case 'PROPOSED': return 'En attente';
      default: return status;
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
