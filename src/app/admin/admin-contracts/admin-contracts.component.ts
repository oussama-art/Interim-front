import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';
import { DeleteContractDialogComponent } from './delete-contract-dialog/delete-contract-dialog.component';

interface CandidateInfo {
  candidateId: number;
  firstName: string;
  lastName: string;
  skills: string;
  professional: string;
  demandeProfilId: number | null;
  demandeProfilName: string | null;
  status: string;
}

interface ContractResponse {
  id: number;
  candidate: CandidateInfo;
  demandeId: number;
  demandeReference: string;
  startDate: string;
  endDate: string;
  originalFileName: string;
  uploadedAt: string;
}

interface Candidate {
  candidateId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  fullName?: string;
}

interface DemandeWithCandidates {
  demandeId: number;
  reference: string;
  clientName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  candidates: Candidate[];
  contracts: ContractResponse[];
  expanded?: boolean;
}

interface CandidateAvailabilityResponse {
  candidateId: number;
  availableAfter: string | null; // ISO date string or null
}

interface ContractIntervalCheckResponse {
  candidateId: number;
  startDate: string;
  endDate: string;
  overlaps: boolean;
  availableAfter: string | null;
  message: string;
}

interface ContractTableRow {
  demandeId: number;
  demandeReference: string;
  clientName?: string;
  demandeStartDate?: string;
  demandeEndDate?: string;
  candidateId: number;
  candidateName: string;
  candidateEmail?: string;
  contract?: ContractResponse;
  expanded?: boolean;
}

