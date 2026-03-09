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
import { ProfilService } from '../../../core/services/profil.service';
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
  availableProfils: string[] = [];

  constructor(
    private candidateService: CandidateService,
    private profilService: ProfilService,
    private snackBar: MatSnackBar
  ) {
    this.availableProfils = this.profilService.getAllProfils();
  }

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
          let errorMessage = 'Données invalides';

          // Fournir un message d'erreur spécifique si la profession n'est pas valide
          if (candidate.professional && !this.availableProfils.includes(candidate.professional)) {
            errorMessage = `Profession invalide: "${candidate.professional}". Utilisez une profession de la liste.`;
          }
          // Vérifier le format du téléphone
          else if (candidate.phoneNumber && !this.isValidPhoneNumber(candidate.phoneNumber)) {
            errorMessage = `Téléphone: Format invalide "${candidate.phoneNumber}". Utilisez le format avec indicatif (ex: +33612345678, +21612345678).`;
          }

          this.importResults.push({
            candidate,
            status: 'error',
            message: errorMessage
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
          experienceYear: candidate.experienceYear,
          skills: candidate.skills,
          professional: candidate.professional,
          cin: candidate.cin,
          cssNumber: candidate.cssNumber,
          active: true
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

        // Extraire les messages d'erreur du backend
        let errorMessage = 'Erreur lors de la création';

        if (error?.error?.errors) {
          // Format: {"errors":{"phoneNumber":"Numéro invalide (format invalide)"}}
          const errors = error.error.errors;
          const errorMessages = Object.entries(errors)
            .map(([field, msg]) => {
              const fieldNames: { [key: string]: string } = {
                'phoneNumber': 'Téléphone',
                'emailAddress': 'Email',
                'firstName': 'Prénom',
                'lastName': 'Nom',
                'cin': 'CIN',
                'cssNumber': 'Numéro CSS',
                'professional': 'Profession'
              };
              const fieldName = fieldNames[field] || field;
              return `${fieldName}: ${msg}`;
            })
            .join(', ');
          errorMessage = errorMessages;
        } else if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.importResults.push({
          candidate,
          status: 'error',
          message: errorMessage
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
    // Vérifier que tous les champs requis sont présents
    const hasRequiredFields = !!(
      candidate.firstName &&
      candidate.lastName &&
      candidate.emailAddress &&
      this.isValidEmail(candidate.emailAddress) &&
      candidate.phoneNumber &&
      candidate.professional &&
      candidate.cin &&
      candidate.cssNumber
    );

    // Vérifier que la profession fait partie de la liste des professions disponibles
    const hasValidProfession = this.availableProfils.includes(candidate.professional);

    // Vérifier que le numéro de téléphone a le bon format avec indicatif
    const hasValidPhoneFormat = this.isValidPhoneNumber(candidate.phoneNumber);

    return hasRequiredFields && hasValidProfession && hasValidPhoneFormat;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Format: +33612345678, +1234567890, etc.
    const phoneRegex = /^\+[1-9]\d{1,2}\d{6,12}$/;
    return phoneRegex.test(phone);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  downloadTemplate(): void {
    // Utiliser des professions valides de la liste
    const exampleProfession1 = this.availableProfils[0] || 'Développeur Full Stack';
    const exampleProfession2 = this.availableProfils[1] || 'Électricien';

    const template = [
      {
        firstName: 'Mohamed',
        lastName: 'Ben Ahmed',
        emailAddress: 'mohamed.benahmed@example.com',
        phoneNumber: '+21612345678',
        password: 'Password@123',
        experienceYear: 5,
        skills: 'Java, Spring Boot, Angular',
        professional: exampleProfession1,
        cin: '12345678',
        cssNumber: 'CSS123456'
      },
      {
        firstName: 'Fatma',
        lastName: 'Trabelsi',
        emailAddress: 'fatma.trabelsi@example.com',
        phoneNumber: '+33687654321',
        password: 'Password@123',
        experienceYear: 3,
        skills: 'Électricité, Plomberie',
        professional: exampleProfession2,
        cin: '87654321',
        cssNumber: 'CSS654321'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');

    // Ajouter une feuille avec la liste des professions valides
    const professionsSheet = XLSX.utils.json_to_sheet(
      this.availableProfils.map(p => ({ 'Professions Valides': p }))
    );
    XLSX.utils.book_append_sheet(wb, professionsSheet, 'Professions');

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
