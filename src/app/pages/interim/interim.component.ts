import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';

interface AssignmentResponse {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  clientId: number;
  demandeId: number;
  demandeReference: string;
  offerId: number;
  startDate: string;
  endDate: string;
  status: string;
  professional?: string;
  skills?: string;
  demandeProfilName?: string;
}

interface CandidateResponse {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  skills: string;
  professional: string;
  experienceYear?: number;
}

interface InterimWorker {
  id: number;
  assignmentId: number;
  demandeId: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  skills: string[];
  status: string;
  demandeReference: string;
  startDate: string;
  endDate: string;
  professional: string;
}

@Component({
  selector: 'app-interim',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './interim.component.html',
  styleUrl: './interim.component.scss'
})
export class InterimComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  workers: InterimWorker[] = [];
  filteredWorkers: InterimWorker[] = [];
  loading = false;
  searchQuery: string = '';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private globalSearchService: GlobalSearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAssignedCandidates();

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

  private applySearchFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredWorkers = [...this.workers];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredWorkers = this.workers.filter(worker => {
      const name = worker.name?.toLowerCase() || '';
      const email = worker.email?.toLowerCase() || '';
      const position = worker.position?.toLowerCase() || '';
      const professional = worker.professional?.toLowerCase() || '';
      const reference = worker.demandeReference?.toLowerCase() || '';
      const skills = worker.skills.join(' ').toLowerCase();

      return name.includes(query) ||
             email.includes(query) ||
             position.includes(query) ||
             professional.includes(query) ||
             reference.includes(query) ||
             skills.includes(query);
    });
  }

  loadAssignedCandidates(): void {
    this.loading = true;
    this.workers = [];

    // Récupérer tous les assignments du client
    this.http.get<any>(`${environment.apiUrl}/assignments`).subscribe({
      next: (response) => {
        const assignments = response.content || [];

        if (assignments.length === 0) {
          this.loading = false;
          this.filteredWorkers = [];
          return;
        }

        // Extraire les IDs de candidats uniques
        const candidateIds = [...new Set(assignments.map((a: AssignmentResponse) => a.candidateId))];

        // Extraire les demandeIds uniques pour lesquels on n'a pas de reference
        const demandeIds = [...new Set(
          assignments
            .filter((a: AssignmentResponse) => a.demandeId && !a.demandeReference)
            .map((a: AssignmentResponse) => a.demandeId)
        )];

        // Récupérer les détails de tous les candidats
        const candidateRequests = candidateIds.map(id =>
          this.http.get<CandidateResponse>(`${environment.apiUrl}/candidates/${id}`)
        );

        // Récupérer les demandes si nécessaire
        const demandeRequests = demandeIds.length > 0
          ? demandeIds.map(id => this.http.get<any>(`${environment.apiUrl}/demandes/${id}`))
          : [];

        const allRequests = {
          candidates: candidateRequests.length > 0 ? forkJoin(candidateRequests) : of([]),
          demandes: demandeRequests.length > 0 ? forkJoin(demandeRequests) : of([])
        };

        forkJoin(allRequests).subscribe({
          next: (results) => {
            const candidates = Array.isArray(results.candidates) ? results.candidates : [];
            const demandes = Array.isArray(results.demandes) ? results.demandes : [];

            // Créer une map des candidats pour accès rapide
            const candidatesMap = new Map<number, CandidateResponse>();
            candidates.forEach(candidate => {
              candidatesMap.set(candidate.id, candidate);
            });

            // Créer une map des demandes pour accès rapide
            const demandesMap = new Map<number, any>();
            demandes.forEach(demande => {
              demandesMap.set(demande.id, demande);
            });

            // Créer les workers à partir des assignments et des candidats
            this.workers = assignments.map((assignment: AssignmentResponse) => {
              const candidate = candidatesMap.get(assignment.candidateId);
              const demande = demandesMap.get(assignment.demandeId);

              // Récupérer la référence depuis l'assignment, sinon depuis la demande
              let demandeReference = assignment.demandeReference
                || demande?.reference
                || '';

              // Fallback visible si aucune référence n'est disponible
              if (!demandeReference && assignment.demandeId) {
                demandeReference = `REF-${assignment.demandeId}`;
              }

              return {
                id: assignment.candidateId,
                assignmentId: assignment.id,
                demandeId: assignment.demandeId,
                name: candidate ? `${candidate.firstName} ${candidate.lastName}` : assignment.candidateName || 'Nom inconnu',
                email: candidate?.emailAddress || assignment.candidateEmail || '',
                phone: candidate?.phoneNumber || assignment.candidatePhone || '',
                position: assignment.demandeProfilName || candidate?.professional || 'Non spécifié',
                skills: candidate?.skills ? candidate.skills.split(',').map(s => s.trim()) : [],
                status: this.getStatusLabel(assignment.status),
                demandeReference: demandeReference,
                startDate: assignment.startDate,
                endDate: assignment.endDate,
                professional: candidate?.professional || ''
              };
            });

            this.filteredWorkers = [...this.workers];
            this.loading = false;
          },
          error: (error) => {
            console.error('❌ Erreur lors du chargement des candidats/demandes:', error);
            this.showError('Erreur lors du chargement des détails');
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des assignments:', error);
        this.showError('Erreur lors du chargement des intérimaires');
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'ACTIVE': 'En mission',
      'COMPLETED': 'Mission terminée',
      'PENDING': 'En attente',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'En mission': 'status-active',
      'Mission terminée': 'status-completed',
      'En attente': 'status-pending',
      'Annulé': 'status-cancelled'
    };
    return classes[status] || 'status-default';
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['custom-error-snackbar']
    });
  }

  viewCandidateDetails(worker: InterimWorker): void {
    this.router.navigate(['/app/interim', worker.id], {
      state: { worker }
    });
  }

  contactCandidate(worker: InterimWorker): void {
    if (worker.email) {
      window.location.href = `mailto:${worker.email}`;
    } else {
      this.snackBar.open('Email non disponible', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }
}
