import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CandidateResponse } from '../../../core/models/user.model';
import { CandidateService } from '../../../core/services/candidate.service';
import { HttpClient } from '@angular/common/http';
import { getApiUrl } from '../../../core/config/api.config';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-candidate-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './candidate-detail-page.component.html',
  styleUrls: ['./candidate-detail-page.component.scss']
})
export class CandidateDetailPageComponent implements OnInit {
  candidate: CandidateResponse | null = null;
  loading = true;
  uploading = false;
  candidateId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.paramMap.get('id');
    if (this.candidateId) {
      this.loadCandidate();
    } else {
      this.goBack();
    }
  }

  loadCandidate(): void {
    if (!this.candidateId) return;

    this.loading = true;
    const id = parseInt(this.candidateId, 10);
    this.candidateService.getCandidateById(id).subscribe({
      next: (data) => {
        this.candidate = data;
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement du candidat', 'Fermer', {
          duration: 3000
        });
        this.loading = false;
        this.goBack();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/candidates']);
  }

  editCandidate(): void {
    if (this.candidate) {
      this.router.navigate(['/admin/candidates/edit', this.candidate.id]);
    }
  }

  hasCv(): boolean {
    return !!this.candidate?.cvPath && this.candidate.cvPath.trim() !== '';
  }

  getCvIcon(): string {
    if (!this.candidate?.cvPath) return 'description';

    const extension = this.candidate.cvPath.toLowerCase().split('.').pop();
    switch(extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      default:
        return 'description';
    }
  }

  getCvFileName(): string {
    if (!this.candidate?.cvPath) return '';

    const extension = this.candidate.cvPath.toLowerCase().split('.').pop();
    return `CV_${this.candidate.lastName}_${this.candidate.firstName}.${extension}`;
  }

  downloadCV(): void {
    if (!this.candidate) return;

    const url = `${environment.apiUrl}/candidates/${this.candidate.id}/cv`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement du CV', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
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

    // Types de fichiers autorisés
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open('Format non autorisé. Acceptés: PDF, Word (DOC/DOCX), JPG, PNG', 'Fermer', {
        duration: 4000
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
    if (!this.candidate) return;

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
      error: () => {
        this.snackBar.open('Erreur lors de l\'upload du CV', 'Fermer', {
          duration: 3000
        });
        this.uploading = false;
      }
    });
  }
}
