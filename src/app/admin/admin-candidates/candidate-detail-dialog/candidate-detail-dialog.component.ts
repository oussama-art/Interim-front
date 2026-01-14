import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CandidateResponse } from '../../../core/models/user.model';
import { CandidateService } from '../../../core/services/candidate.service';
import { HttpClient } from '@angular/common/http';
import { getApiUrl } from '../../../core/config/api.config';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-candidate-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './candidate-detail-dialog.component.html',
  styleUrls: ['./candidate-detail-dialog.component.scss']
})
export class CandidateDetailDialogComponent {
  candidate: CandidateResponse;
  uploading = false;

  constructor(
    public dialogRef: MatDialogRef<CandidateDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { candidate: CandidateResponse },
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.candidate = data.candidate;
  }

  close(): void {
    this.dialogRef.close(this.candidate);
  }

  hasCv(): boolean {
    return !!this.candidate.cvPath && this.candidate.cvPath.trim() !== '';
  }

  getCvUrl(): string | null {
    if (!this.candidate.cvPath) {
      return null;
    }
    // Si le cvPath commence par http, c'est déjà une URL complète
    if (this.candidate.cvPath.startsWith('http')) {
      return this.candidate.cvPath;
    }
    // Sinon, construire l'URL complète
    // Enlever /api de apiUrl et ajouter le cvPath
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${this.candidate.cvPath}`;
  }

  downloadCV(): void {
    const cvUrl = this.getCvUrl();
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    if (file.type !== 'application/pdf') {
      this.snackBar.open('Veuillez sélectionner un fichier PDF', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Le fichier ne doit pas dépasser 5 MB', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.uploadCV(file);
  }

  uploadCV(file: File): void {
    this.uploading = true;
    const formData = new FormData();
    formData.append('cv', file);

    const url = getApiUrl(`/candidates/${this.candidate.id}/cv`);

    this.http.patch<CandidateResponse>(url, formData).subscribe({
      next: (response) => {
        this.candidate = response;
        this.snackBar.open('CV uploadé avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.uploading = false;
      },
      error: (err) => {
        console.error('Erreur lors de l\'upload du CV:', err);
        this.snackBar.open('Erreur lors de l\'upload du CV', 'Fermer', {
          duration: 3000
        });
        this.uploading = false;
      }
    });
  }
}
