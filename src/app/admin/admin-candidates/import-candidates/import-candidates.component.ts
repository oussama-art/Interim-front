import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CandidateService } from '../../../core/services/candidate.service';
import { CandidateCreateRequest } from '../../../core/models/user.model';
import * as XLSX from 'xlsx';

interface CandidateImportRow {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
  experienceYear: number;
  skills: string;
  professional: string;
  cin: string;
  cssNumber: string;
}

interface ImportResult {
  candidate: CandidateImportRow;
  status: 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-import-candidates',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './import-candidates.component.html',
  styleUrls: ['./import-candidates.component.scss']
})
export class ImportCandidatesComponent {
  @Output() candidatesImported = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  selectedFile: File | null = null;
  loading = false;
  previewing = false;
  importResults: ImportResult[] = [];
  previewCandidates: CandidateImportRow[] = [];
  displayedColumns: string[] = ['firstName', 'lastName', 'emailAddress', 'professional', 'status'];

  constructor(
    private candidateService: CandidateService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isExcelFile(file)) {
        this.selectedFile = file;
        this.previewFile(file);
      } else {
        this.snackBar.open('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)', 'Fermer', {
          duration: 3000
        });
      }
    }
  }

  private isExcelFile(file: File): boolean {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  }

  previewFile(file: File): void {
    this.previewing = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        this.previewCandidates = jsonData.map(row => this.mapRowToCandidate(row));
        this.previewing = false;

        if (this.previewCandidates.length === 0) {
          this.snackBar.open('Le fichier Excel est vide', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open(`${this.previewCandidates.length} candidat(s) trouvé(s)`, 'Fermer', {
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        this.snackBar.open('Erreur lors de la lecture du fichier Excel', 'Fermer', {
          duration: 3000
        });
        this.previewing = false;
      }
    };

    reader.readAsArrayBuffer(file);
  }

  private mapRowToCandidate(row: any): CandidateImportRow {
    return {
      firstName: row['firstName'] || row['Prénom'] || row['prenom'] || '',
      lastName: row['lastName'] || row['Nom'] || row['nom'] || '',
      emailAddress: row['emailAddress'] || row['Email'] || row['email'] || '',
      phoneNumber: row['phoneNumber'] || row['Téléphone'] || row['telephone'] || '',
      password: row['password'] || row['Mot de passe'] || 'Default@123',
      experienceYear: parseInt(row['experienceYear'] || row['Experience'] || row['experience'] || '0'),
      skills: row['skills'] || row['Compétences'] || row['competences'] || '',
      professional: row['professional'] || row['Profession'] || row['profession'] || '',
      cin: row['cin'] || row['CIN'] || '',
      cssNumber: row['cssNumber'] || row['CSS'] || row['css'] || ''
    };
  }

  async importCandidates(): Promise<void> {
    if (!this.selectedFile || this.previewCandidates.length === 0) {
      this.snackBar.open('Aucun candidat à importer', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.importResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const candidate of this.previewCandidates) {
      try {
        // Validate candidate data
        if (!this.validateCandidate(candidate)) {
          this.importResults.push({
            candidate,
            status: 'error',
            message: 'Données invalides'
          });
          errorCount++;
          continue;
        }

        // Create candidate request
        const candidateRequest: CandidateCreateRequest = {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          emailAddress: candidate.emailAddress,
          phoneNumber: candidate.phoneNumber,
          password: candidate.password,
          confirmPassword: candidate.password,
          experienceYear: candidate.experienceYear,
          skills: candidate.skills,
          professional: candidate.professional,
          cin: candidate.cin,
          cssNumber: candidate.cssNumber
        };

        // Create candidate via API
        await this.candidateService.createCandidate(candidateRequest).toPromise();

        this.importResults.push({
          candidate,
          status: 'success',
          message: 'Créé avec succès'
        });
        successCount++;
      } catch (error: any) {
        console.error('Erreur lors de la création du candidat:', error);
        this.importResults.push({
          candidate,
          status: 'error',
          message: error?.message || 'Erreur lors de la création'
        });
        errorCount++;
      }
    }

    this.loading = false;

    // Show summary
    const message = `Import terminé: ${successCount} succès, ${errorCount} erreur(s)`;
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: successCount > 0 ? ['success-snackbar'] : ['error-snackbar']
    });

    if (successCount > 0) {
      this.candidatesImported.emit();
    }
  }

  private validateCandidate(candidate: CandidateImportRow): boolean {
    return !!(
      candidate.firstName &&
      candidate.lastName &&
      candidate.emailAddress &&
      this.isValidEmail(candidate.emailAddress) &&
      candidate.phoneNumber &&
      candidate.professional &&
      candidate.cin &&
      candidate.cssNumber
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  downloadTemplate(): void {
    const template = [
      {
        firstName: 'Mohamed',
        lastName: 'Ben Ahmed',
        emailAddress: 'mohamed.benahmed@example.com',
        phoneNumber: '12345678',
        password: 'Password@123',
        experienceYear: 5,
        skills: 'Java, Spring Boot, Angular',
        professional: 'Développeur Full Stack',
        cin: '12345678',
        cssNumber: 'CSS123456'
      },
      {
        firstName: 'Fatma',
        lastName: 'Trabelsi',
        emailAddress: 'fatma.trabelsi@example.com',
        phoneNumber: '87654321',
        password: 'Password@123',
        experienceYear: 3,
        skills: 'Électricité, Plomberie',
        professional: 'Électricien',
        cin: '87654321',
        cssNumber: 'CSS654321'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');
    XLSX.writeFile(wb, 'template_candidats.xlsx');

    this.snackBar.open('Modèle téléchargé avec succès', 'Fermer', { duration: 2000 });
  }

  onCancel(): void {
    this.selectedFile = null;
    this.previewCandidates = [];
    this.importResults = [];
    this.cancel.emit();
  }

  clearFile(): void {
    this.selectedFile = null;
    this.previewCandidates = [];
    this.importResults = [];
  }

  getSuccessCount(): number {
    return this.importResults.filter(r => r.status === 'success').length;
  }

  getErrorCount(): number {
    return this.importResults.filter(r => r.status === 'error').length;
  }

  getErrorResults(): ImportResult[] {
    return this.importResults.filter(r => r.status === 'error');
  }
}
