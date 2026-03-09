import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CandidateService } from '../../../core/services/candidate.service';
import { ProfilService } from '../../../core/services/profil.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-upload-cv-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule
  ],
  templateUrl: './upload-cv-dialog.component.html',
  styleUrls: ['./upload-cv-dialog.component.scss']
})
export class UploadCvDialogComponent implements OnInit {
  uploadForm: FormGroup;
  loading = false;
  loadingProfessions = false;
  selectedFile: File | null = null;
  fileError = '';
  availableProfessionals: string[] = [];
  filteredProfessionals!: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UploadCvDialogComponent>,
    private candidateService: CandidateService,
    private profilService: ProfilService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService
  ) {
    this.uploadForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      professional: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.setupProfessionalFilter();
    this.loadProfessions();
  }

  loadProfessions(): void {
    // Utiliser le ProfilService pour obtenir la liste des profils
    this.availableProfessionals = this.profilService.getAllProfils();
    console.log('✅ Professions disponibles:', this.availableProfessionals);
    console.log('📊 Nombre de professions:', this.availableProfessionals.length);
  }

  setupProfessionalFilter(): void {
    this.filteredProfessionals = this.uploadForm.get('professional')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterProfessionals(value || ''))
    );
  }

  private _filterProfessionals(value: string): string[] {
    if (!value) {
      // Si le champ est vide, afficher toutes les professions
      console.log('🔍 Affichage de toutes les professions:', this.availableProfessionals.length);
      return this.availableProfessionals.slice();
    }
    const filterValue = value.toLowerCase();
    const filtered = this.availableProfessionals.filter(professional =>
      professional.toLowerCase().includes(filterValue)
    );
    console.log(`🔍 Filtrage avec "${value}":`, filtered.length, 'résultats');
    return filtered;
  }

  onProfessionalFocus(): void {
    console.log('👆 Focus sur le champ profession');
    // Déclencher l'affichage de toutes les professions au focus
    const currentValue = this.uploadForm.get('professional')?.value || '';
    this.uploadForm.get('professional')?.setValue(currentValue);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validation du fichier
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        this.fileError = 'Format non supporté. Utilisez PDF ou Word.';
        this.selectedFile = null;
        return;
      }

      if (file.size > maxSize) {
        this.fileError = 'Le fichier est trop volumineux (max 5MB).';
        this.selectedFile = null;
        return;
      }

      this.fileError = '';
      this.selectedFile = file;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileError = '';
  }

  onSubmit(): void {
    if (this.uploadForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs requis', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (!this.selectedFile) {
      this.snackBar.open('Veuillez sélectionner un fichier CV', 'Fermer', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('firstName', this.uploadForm.get('firstName')?.value);
    formData.append('lastName', this.uploadForm.get('lastName')?.value);
    formData.append('professional', this.uploadForm.get('professional')?.value);
    formData.append('cv', this.selectedFile);

    this.candidateService.uploadCandidateWithCV(formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open(
          `Candidat ${response.firstName} ${response.lastName} créé avec succès !`,
          'Fermer',
          { duration: 3000, panelClass: ['success-snackbar'] }
        );
        this.dialogRef.close(response);
      },
      error: (error) => {
        this.loading = false;
        console.error('Erreur lors de l\'upload du CV:', error);
        // Le ErrorHandlerService va afficher le message du backend automatiquement
        // Par exemple: "Un candidat avec le même nom et prénom existe déjà"
        if (!this.errorHandler.isSessionExpired(error)) {
          this.errorHandler.handleError(error);
        }
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFileIcon(): string {
    if (!this.selectedFile) return 'description';

    const extension = this.selectedFile.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      default:
        return 'insert_drive_file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
