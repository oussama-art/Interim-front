import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService } from '../../core/services/admin.service';
import { CandidateService } from '../../core/services/candidate.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { CandidateResponse } from '../../core/models/user.model';
import { CreateCandidateFormComponent } from './create-candidate-form/create-candidate-form.component';
import { ImportCandidatesComponent } from './import-candidates/import-candidates.component';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { UploadCvDialogComponent } from './upload-cv-dialog/upload-cv-dialog.component';

@Component({
  selector: 'app-admin-candidates',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSelectModule,
    MatChipsModule,
    CreateCandidateFormComponent,
    ImportCandidatesComponent
  ],
  templateUrl: './admin-candidates.component.html',
  styleUrls: ['./admin-candidates.component.scss']
})
export class AdminCandidatesComponent implements OnInit {
  candidates: CandidateResponse[] = [];
  filteredCandidates: CandidateResponse[] = [];
  loading = true;
  showCreateForm = false;
  showImportForm = false;
  showAvailabilityFilter = false;
  filterForm: FormGroup;

  // Filtres
  searchText = '';
  selectedProfessional = '';
  selectedStatus = '';
  availableProfessionals: string[] = [];
  displayedColumns: string[] = [
    'id',
    'firstName',
    'lastName',
    'emailAddress',
    'professional',
    'status',
    'nextAvailableDate',
    'createdAt',
    'actions'
  ];

  constructor(
    private adminService: AdminService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.loading = true;
    this.adminService.getAllCandidates().subscribe({
      next: (data) => {
        this.candidates = data;
        this.filteredCandidates = data;
        this.extractProfessionals();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des candidats:', err);
        if (!this.errorHandler.isSessionExpired(err)) {
          this.errorHandler.handleError(err, '❌ Erreur lors du chargement des candidats');
        }
        this.loading = false;
      }
    });
  }

  toggleAvailabilityFilter(): void {
    this.showAvailabilityFilter = !this.showAvailabilityFilter;
    if (!this.showAvailabilityFilter) {
      this.filterForm.reset();
      this.loadCandidates();
    }
  }

  filterAvailableCandidates(): void {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    if (!startDate || !endDate) {
      this.snackBar.open('Veuillez sélectionner les deux dates', 'Fermer', { duration: 3000 });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      this.snackBar.open('La date de début doit être antérieure à la date de fin', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formattedStartDate = this.formatDateToISO(startDate);
    const formattedEndDate = this.formatDateToISO(endDate);

    this.candidateService.getAvailableCandidates(formattedStartDate, formattedEndDate).subscribe({
      next: (data) => {
        this.candidates = data;
        this.loading = false;
        this.snackBar.open(`${data.length} candidat(s) disponible(s) trouvé(s)`, 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        console.error('Erreur lors du filtrage:', err);
        this.snackBar.open('Erreur lors du filtrage des candidats', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  viewCandidate(candidate: CandidateResponse): void {
    this.router.navigate(['/admin/candidates/detail', candidate.id]);
  }

  editCandidate(candidate: CandidateResponse): void {
    this.router.navigate(['/admin/candidates/edit', candidate.id]);
  }

  deleteCandidate(candidate: CandidateResponse): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer le candidat ${candidate.firstName} ${candidate.lastName} ?`,
        warning: 'Cette action est irréversible et supprimera toutes les données associées (CV, compte Keycloak, etc.).'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.adminService.deleteCandidate(candidate.id).subscribe({
          next: () => {
            this.snackBar.open('Candidat supprimé avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadCandidates();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            const errorMessage = err?.error?.message || 'Erreur lors de la suppression du candidat';
            this.snackBar.open(errorMessage, 'Fermer', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showImportForm = false;
  }

  toggleImportForm(): void {
    this.showImportForm = !this.showImportForm;
    this.showCreateForm = false;
  }

  openUploadCvDialog(): void {
    const dialogRef = this.dialog.open(UploadCvDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCandidates();
      }
    });
  }

  onCandidateCreated(): void {
    this.showCreateForm = false;
    this.loadCandidates();
  }

  onCandidatesImported(): void {
    this.showImportForm = false;
    this.loadCandidates();
  }

  onFormCancel(): void {
    this.showCreateForm = false;
    this.showImportForm = false;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '-';
    // Si le numéro commence déjà par +, le retourner tel quel
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    // Sinon, ajouter l'indicatif +212
    return `+212${phoneNumber}`;
  }

  /**
   * Formater les valeurs de champs pour afficher "-" si absent
   * @param value La valeur à formater
   * @returns La valeur formatée ou "-"
   */
  formatFieldValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  extractProfessionals(): void {
    const professionalsSet = new Set<string>();
    this.candidates.forEach(candidate => {
      if (candidate.professional) {
        professionalsSet.add(candidate.professional);
      }
    });
    this.availableProfessionals = Array.from(professionalsSet).sort();
  }

  getCandidateStatusLabel(status?: string): string {
    switch(status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'ON_MISSION':
        return 'En mission';
      case 'UNAVAILABLE':
        return 'Indisponible';
      default:
        return 'Non défini';
    }
  }

  getCandidateStatusClass(status?: string): string {
    switch(status) {
      case 'AVAILABLE':
        return 'status-available';
      case 'ON_MISSION':
        return 'status-on-mission';
      case 'UNAVAILABLE':
        return 'status-unavailable';
      default:
        return 'status-undefined';
    }
  }

  getCandidateStatusIcon(status?: string): string {
    switch(status) {
      case 'AVAILABLE':
        return 'check_circle';
      case 'ON_MISSION':
        return 'work';
      case 'UNAVAILABLE':
        return 'block';
      default:
        return 'help_outline';
    }
  }

  applyFilters(): void {
    this.filteredCandidates = this.candidates.filter(candidate => {
      // Filtre par texte de recherche (nom ou prénom ou nom complet)
      const searchMatch = !this.searchText ||
        candidate.firstName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        candidate.lastName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(this.searchText.toLowerCase());

      // Filtre par profil/profession
      const professionalMatch = !this.selectedProfessional ||
        candidate.professional === this.selectedProfessional;

      // Filtre par statut
      const statusMatch = !this.selectedStatus ||
        (this.selectedStatus === 'UNDEFINED' && !candidate.status) ||
        candidate.status === this.selectedStatus;

      return searchMatch && professionalMatch && statusMatch;
    });
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedProfessional = '';
    this.selectedStatus = '';
    this.filteredCandidates = this.candidates;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchText) count++;
    if (this.selectedProfessional) count++;
    if (this.selectedStatus) count++;
    return count;
  }
}
