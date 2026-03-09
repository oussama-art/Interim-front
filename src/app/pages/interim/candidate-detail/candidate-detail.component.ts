import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';

interface CandidateDetail {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  skills: string;
  professional: string;
  experienceYear?: number;
  assignmentId?: number;
  demandeId?: number;
  demandeReference?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  position?: string;
}

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

interface DemandeResponse {
  id: number;
  reference: string;
  profilName?: string;
  description?: string;
}

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule
  ],
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.scss'
})
export class CandidateDetailComponent implements OnInit {
  candidate: CandidateDetail | null = null;
  loading = false;
  candidateId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Essayer de récupérer les données depuis l'état de navigation
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state?.worker) {
      const worker = state.worker;
      this.candidate = {
        id: worker.id,
        firstName: worker.name.split(' ')[0] || '',
        lastName: worker.name.split(' ').slice(1).join(' ') || '',
        emailAddress: worker.email,
        phoneNumber: worker.phone,
        skills: worker.skills.join(', '),
        professional: worker.professional,
        assignmentId: worker.assignmentId,
        demandeId: worker.demandeId,
        demandeReference: worker.demandeReference,
        startDate: worker.startDate,
        endDate: worker.endDate,
        status: worker.status,
        position: worker.position
      };
      console.log('📋 Candidat chargé depuis navigation:', this.candidate);

      // Si on a un demandeId mais pas de demandeReference, la récupérer
      if (worker.demandeId && !worker.demandeReference) {
        this.loading = true;
        this.http.get<DemandeResponse>(`${environment.apiUrl}/demandes/${worker.demandeId}`).subscribe({
          next: (demande) => {
            if (this.candidate) {
              this.candidate.demandeReference = demande.reference;
            }
            this.loading = false;
            console.log('📋 Référence demande récupérée:', demande.reference);
          },
          error: (error) => {
            console.error('❌ Erreur lors du chargement de la référence:', error);
            this.loading = false;
          }
        });
      }
    } else {
      // Sinon, récupérer depuis l'API
      this.route.params.subscribe(params => {
        this.candidateId = +params['id'];
        if (this.candidateId) {
          this.loadCandidateDetails(this.candidateId);
        }
      });
    }
  }

  loadCandidateDetails(id: number): void {
    this.loading = true;

    // Récupérer le candidat et son assignment en parallèle
    const candidateRequest = this.http.get<any>(`${environment.apiUrl}/candidates/${id}`);
    const assignmentsRequest = this.http.get<any>(`${environment.apiUrl}/assignments`);

    forkJoin({
      candidate: candidateRequest,
      assignments: assignmentsRequest
    }).subscribe({
      next: (result) => {
        const candidate = result.candidate;
        const assignments = result.assignments.content || [];

        console.log('📋 Candidat récupéré:', candidate);
        console.log('📋 Assignments:', assignments);

        // Trouver l'assignment de ce candidat
        const assignment = assignments.find((a: AssignmentResponse) => a.candidateId === id);

        if (assignment) {
          console.log('✅ Assignment trouvé:', assignment);

          // Si l'assignment a une demandeReference, l'utiliser directement
          if (assignment.demandeReference) {
            this.candidate = {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              emailAddress: candidate.emailAddress,
              phoneNumber: candidate.phoneNumber,
              skills: candidate.skills,
              professional: candidate.professional,
              experienceYear: candidate.experienceYear,
              assignmentId: assignment.id,
              demandeId: assignment.demandeId,
              demandeReference: assignment.demandeReference,
              startDate: assignment.startDate,
              endDate: assignment.endDate,
              status: this.getStatusLabel(assignment.status),
              position: assignment.demandeProfilName || candidate.professional
            };
            this.loading = false;
          } else if (assignment.demandeId) {
            // Si pas de reference dans l'assignment, la récupérer depuis l'API demande
            this.http.get<DemandeResponse>(`${environment.apiUrl}/demandes/${assignment.demandeId}`).subscribe({
              next: (demande) => {
                console.log('📋 Demande récupérée:', demande);
                this.candidate = {
                  id: candidate.id,
                  firstName: candidate.firstName,
                  lastName: candidate.lastName,
                  emailAddress: candidate.emailAddress,
                  phoneNumber: candidate.phoneNumber,
                  skills: candidate.skills,
                  professional: candidate.professional,
                  experienceYear: candidate.experienceYear,
                  assignmentId: assignment.id,
                  demandeId: assignment.demandeId,
                  demandeReference: demande.reference,
                  startDate: assignment.startDate,
                  endDate: assignment.endDate,
                  status: this.getStatusLabel(assignment.status),
                  position: assignment.demandeProfilName || candidate.professional
                };
                this.loading = false;
              },
              error: (error) => {
                console.error('❌ Erreur lors du chargement de la demande:', error);
                // Continuer avec les infos qu'on a
                this.candidate = {
                  id: candidate.id,
                  firstName: candidate.firstName,
                  lastName: candidate.lastName,
                  emailAddress: candidate.emailAddress,
                  phoneNumber: candidate.phoneNumber,
                  skills: candidate.skills,
                  professional: candidate.professional,
                  experienceYear: candidate.experienceYear,
                  assignmentId: assignment.id,
                  demandeId: assignment.demandeId,
                  startDate: assignment.startDate,
                  endDate: assignment.endDate,
                  status: this.getStatusLabel(assignment.status),
                  position: assignment.demandeProfilName || candidate.professional
                };
                this.loading = false;
              }
            });
          } else {
            // Assignment sans demandeId ni reference
            this.candidate = {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              emailAddress: candidate.emailAddress,
              phoneNumber: candidate.phoneNumber,
              skills: candidate.skills,
              professional: candidate.professional,
              experienceYear: candidate.experienceYear,
              assignmentId: assignment.id,
              startDate: assignment.startDate,
              endDate: assignment.endDate,
              status: this.getStatusLabel(assignment.status),
              position: assignment.demandeProfilName || candidate.professional
            };
            this.loading = false;
          }
        } else {
          // Pas d'assignment trouvé, juste les infos du candidat
          console.log('⚠️ Aucun assignment trouvé pour ce candidat');
          this.candidate = {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            emailAddress: candidate.emailAddress,
            phoneNumber: candidate.phoneNumber,
            skills: candidate.skills,
            professional: candidate.professional,
            experienceYear: candidate.experienceYear
          };
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du candidat:', error);
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

  goBack(): void {
    this.location.back();
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getSkillsArray(): string[] {
    if (!this.candidate?.skills) return [];
    return this.candidate.skills.split(',').map(s => s.trim());
  }

  contactCandidate(): void {
    if (this.candidate?.emailAddress) {
      window.location.href = `mailto:${this.candidate.emailAddress}`;
    }
  }

  callCandidate(): void {
    if (this.candidate?.phoneNumber) {
      window.location.href = `tel:${this.candidate.phoneNumber}`;
    }
  }
}
