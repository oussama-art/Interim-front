import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { Subject, takeUntil } from 'rxjs';

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

interface ContractRow {
  demandeId: number;
  demandeReference: string;
  candidateName: string;
  professional: string;
  skills: string;
  candidateStatus: string;
  startDate: string;
  endDate: string;
  originalFileName: string;
  uploadedAt: string;
  contractId: number;
}

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss',
})
export class ContractsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  contractRows: ContractRow[] = [];
  filteredContractRows: ContractRow[] = [];
  loading = false;
  downloadingContract: { [contractId: number]: boolean } = {};
  displayedColumns: string[] = ['reference', 'candidateName', 'professional', 'status', 'contractDates', 'actions'];
  searchQuery: string = '';
  uniqueDemandes: { demandeId: number; demandeReference: string }[] = [];

  // Filtres de date
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  filterDemandeId: number | null = null;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private globalSearchService: GlobalSearchService
  ) {}

  ngOnInit(): void {
    this.loadDemandes();

    // Écouter les changements de recherche globale
    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchQuery = query;
        this.applySearchFilter();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchService.clearSearch();
  }

  applySearchFilter(): void {
    this.filteredContractRows = this.contractRows.filter(row => {
      // Filtre par demande
      if (this.filterDemandeId !== null) {
        if (row.demandeId !== this.filterDemandeId) {
          return false;
        }
      }

      // Filtre par recherche textuelle
      let matchesSearch = true;
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const reference = row.demandeReference?.toLowerCase() || '';
        const candidateName = row.candidateName?.toLowerCase() || '';
        const professional = row.professional?.toLowerCase() || '';
        const skills = row.skills?.toLowerCase() || '';

        matchesSearch = reference.includes(query) ||
                       candidateName.includes(query) ||
                       professional.includes(query) ||
                       skills.includes(query);
      }

      // Filtre par dates
      let matchesDateRange = true;
      if (this.filterStartDate && this.filterEndDate) {
        // Les deux dates : le contrat doit chevaucher l'intervalle
        // Chevauchement si: contrat.startDate <= filterEndDate ET contrat.endDate >= filterStartDate
        const contractStart = new Date(row.startDate);
        const contractEnd = new Date(row.endDate);
        const filterStart = new Date(this.filterStartDate);
        const filterEnd = new Date(this.filterEndDate);

        matchesDateRange = contractStart <= filterEnd && contractEnd >= filterStart;
      } else if (this.filterStartDate) {
        // Seulement date début : afficher les contrats qui se terminent à partir de cette date
        const contractEnd = new Date(row.endDate);
        const filterStart = new Date(this.filterStartDate);
        matchesDateRange = contractEnd >= filterStart;
      } else if (this.filterEndDate) {
        // Seulement date fin : afficher les contrats qui commencent avant cette date
        const contractStart = new Date(row.startDate);
        const filterEnd = new Date(this.filterEndDate);
        matchesDateRange = contractStart <= filterEnd;
      }

      return matchesSearch && matchesDateRange;
    });
  }

  onStartDateChange(): void {
    // Si la date de fin est antérieure à la date de début, réinitialiser la date de fin
    if (this.filterStartDate && this.filterEndDate && this.filterEndDate < this.filterStartDate) {
      this.filterEndDate = null;
    }
    this.applySearchFilter();
  }

  clearFilters(): void {
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterDemandeId = null;
    this.applySearchFilter();
  }

  updateUniqueDemandes(): void {
    const demandesMap = new Map<number, string>();
    this.contractRows.forEach(row => {
      if (!demandesMap.has(row.demandeId)) {
        demandesMap.set(row.demandeId, row.demandeReference);
      }
    });
    this.uniqueDemandes = Array.from(demandesMap.entries())
      .map(([demandeId, demandeReference]) => ({ demandeId, demandeReference }))
      .sort((a, b) => a.demandeReference.localeCompare(b.demandeReference));
  }

  loadDemandes(): void {
    this.loading = true;

    // Charger les demandes du client authentifié
    this.http.get<any>(`${environment.apiUrl}/clients/my-demandes?page=0&size=10`).subscribe({
      next: (response) => {
        const demandesData = response.content || [];
        const allContracts: ContractResponse[] = [];

        // Charger les contrats pour chaque demande
        const contractRequests = demandesData.map((demande: any) =>
          this.http.get<ContractResponse[]>(`${environment.apiUrl}/contracts/${demande.id}/contracts`).toPromise()
            .then(contracts => {
              if (contracts) {
                allContracts.push(...contracts);
              }
            })
            .catch(error => {
              console.error(`Erreur lors du chargement des contrats pour la demande ${demande.id}:`, error);
            })
        );

        // Attendre que tous les contrats soient chargés
        Promise.all(contractRequests).then(() => {
          this.createContractRows(allContracts);
          this.loading = false;
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement des demandes:', error);
        this.snackBar.open('Erreur lors du chargement des demandes', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  createContractRows(contracts: ContractResponse[]): void {
    this.contractRows = contracts.map(contract => ({
      demandeId: contract.demandeId,
      demandeReference: contract.demandeReference,
      candidateName: `${contract.candidate.firstName} ${contract.candidate.lastName}`,
      professional: contract.candidate.professional,
      skills: contract.candidate.skills,
      candidateStatus: contract.candidate.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      originalFileName: contract.originalFileName,
      uploadedAt: contract.uploadedAt,
      contractId: contract.id
    }));
    this.updateUniqueDemandes();
    this.filteredContractRows = [...this.contractRows];
  }

  downloadContract(contractId: number, fileName: string): void {
    this.downloadingContract[contractId] = true;

    this.http.get(`${environment.apiUrl}/contracts/${contractId}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || `contrat_${contractId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.snackBar.open('Contrat téléchargé avec succès', 'Fermer', { duration: 3000 });
        }
        this.downloadingContract[contractId] = false;
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement:', error);
        this.snackBar.open('Erreur lors du téléchargement du contrat', 'Fermer', { duration: 3000 });
        this.downloadingContract[contractId] = false;
      }
    });
  }

  isDownloading(contractId: number): boolean {
    return this.downloadingContract[contractId] || false;
  }
}
