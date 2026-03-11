import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OfferProfilGroup } from '../../../core/models/offer.model';
import { OfferService } from '../../../core/services/offer.service';
import { CandidateResponse } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import { CvViewerDialogComponent } from '../cv-viewer-dialog/cv-viewer-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profil-candidates-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './profil-candidates-dialog.component.html',
  styleUrls: ['./profil-candidates-dialog.component.scss']
})
export class ProfilCandidatesDialogComponent {
  profilGroup?: OfferProfilGroup;
  allProfils?: OfferProfilGroup[];
  showAllProfils: boolean;
  offerId: number;
  clientId: number;
  candidatesDetails: Map<number, CandidateResponse>;
  startDate?: string;
  endDate?: string;
  demandeStatus?: string;
  processing = false;
  expandedCandidates = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<ProfilCandidatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      profilGroup?: OfferProfilGroup;
      allProfils?: OfferProfilGroup[];
      offerId: number;
      clientId: number;
      candidatesDetails: Map<number, CandidateResponse>;
      startDate?: string;
      endDate?: string;
      demandeStatus?: string;
      showAllProfils?: boolean;
    },
    private offerService: OfferService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.profilGroup = data.profilGroup;
    this.allProfils = data.allProfils;
    this.showAllProfils = data.showAllProfils || false;
    this.offerId = data.offerId;
    this.clientId = data.clientId;
    this.candidatesDetails = data.candidatesDetails;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.demandeStatus = data.demandeStatus;
  }

  isDemandeClosed(): boolean {
    return this.demandeStatus === 'CLOSED' || this.demandeStatus === 'REJECTED';
  }

  toggleCandidateDetails(candidateId: number): void {
    if (this.expandedCandidates.has(candidateId)) {
      this.expandedCandidates.delete(candidateId);
    } else {
      this.expandedCandidates.add(candidateId);
    }
  }

  getCandidateDetail(candidateId: number): CandidateResponse | undefined {
    return this.candidatesDetails.get(candidateId);
  }

  canAcceptCandidate(profilGroup?: OfferProfilGroup): boolean {
    const group = profilGroup || this.profilGroup;
    if (!group) return false;
    return group.acceptedCount < group.quantityRequested;
  }

  acceptCandidate(candidateId: number, profilGroup?: OfferProfilGroup): void {
    const group = profilGroup || this.profilGroup;
    if (!group) return;

    if (!this.canAcceptCandidate(group)) {
      this.snackBar.open(
        `Vous avez déjà accepté ${group.acceptedCount} candidat(s) sur ${group.quantityRequested} demandé(s) pour ce profil`,
        'Fermer',
        { duration: 4000, panelClass: ['error-snackbar'] }
      );
      return;
    }

    // Vérifier que les dates sont disponibles
    if (!this.startDate || !this.endDate) {
      this.snackBar.open('Les dates de la demande ne sont pas disponibles', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Afficher le dialogue de confirmation
    const candidate = this.candidatesDetails.get(candidateId);
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'ce candidat';

    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Retenir ce candidat',
        message: `Êtes-vous sûr de vouloir retenir ${candidateName} pour ce profil ?`,
        confirmText: 'Oui, retenir',
        cancelText: 'Annuler',
        type: 'accept',
        details: [
          `Profil : ${group.profilName}`,
          `Places restantes : ${group.quantityRequested - group.acceptedCount}`
        ]
      } as ConfirmDialogData
    });

    confirmDialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.processing = true;
      this.offerService.acceptCandidate(
        this.clientId,
        this.offerId,
        candidateId,
        this.startDate!,
        this.endDate!
      ).subscribe({
        next: () => {
          this.snackBar.open('Candidat accepté avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });

          // Mettre à jour le statut local
          const group = profilGroup || this.profilGroup;
          if (group) {
            const candidate = group.candidates.find(c => c.candidateId === candidateId);
            if (candidate) {
              candidate.status = 'ACCEPTED';
              group.acceptedCount++;
            }
          }

          this.processing = false;
          this.dialogRef.close({ action: 'accepted', candidateId });
        },
        error: (err) => {
          console.error('Erreur lors de l\'acceptation:', err);
          this.snackBar.open('Erreur lors de l\'acceptation du candidat', 'Fermer', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.processing = false;
        }
      });
    });
  }

  rejectCandidate(candidateId: number): void {
    // Afficher le dialogue de confirmation
    const candidate = this.candidatesDetails.get(candidateId);
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'ce candidat';

    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Décliner le candidat',
        message: `Êtes-vous sûr de vouloir décliner ${candidateName} ?`,
        confirmText: 'Oui, décliner',
        cancelText: 'Annuler',
        type: 'reject',
        details: [
          'Cette action ne peut pas être annulée',
          'Le candidat sera informé de votre décision'
        ]
      } as ConfirmDialogData
    });

    confirmDialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.processing = true;
      this.offerService.rejectCandidate(this.clientId, this.offerId, candidateId).subscribe({
        next: () => {
          this.snackBar.open('Candidat refusé', 'Fermer', {
            duration: 3000,
            panelClass: ['info-snackbar']
          });

          // Mettre à jour le statut local
          if (this.profilGroup) {
            const candidate = this.profilGroup.candidates.find(c => c.candidateId === candidateId);
            if (candidate) {
              candidate.status = 'REJECTED';
            }
          }
          // Mettre à jour aussi dans allProfils si nécessaire
          if (this.allProfils) {
            for (const profil of this.allProfils) {
              const candidate = profil.candidates.find(c => c.candidateId === candidateId);
              if (candidate) {
                candidate.status = 'REJECTED';
                break;
              }
            }
          }

          this.processing = false;
          this.dialogRef.close({ action: 'rejected', candidateId });
        },
        error: (err) => {
          console.error('Erreur lors du refus:', err);
          this.snackBar.open('Erreur lors du refus du candidat', 'Fermer', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.processing = false;
        }
      });
    });
  }

  viewCv(candidateId: number): void {
    // Bloquer l'accès aux CV si la demande est clôturée
    if (this.isDemandeClosed()) {
      this.snackBar.open('Accès au CV bloqué pour les demandes clôturées', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const candidate = this.candidatesDetails.get(candidateId);
    if (!candidate) return;

    const url = `${environment.apiUrl}/candidates/${candidateId}/cv`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const candidateName = `${candidate.firstName} ${candidate.lastName}`;

        this.dialog.open(CvViewerDialogComponent, {
          width: '90vw',
          maxWidth: '1200px',
          height: '90vh',
          data: {
            pdfUrl: blobUrl,
            candidateName: candidateName,
            mimeType: blob.type
          },
          panelClass: 'cv-viewer-dialog'
        });
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement du CV', 'Fermer', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getTotalCandidatesCount(): number {
    if (!this.allProfils) return 0;
    return this.allProfils.reduce((total, profil) => total + profil.candidates.length, 0);
  }

  close(): void {
    this.dialogRef.close();
  }
}