@Component({
  selector: 'app-admin-contracts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatTableModule,
    MatSelectModule
  ],
  templateUrl: './admin-contracts.component.html',
  styleUrl: './admin-contracts.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', opacity: '0' })),
      state('expanded', style({ height: '*', opacity: '1' })),
      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AdminContractsComponent implements OnInit {
  demandes: DemandeWithCandidates[] = [];
  allTableRows: ContractTableRow[] = [];
  filteredTableRows: ContractTableRow[] = [];
  displayedColumns: string[] = ['demande', 'client', 'candidate', 'contract', 'actions'];
  expandedRow: ContractTableRow | null = null;

  // Filters
  filterSearchText: string = '';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  filterContractStatus: string = 'all'; // 'all', 'active', 'pending', 'none'

  loading = false;
  uploadingContract: { [key: string]: boolean } = {};
  contractForms: { [key: string]: FormGroup } = {};
  editingContract: { [key: string]: boolean } = {};
  deletingContract: { [key: string]: boolean } = {};
  candidateAvailabilities: { [candidateId: number]: CandidateAvailabilityResponse } = {};
  errorMessages: { [key: string]: string } = {};
  today = new Date();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading = true;

    // Charger les demandes
    this.http.get<any>(`${environment.apiUrl}/demandes`).subscribe({
      next: (demandesResponse) => {
        const demandesData = demandesResponse.content || [];

        if (demandesData.length === 0) {
          this.demandes = [];
          this.loading = false;
          this.snackBar.open('Aucune demande trouvée', 'Fermer', { duration: 3000 });
          return;
        }

        // Charger les assignments (candidats acceptés)
        this.http.get<any>(`${environment.apiUrl}/assignments`).subscribe({
          next: (assignmentsResponse) => {
            const assignments = assignmentsResponse.content || [];

            console.log('📋 Demandes chargées:', demandesData.map((d: any) => ({ id: d.id, reference: d.reference })));
            console.log('👥 Assignments chargés:', assignments.map((a: any) => ({ demandeId: a.demandeId, candidateId: a.candidateId, name: a.candidateName })));

            // Créer une map des assignments par demandeId
            const assignmentsByDemande = new Map<number, any[]>();
            // Créer une map pour stocker le nom du client par demandeId
            const clientNamesByDemande = new Map<number, string>();

            assignments.forEach((assignment: any) => {
              const demandeId = assignment.demandeId;
              if (!assignmentsByDemande.has(demandeId)) {
                assignmentsByDemande.set(demandeId, []);
              }

              // Stocker le nom du client pour cette demande
              if (assignment.clientName && !clientNamesByDemande.has(demandeId)) {
                clientNamesByDemande.set(demandeId, assignment.clientName);
              }

              // Extraire le nom complet
              const fullName = assignment.candidateName || '';
              const nameParts = fullName.split(' ');

              assignmentsByDemande.get(demandeId)!.push({
                candidateId: assignment.candidateId || 0,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: assignment.candidateEmail || '',
                status: assignment.candidateStatus || 'ACCEPTED',
                fullName: fullName
              });
            });

            console.log('🗂️ Map des assignments par demandeId:', Array.from(assignmentsByDemande.entries()).map(([id, candidates]) => ({ demandeId: id, count: candidates.length })));

            // Mapper les demandes avec leurs candidats assignés
            this.demandes = demandesData.map((demande: any) => {
              const demandeId = demande.id || demande.demandeId;
              const candidates = assignmentsByDemande.get(demandeId) || [];
              const clientName = clientNamesByDemande.get(demandeId);

              console.log(`✅ Demande ${demandeId} (${demande.reference}): ${candidates.length} candidat(s) trouvé(s), Client: ${clientName || 'N/A'}`);

              return {
                demandeId: demandeId,
                reference: demande.reference || `Demande ${demandeId}`,
                clientName: clientName,
                status: demande.status,
                startDate: demande.startDate,
                endDate: demande.endDate,
                candidates: candidates,
                contracts: [],
                expanded: false
              };
            });

            // Charger les contrats et initialiser les formulaires
            let contractsLoaded = 0;
            const totalDemandes = this.demandes.length;

            this.demandes.forEach((demande) => {
              this.loadContractsForDemande(demande, () => {
                contractsLoaded++;
                if (contractsLoaded === totalDemandes) {
                  this.generateTableRows();
                }
              });
              demande.candidates.forEach((candidate) => {
                if (candidate.candidateId) {
                  this.initContractForm(demande.demandeId, candidate.candidateId);
                  this.loadCandidateAvailability(candidate.candidateId); // Charger la disponibilité
                }
              });
            });

            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur chargement assignments:', error);
            this.snackBar.open('Erreur lors du chargement des candidats assignés', 'Fermer', { duration: 5000 });
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Erreur chargement demandes:', error);
        this.snackBar.open('Erreur lors du chargement des demandes', 'Fermer', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  loadContractsForDemande(demande: DemandeWithCandidates, callback?: () => void): void {
    this.http.get<ContractResponse[]>(
      `${environment.apiUrl}/contracts/${demande.demandeId}/contracts`
    ).subscribe({
      next: (contracts) => {
        demande.contracts = contracts;
        console.log(`📄 Contrats chargés pour demande ${demande.demandeId}:`, contracts.map(c => ({
          contractId: c.id,
          candidateId: c.candidate.candidateId,
          candidateName: `${c.candidate.firstName} ${c.candidate.lastName}`,
          file: c.originalFileName
        })));
        if (callback) callback();
      },
      error: (error) => {
        console.error(`Erreur chargement contrats pour demande ${demande.demandeId}:`, error);
        if (callback) callback();
      }
    });
  }

  generateTableRows(): void {
    this.allTableRows = [];
    this.demandes.forEach(demande => {
      demande.candidates.forEach(candidate => {
        const contract = this.getCandidateContract(demande, candidate.candidateId);
        this.allTableRows.push({
          demandeId: demande.demandeId,
          demandeReference: demande.reference,
          clientName: demande.clientName,
          demandeStartDate: demande.startDate,
          demandeEndDate: demande.endDate,
          candidateId: candidate.candidateId,
          candidateName: candidate.fullName || `${candidate.firstName} ${candidate.lastName}`,
          candidateEmail: candidate.email,
          contract: contract,
          expanded: false
        });
      });
    });
    console.log('📊 Lignes du tableau générées:', this.allTableRows.length);
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTableRows = this.allTableRows.filter(row => {
      // Filter by search text (demande reference, candidate name, or client name)
      if (this.filterSearchText) {
        const searchLower = this.filterSearchText.toLowerCase();
        const matchesReference = row.demandeReference.toLowerCase().includes(searchLower);
        const matchesCandidateName = row.candidateName.toLowerCase().includes(searchLower);
        const matchesClientName = row.clientName ? row.clientName.toLowerCase().includes(searchLower) : false;

        if (!matchesReference && !matchesCandidateName && !matchesClientName) {
          return false;
        }
      }

      // Filter by start date (demande start date)
      if (this.filterStartDate && row.demandeStartDate) {
        const rowStartDate = new Date(row.demandeStartDate);
        if (rowStartDate < this.filterStartDate) {
          return false;
        }
      }

      // Filter by end date (demande end date)
      if (this.filterEndDate && row.demandeEndDate) {
        const rowEndDate = new Date(row.demandeEndDate);
        if (rowEndDate > this.filterEndDate) {
          return false;
        }
      }

      // Filter by contract status
      if (this.filterContractStatus !== 'all') {
        if (this.filterContractStatus === 'active') {
          // Afficher uniquement les lignes avec un contrat actif
          if (!this.isContractActive(row.contract)) {
            return false;
          }
        }
        if (this.filterContractStatus === 'pending') {
          // Afficher uniquement les lignes avec un contrat en attente (futur)
          if (!this.isContractPending(row.contract)) {
            return false;
          }
        }
        if (this.filterContractStatus === 'expired') {
          // Afficher uniquement les lignes avec un contrat expiré
          if (!row.contract || this.isContractActive(row.contract) || this.isContractPending(row.contract)) {
            return false;
          }
        }
        if (this.filterContractStatus === 'none') {
          // Afficher uniquement les lignes sans contrat
          if (row.contract) {
            return false;
          }
        }
      }

      return true;
    });

    console.log(`🔍 Filtrage: ${this.filteredTableRows.length}/${this.allTableRows.length} lignes`);
  }

  clearFilters(): void {
    this.filterSearchText = '';
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterContractStatus = 'all';
    this.applyFilters();
  }

  onStartDateChange(): void {
    // Si la date de fin existe et est avant la date de début, la réinitialiser
    if (this.filterStartDate && this.filterEndDate && this.filterEndDate < this.filterStartDate) {
      this.filterEndDate = null;
    }
    this.applyFilters();
  }

  isContractActive(contract: ContractResponse | undefined): boolean {
    if (!contract) return false;

    // Normaliser les dates en retirant les heures pour une comparaison correcte
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(contract.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(contract.endDate);
    endDate.setHours(0, 0, 0, 0);

    return today >= startDate && today <= endDate;
  }

  isContractPending(contract: ContractResponse | undefined): boolean {
    if (!contract) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(contract.startDate);
    startDate.setHours(0, 0, 0, 0);

    return startDate > today;
  }

  getContractStatus(contract: ContractResponse | undefined): { label: string; class: string; icon: string } {
    if (!contract) {
      return { label: 'Aucun contrat', class: 'none', icon: 'cancel' };
    }

    if (this.isContractActive(contract)) {
      return { label: 'Actif', class: 'active', icon: 'check_circle' };
    }

    if (this.isContractPending(contract)) {
      return { label: 'En attente', class: 'pending', icon: 'schedule' };
    }

    // Contrat expiré
    return { label: 'Expiré', class: 'expired', icon: 'history' };
  }

  initContractForm(demandeId: number, candidateId: number): void {
    const key = `${demandeId}_${candidateId}`;
    this.contractForms[key] = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      file: [null]
    });

    // Ajouter un listener pour revalider endDate quand startDate change
    const form = this.contractForms[key];
    form.get('startDate')?.valueChanges.subscribe(() => {
      form.get('endDate')?.updateValueAndValidity();
    });
  }

  onFileSelected(event: any, demandeId: number, candidateId: number): void {
    const file = event.target.files[0];
    if (file) {
      const key = `${demandeId}_${candidateId}`;
      this.contractForms[key].patchValue({ file: file });
    }
  }

  uploadContract(demande: DemandeWithCandidates, candidate: Candidate): void {
    const key = `${demande.demandeId}_${candidate.candidateId}`;
    const form = this.contractForms[key];

    // Effacer l'erreur précédente
    this.clearError(demande.demandeId, candidate.candidateId);

    if (!form || form.invalid || !form.value.file) {
      this.showError(demande.demandeId, candidate.candidateId, 'Veuillez remplir tous les champs et sélectionner un fichier');
      return;
    }

    const startDate = new Date(form.value.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(form.value.endDate);
    endDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier que la date de début est >= aujourd'hui pour un nouveau contrat
    if (startDate < today) {
      this.showError(demande.demandeId, candidate.candidateId, 'La date de début doit être à partir d\'aujourd\'hui');
      return;
    }

    // Vérifier que la date de fin est >= date de début
    if (endDate < startDate) {
      this.showError(demande.demandeId, candidate.candidateId, 'La date de fin doit être postérieure ou égale à la date de début');
      return;
    }

    // Vérifier que la date de début ne dépasse pas la date de début de la demande
    if (demande.startDate) {
      const demandeStartDate = new Date(demande.startDate);
      demandeStartDate.setHours(0, 0, 0, 0);

      if (startDate < demandeStartDate) {
        this.showError(demande.demandeId, candidate.candidateId, `La date de début ne peut pas être avant le ${this.formatDate(demande.startDate)} (début de la demande)`);
        return;
      }
    }

    // Vérifier les chevauchements avec d'autres contrats du candidat
    this.uploadingContract[key] = true;

    const startDateStr = this.formatDateForBackend(form.value.startDate);
    const endDateStr = this.formatDateForBackend(form.value.endDate);

    this.http.get<ContractIntervalCheckResponse>(
      `${environment.apiUrl}/contracts/candidates/${candidate.candidateId}/check-interval`,
      { params: { start: startDateStr, end: endDateStr } }
    ).subscribe({
      next: (checkResponse) => {
        if (checkResponse.overlaps) {
          this.showError(demande.demandeId, candidate.candidateId, checkResponse.message);
          this.uploadingContract[key] = false;
          return;
        }

        // Si pas de chevauchement, procéder à l'upload
        const formData = new FormData();
        const metadata = {
          demandeId: demande.demandeId,
          startDate: startDateStr,
          endDate: endDateStr
        };

        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', form.value.file);

        this.http.post<ContractResponse>(
          `${environment.apiUrl}/contracts/${demande.demandeId}/candidates/${candidate.candidateId}/contract`,
          formData
        ).subscribe({
          next: (response) => {
            this.snackBar.open('Contrat ajouté avec succès', 'Fermer', { duration: 3000 });
            this.uploadingContract[key] = false;
            form.reset();
            this.loadContractsForDemande(demande, () => this.generateTableRows());
            // Actualiser la disponibilité du candidat
            this.loadCandidateAvailability(candidate.candidateId);
          },
          error: (error) => {
            console.error('Erreur upload contrat:', error);
            this.showError(demande.demandeId, candidate.candidateId, 'Erreur lors de l\'ajout du contrat');
            this.uploadingContract[key] = false;
          }
        });
      },
      error: (error) => {
        console.error('Erreur vérification intervalle:', error);
        this.showError(demande.demandeId, candidate.candidateId, 'Erreur lors de la vérification des dates');
        this.uploadingContract[key] = false;
      }
    });
  }

  getCandidateContract(demande: DemandeWithCandidates, candidateId: number): ContractResponse | undefined {
    return demande.contracts.find(c => c.candidate.candidateId === candidateId);
  }

  getMinEndDate(demandeId: number, candidateId: number): Date {
    const key = this.getFormKey(demandeId, candidateId);
    const form = this.contractForms[key];
    const startDate = form?.get('startDate')?.value;

    if (startDate && startDate instanceof Date) {
      return startDate > this.today ? startDate : this.today;
    }

    return this.today;
  }

  editContract(demande: DemandeWithCandidates, candidate: any): void {
    const key = this.getFormKey(demande.demandeId, candidate.candidateId);
    const contract = this.getCandidateContract(demande, candidate.candidateId);

    if (contract) {
      // Pré-remplir le formulaire avec les données du contrat existant
      const form = this.contractForms[key];
      form.patchValue({
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        file: null
      });

      // Ajouter un listener pour valider la date de fin quand la date de début change
      form.get('startDate')?.valueChanges.subscribe(() => {
        form.get('endDate')?.updateValueAndValidity();
      });

      this.editingContract[key] = true;
    }
  }

  cancelEdit(demandeId: number, candidateId: number): void {
    const key = this.getFormKey(demandeId, candidateId);
    this.editingContract[key] = false;
    this.contractForms[key].reset();
  }

  updateContract(demande: DemandeWithCandidates, candidate: any): void {
    const key = this.getFormKey(demande.demandeId, candidate.candidateId);
    const form = this.contractForms[key];
    const contract = this.getCandidateContract(demande, candidate.candidateId);

    // Effacer l'erreur précédente
    this.clearError(demande.demandeId, candidate.candidateId);

    if (!contract) {
      this.showError(demande.demandeId, candidate.candidateId, 'Contrat non trouvé');
      return;
    }

    // Vérifier que les dates sont remplies
    if (!form.value.startDate || !form.value.endDate) {
      this.showError(demande.demandeId, candidate.candidateId, 'Veuillez remplir les dates');
      return;
    }

    const startDate = new Date(form.value.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(form.value.endDate);
    endDate.setHours(0, 0, 0, 0);

    // Vérifier que la date de fin est >= date de début
    if (endDate < startDate) {
      this.showError(demande.demandeId, candidate.candidateId, 'La date de fin doit être postérieure ou égale à la date de début');
      return;
    }

    // Vérifier que la date de début ne dépasse pas la date de début de la demande
    if (demande.startDate) {
      const demandeStartDate = new Date(demande.startDate);
      demandeStartDate.setHours(0, 0, 0, 0);

      if (startDate < demandeStartDate) {
        this.showError(demande.demandeId, candidate.candidateId, `La date de début ne peut pas être avant le ${this.formatDate(demande.startDate)} (début de la demande)`);
        return;
      }
    }

    // Vérifier les chevauchements avec d'autres contrats du candidat
    this.uploadingContract[key] = true;

    const startDateStr = this.formatDateForBackend(form.value.startDate);
    const endDateStr = this.formatDateForBackend(form.value.endDate);

    // Exclure le contrat en cours d'édition de la vérification
    this.http.get<ContractIntervalCheckResponse>(
      `${environment.apiUrl}/contracts/candidates/${candidate.candidateId}/check-interval`,
      { params: {
        start: startDateStr,
        end: endDateStr,
        excludeContractId: contract.id.toString()
      } }
    ).subscribe({
      next: (checkResponse) => {
        if (checkResponse.overlaps) {
          this.showError(demande.demandeId, candidate.candidateId, checkResponse.message);
          this.uploadingContract[key] = false;
          return;
        }

        // Si pas de chevauchement, procéder à la mise à jour
        this.performContractUpdate(demande, candidate, contract, form, key, startDateStr, endDateStr);
      },
      error: (error) => {
        console.error('Erreur vérification intervalle:', error);
        this.showError(demande.demandeId, candidate.candidateId, 'Erreur lors de la vérification des dates');
        this.uploadingContract[key] = false;
      }
    });
  }

  private performContractUpdate(
    demande: DemandeWithCandidates,
    candidate: any,
    contract: ContractResponse,
    form: FormGroup,
    key: string,
    startDateStr: string,
    endDateStr: string
  ): void {
    const formData = new FormData();

    const metadata = {
      demandeId: demande.demandeId,
      candidateId: candidate.candidateId,
      startDate: startDateStr,
      endDate: endDateStr
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    formData.append('metadata', metadataBlob);

    // Si un nouveau fichier est sélectionné, l'ajouter
    if (form.value.file) {
      formData.append('file', form.value.file);
    }

    const url = form.value.file
      ? `${environment.apiUrl}/contracts/${demande.demandeId}/contracts/${contract.id}`
      : `${environment.apiUrl}/contracts/${demande.demandeId}/contracts/${contract.id}/fields`;

    const request = form.value.file
      ? this.http.put<ContractResponse>(url, formData)
      : this.http.patch<ContractResponse>(url, metadata);

    request.subscribe({
      next: (response) => {
        this.snackBar.open('Contrat modifié avec succès', 'Fermer', { duration: 3000 });
        this.uploadingContract[key] = false;
        this.editingContract[key] = false;
        form.reset();
        this.loadContractsForDemande(demande, () => this.generateTableRows());
        // Actualiser la disponibilité du candidat
        this.loadCandidateAvailability(candidate.candidateId);
      },
      error: (error) => {
        console.error('Erreur modification contrat:', error);
        this.showError(demande.demandeId, candidate.candidateId, 'Erreur lors de la modification du contrat');
        this.uploadingContract[key] = false;
      }
    });
  }

  deleteContract(demande: DemandeWithCandidates, candidate: any): void {
    const contract = this.getCandidateContract(demande, candidate.candidateId);

    if (!contract) return;

    const dialogRef = this.dialog.open(DeleteContractDialogComponent, {
      width: '450px',
      data: { candidateName: candidate.fullName || 'ce candidat' },
      panelClass: 'custom-delete-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const key = this.getFormKey(demande.demandeId, candidate.candidateId);
        this.deletingContract[key] = true;

        this.http.delete(`${environment.apiUrl}/contracts/${demande.demandeId}/contracts/${contract.id}`)
          .subscribe({
            next: () => {
              this.snackBar.open('Contrat supprimé avec succès', 'Fermer', { duration: 3000 });
              this.deletingContract[key] = false;
              this.loadContractsForDemande(demande, () => this.generateTableRows());
              // Actualiser la disponibilité du candidat
              this.loadCandidateAvailability(candidate.candidateId);
            },
            error: (error) => {
              console.error('Erreur suppression contrat:', error);
              this.snackBar.open('Erreur lors de la suppression du contrat', 'Fermer', { duration: 5000 });
              this.deletingContract[key] = false;
            }
          });
      }
    });
  }

  isEditing(demandeId: number, candidateId: number): boolean {
    const key = this.getFormKey(demandeId, candidateId);
    return this.editingContract[key] || false;
  }

  isDeleting(demandeId: number, candidateId: number): boolean {
    const key = this.getFormKey(demandeId, candidateId);
    return this.deletingContract[key] || false;
  }

  areDatesValid(demandeId: number, candidateId: number): boolean {
    const key = this.getFormKey(demandeId, candidateId);
    const form = this.contractForms[key];

    if (!form || !form.value.startDate || !form.value.endDate) {
      return false;
    }

    const startDate = new Date(form.value.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(form.value.endDate);
    endDate.setHours(0, 0, 0, 0);

    // Vérifier uniquement que la date de fin est >= date de début
    // La validation pour aujourd'hui est faite dans uploadContract/updateContract
    if (endDate < startDate) {
      return false;
    }

    return true;
  }

  downloadContract(contract: ContractResponse): void {
    const url = `${environment.apiUrl}/contracts/${contract.id}/download`;

    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = contract.originalFileName;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);

        this.snackBar.open('Contrat téléchargé', 'Fermer', { duration: 3000 });
      },
      error: (error) => {
        console.error('Erreur téléchargement:', error);
        this.snackBar.open('Erreur lors du téléchargement', 'Fermer', { duration: 5000 });
      }
    });
  }

  formatDateForBackend(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isUploading(demandeId: number, candidateId: number): boolean {
    const key = `${demandeId}_${candidateId}`;
    return this.uploadingContract[key] || false;
  }

  getFormKey(demandeId: number, candidateId: number): string {
    return `${demandeId}_${candidateId}`;
  }

  showError(demandeId: number, candidateId: number, message: string): void {
    const key = `${demandeId}_${candidateId}`;
    this.errorMessages[key] = message;

    // Auto-effacer après 10 secondes
    setTimeout(() => {
      if (this.errorMessages[key] === message) {
        delete this.errorMessages[key];
      }
    }, 10000);
  }

  clearError(demandeId: number, candidateId: number): void {
    const key = `${demandeId}_${candidateId}`;
    delete this.errorMessages[key];
  }

  getError(demandeId: number, candidateId: number): string | null {
    const key = `${demandeId}_${candidateId}`;
    return this.errorMessages[key] || null;
  }

  // ===== GESTION DE LA DISPONIBILITÉ DES CANDIDATS =====

  loadCandidateAvailability(candidateId: number): void {
    const url = `${environment.apiUrl}/contracts/candidates/${candidateId}/availability`;

    this.http.get<CandidateAvailabilityResponse>(url).subscribe({
      next: (availability) => {
        this.candidateAvailabilities[candidateId] = availability;
      },
      error: (error) => {
        console.error(`Erreur chargement disponibilité candidat ${candidateId}:`, error);
        // En cas d'erreur, considérer le candidat comme disponible
        this.candidateAvailabilities[candidateId] = {
          candidateId: candidateId,
          availableAfter: null
        };
      }
    });
  }

  getCandidateAvailability(candidateId: number): CandidateAvailabilityResponse | null {
    return this.candidateAvailabilities[candidateId] || null;
  }

  isCandidateAvailable(candidateId: number): boolean {
    const availability = this.candidateAvailabilities[candidateId];
    if (!availability) return true; // Si pas encore chargé, considérer comme disponible temporairement

    if (!availability.availableAfter) return true; // Pas de contrat en cours

    // Comparer avec la date d'aujourd'hui
    const availableAfterDate = new Date(availability.availableAfter);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return availableAfterDate <= today;
  }

  getAvailabilityMessage(candidateId: number): string {
    const availability = this.candidateAvailabilities[candidateId];
    if (!availability || !availability.availableAfter) {
      return 'Disponible';
    }

    const availableAfterDate = new Date(availability.availableAfter);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (availableAfterDate <= today) {
      return 'Disponible';
    }

    return `Disponible à partir du ${this.formatDate(availability.availableAfter)}`;
  }

  getMinStartDateForCandidate(candidateId: number): Date {
    const availability = this.candidateAvailabilities[candidateId];

    // Si pas de données de disponibilité ou pas de contrat en cours, retourner aujourd'hui
    if (!availability || !availability.availableAfter) {
      return this.today;
    }

    // Calculer le jour suivant la fin du contrat actuel
    const availableAfterDate = new Date(availability.availableAfter);
    const minDate = new Date(availableAfterDate);
    minDate.setDate(minDate.getDate() + 1); // Ajouter 1 jour

    // Si cette date est dans le passé, retourner aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return minDate > today ? minDate : today;
  }

  getMinStartDateForNewContract(demande: DemandeWithCandidates, candidateId: number): Date {
    // Pour un nouveau contrat, la date minimum est le max entre:
    // 1. Aujourd'hui
    // 2. La disponibilité du candidat (fin contrat actuel + 1 jour)
    // 3. La date de début de la demande

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let minDate = today;

    // Vérifier la disponibilité du candidat
    const availability = this.candidateAvailabilities[candidateId];
    if (availability && availability.availableAfter) {
      const availableAfterDate = new Date(availability.availableAfter);
      const candidateMinDate = new Date(availableAfterDate);
      candidateMinDate.setDate(candidateMinDate.getDate() + 1);

      if (candidateMinDate > minDate) {
        minDate = candidateMinDate;
      }
    }

    // Vérifier la date de début de la demande
    if (demande.startDate) {
      const demandeStartDate = new Date(demande.startDate);
      demandeStartDate.setHours(0, 0, 0, 0);

      if (demandeStartDate > minDate) {
        minDate = demandeStartDate;
      }
    }

    return minDate;
  }

  getMinStartDateForEdit(demande: DemandeWithCandidates): Date | null {
    // Pour l'édition, la date minimum est la date de début de la demande
    // (on permet les dates anciennes pour la modification, mais pas avant la demande)
    if (demande.startDate) {
      return new Date(demande.startDate);
    }
    return null; // Pas de minimum si la demande n'a pas de date de début
  }

  // ============================================
  // TABLE ROW HELPER METHODS
  // ============================================

  getDemandeFromRow(row: ContractTableRow): DemandeWithCandidates | undefined {
    return this.demandes.find(d => d.demandeId === row.demandeId);
  }

  getCandidateFromRow(row: ContractTableRow): Candidate | undefined {
    const demande = this.getDemandeFromRow(row);
    return demande?.candidates.find(c => c.candidateId === row.candidateId);
  }

  uploadContractByRow(row: ContractTableRow): void {
    const demande = this.getDemandeFromRow(row);
    const candidate = this.getCandidateFromRow(row);
    if (demande && candidate) {
      this.uploadContract(demande, candidate);
    }
  }

  editContractByRow(row: ContractTableRow): void {
    const demande = this.getDemandeFromRow(row);
    const candidate = this.getCandidateFromRow(row);
    if (demande && candidate) {
      this.editContract(demande, candidate);
    }
  }

  updateContractByRow(row: ContractTableRow): void {
    const demande = this.getDemandeFromRow(row);
    const candidate = this.getCandidateFromRow(row);
    if (demande && candidate) {
      this.updateContract(demande, candidate);
    }
  }

  deleteContractByRow(row: ContractTableRow): void {
    const demande = this.getDemandeFromRow(row);
    const candidate = this.getCandidateFromRow(row);
    if (demande && candidate) {
      this.deleteContract(demande, candidate);
    }
  }

  getMinStartDateForEditByRow(row: ContractTableRow): Date | null {
    const demande = this.getDemandeFromRow(row);
    return demande ? this.getMinStartDateForEdit(demande) : null;
  }

  getMinStartDateForNewContractByRow(row: ContractTableRow): Date {
    const demande = this.getDemandeFromRow(row);
    if (demande) {
      return this.getMinStartDateForNewContract(demande, row.candidateId);
    }
    return new Date();
  }
}
