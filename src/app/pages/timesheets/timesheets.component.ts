import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { Subject, takeUntil } from 'rxjs';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog/delete-confirmation-dialog.component';

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

interface TimesheetDayResponse {
  date: string;
  dayLabel: string;
  restDay: boolean;
  hours: number | null;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number | null;
  note: string | null;
  isSaved?: boolean; // Indique si le jour est enregistré en base
}

interface TimesheetWeekResponse {
  contractId: number;
  demandeId: number;
  demandeReference: string;
  candidateId: number;
  candidateFullName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  days: TimesheetDayResponse[];
}

interface ContractWithTimesheet {
  contract: ContractResponse;
  currentWeekTimesheet: TimesheetWeekResponse | null;
}

interface TimesheetMonthCreateRequest {
  candidateId: number;
  entryDate: string;
  month: number;
  year: number;
  daysInMonth: number;
  daysWorked: number;
  absenceDays: number;
  paidLeaveDays: number;
  weeklyRestDays?: string[]; // Jours de repos hebdomadaires (MONDAY, TUESDAY, etc.)
  specificRestDates?: string[]; // Dates spécifiques de repos au format ISO
  leaveStartDate?: string;
  leaveEndDate?: string;
  travelFees?: number;
  salaryReminder?: number;
  salaryAdvance?: number;
  kmIndemnity?: number;
  cityAssignment?: string;
  remarks?: string;
}

interface TimesheetMonthResponse {
  id: number;
  candidateId: number;
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  entryDate: string;
  month: number;
  year: number;
  daysInMonth: number;
  daysWorked: number;
  absenceDays: number;
  paidLeaveDays: number;
  weeklyRestDays?: string[];
  specificRestDates?: string[];
  leaveStartDate?: string;
  leaveEndDate?: string;
  travelFees: number;
  salaryReminder: number;
  salaryAdvance: number;
  kmIndemnity: number;
  cityAssignment: string;
  remarks: string;
  createdAt: string;
}

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatCheckboxModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './timesheets.component.html',
  styleUrl: './timesheets.component.scss'
})
export class TimesheetsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  contractsWithTimesheets: ContractWithTimesheet[] = [];
  filteredContracts: ContractWithTimesheet[] = [];
  selectedContract: ContractWithTimesheet | null = null;
  loading = false;
  saving = false;
  editMode: 'day' | 'period' | null = null;

  dayForms: { [date: string]: FormGroup } = {};
  periodForm: FormGroup;

  // Timesheet mensuel
  timesheetMode: 'weekly' | 'monthly' = 'monthly';
  monthlyTimesheets: TimesheetMonthResponse[] = [];
  selectedMonthlyTimesheet: TimesheetMonthResponse | null = null;
  monthlyForm: FormGroup;
  editingMonthlyTimesheet = false;
  viewingMonthlyTimesheetDetails: TimesheetMonthResponse | null = null;

  // Colonnes du tableau mensuel
  monthlyDisplayedColumns: string[] = ['period', 'entryDate', 'daysInMonth', 'daysWorked', 'restDays', 'absenceDays', 'paidLeaveDays', 'leavePeriod', 'travelFees', 'kmIndemnity', 'salaryAdvance', 'salaryReminder', 'cityAssignment', 'actions'];

  weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Fonctionnalités productivité
  searchTerm: string = '';
  viewMode: 'cards' | 'table' = 'table'; // Table par défaut
  showCompletedOnly = false;
  copiedDay: any = null;
  statusFilter: string = 'all';
  filterMode: 'week' | 'month' = 'week'; // Mode de filtre : par semaine ou par mois
  selectedWeekDate: Date | null = null; // Filtre par semaine (via date picker)
  selectedFilterMonth: number | null = null; // Filtre par mois (1-12)
  selectedFilterYear: number | null = null; // Filtre par année
  projectFilter: string = 'all'; // Filtre par projet

  // Listes mises en cache pour éviter le recalcul constant
  availableProjects: Array<{value: string, label: string}> = [];

  // Options pour le formulaire mensuel (initialisées une seule fois)
  readonly monthOptions: Array<{value: number, label: string}> = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];
  yearOptions: number[] = [];

  // Générer les années pour les filtres (de 2020 à année actuelle + 2)
  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = [];
    for (let year = 2020; year <= currentYear + 2; year++) {
      this.yearOptions.push(year);
    }
  }

  // Colonnes du tableau
  displayedColumns: string[] = ['period', 'collaborator', 'project', 'hours', 'status', 'lastUpdate', 'actions'];

  // Helpers pour les statuts
  getStatus(cwt: ContractWithTimesheet): 'draft' | 'submitted' | 'approved' | 'rejected' {
    if (!cwt.currentWeekTimesheet) return 'draft';
    if (cwt.currentWeekTimesheet.totalHours === 0) return 'draft';
    // Logique simplifiée - peut être étendue avec des données backend
    return cwt.currentWeekTimesheet.totalHours > 35 ? 'submitted' : 'draft';
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'draft': 'Brouillon',
      'submitted': 'Soumis',
      'approved': 'Approuvé',
      'rejected': 'Rejeté'
    };
    return labels[status] || status;
  }

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private globalSearchService: GlobalSearchService,
    private dialog: MatDialog
  ) {
    this.periodForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      totalHours: [0],
      defaultBreakMinutes: [60]
    });

    this.monthlyForm = this.fb.group({
      candidateId: [null],
      entryDate: [null],
      month: [new Date().getMonth() + 1],
      year: [new Date().getFullYear()],
      daysInMonth: [0],
      daysWorked: [0],
      absenceDays: [0],
      paidLeaveDays: [0],
      weeklyRestDays: [[]],
      specificRestDates: [[]],
      leaveStartDate: [null],
      leaveEndDate: [null],
      travelFees: [0],
      salaryReminder: [0],
      salaryAdvance: [0],
      kmIndemnity: [0],
      cityAssignment: [''],
      remarks: ['']
    });

    // Calculer automatiquement les jours travaillés
    const calculateDaysWorked = () => {
      const daysInMonth = this.monthlyForm.get('daysInMonth')?.value || 0;
      const absenceDays = this.monthlyForm.get('absenceDays')?.value || 0;
      const paidLeaveDays = this.monthlyForm.get('paidLeaveDays')?.value || 0;
      const restDaysCount = this.getRestDaysCount();

      const daysWorked = Math.max(0, daysInMonth - restDaysCount - absenceDays - paidLeaveDays);
      this.monthlyForm.patchValue({ daysWorked }, { emitEvent: false });
    };

    this.monthlyForm.get('weeklyRestDays')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('specificRestDates')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('month')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('year')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('absenceDays')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('paidLeaveDays')?.valueChanges.subscribe(() => calculateDaysWorked());
    this.monthlyForm.get('daysInMonth')?.valueChanges.subscribe(() => calculateDaysWorked());

    // Valider que l'intervalle de congé correspond au nombre de jours
    const validateLeaveDates = () => {
      const leaveStartDate = this.monthlyForm.get('leaveStartDate')?.value;
      const leaveEndDate = this.monthlyForm.get('leaveEndDate')?.value;
      const paidLeaveDays = this.monthlyForm.get('paidLeaveDays')?.value || 0;

      if (paidLeaveDays > 0 && leaveStartDate && leaveEndDate) {
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);

        if (end >= start) {
          // Calculer le nombre de jours entre les deux dates (inclus)
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          // Vérifier que l'intervalle correspond au nombre de jours de congé
          if (diffDays !== paidLeaveDays) {
            this.monthlyForm.get('leaveEndDate')?.setErrors({ invalidInterval: true });
          } else {
            const currentErrors = this.monthlyForm.get('leaveEndDate')?.errors;
            if (currentErrors && currentErrors['invalidInterval']) {
              delete currentErrors['invalidInterval'];
              const hasOtherErrors = Object.keys(currentErrors).length > 0;
              this.monthlyForm.get('leaveEndDate')?.setErrors(hasOtherErrors ? currentErrors : null);
            }
          }
        }
      } else {
        // Pas de validation si les dates ou le nombre de jours ne sont pas définis
        const currentErrors = this.monthlyForm.get('leaveEndDate')?.errors;
        if (currentErrors && currentErrors['invalidInterval']) {
          delete currentErrors['invalidInterval'];
          const hasOtherErrors = Object.keys(currentErrors).length > 0;
          this.monthlyForm.get('leaveEndDate')?.setErrors(hasOtherErrors ? currentErrors : null);
        }
      }
    };

    this.monthlyForm.get('leaveStartDate')?.valueChanges.subscribe(() => validateLeaveDates());
    this.monthlyForm.get('leaveEndDate')?.valueChanges.subscribe(() => validateLeaveDates());
    this.monthlyForm.get('paidLeaveDays')?.valueChanges.subscribe(() => validateLeaveDates());

    // Initialiser les années disponibles
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.yearOptions.push(i);
    }
  }

  ngOnInit(): void {
    this.generateYearOptions();
    this.loadContracts();

    // Écouter les changements de recherche globale
    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchTerm = query;
        this.filterContracts();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchService.clearSearch();
  }

  loadContracts(): void {
    this.loading = true;

    this.http.get<any>(`${environment.apiUrl}/clients/my-demandes?page=0&size=100`).subscribe({
      next: (response) => {
        const demandesData = response.content || [];

        if (demandesData.length === 0) {
          this.loading = false;
          return;
        }

        const contractRequests = demandesData.map((demande: any) =>
          this.http.get<ContractResponse[]>(`${environment.apiUrl}/contracts/${demande.id}/contracts`).toPromise()
            .catch(() => [])
        );

        Promise.all(contractRequests).then(results => {
          const allContracts: ContractResponse[] = results.flat().filter(c => c) as ContractResponse[];

          this.contractsWithTimesheets = allContracts.map(contract => ({
            contract,
            currentWeekTimesheet: null
          }));

          // Charger les timesheets pour la semaine courante
          this.contractsWithTimesheets.forEach(cwt => {
            this.loadTimesheetForContract(cwt);
          });

          this.filteredContracts = [...this.contractsWithTimesheets];
          this.updateFilterLists(); // Calculer les listes de filtres
          this.loading = false;
        });
      },
      error: (error) => {
        console.error('Erreur chargement demandes:', error);
        this.snackBar.open('Erreur lors du chargement des contrats', 'Fermer', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  loadTimesheetForContract(cwt: ContractWithTimesheet): void {
    const today = new Date();
    const contractStart = new Date(cwt.contract.startDate);
    const contractEnd = new Date(cwt.contract.endDate);

    let weekStart: Date;

    // Si aujourd'hui est avant le début du contrat, commencer à la semaine du contrat
    if (today < contractStart) {
      weekStart = this.getWeekStart(contractStart);
    }
    // Si aujourd'hui est après la fin du contrat, utiliser la dernière semaine du contrat
    else if (today > contractEnd) {
      weekStart = this.getWeekStart(contractEnd);
    }
    // Sinon, utiliser la semaine courante
    else {
      weekStart = this.getWeekStart(today);

      // S'assurer que weekStart n'est pas avant le début du contrat
      const contractWeekStart = this.getWeekStart(contractStart);
      if (weekStart < contractWeekStart) {
        weekStart = contractWeekStart;
      }
    }

    // Créer une structure pour la semaine et charger les données depuis le backend
    this.loadWeekWithData(cwt, weekStart);
  }

  loadWeekWithData(cwt: ContractWithTimesheet, weekStart: Date): void {
    // Créer la structure de base
    const emptyWeek = this.createEmptyWeek(cwt.contract, weekStart);
    cwt.currentWeekTimesheet = emptyWeek;

    // Récupérer les jours travaillés depuis le backend
    const candidateId = cwt.contract.candidate.candidateId;
    const from = emptyWeek.weekStart;
    const to = emptyWeek.weekEnd;

    const url = `${environment.apiUrl}/timesheets/contracts/${cwt.contract.id}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

    this.http.get<TimesheetDayResponse[]>(url).subscribe({
      next: (workedDays) => {
        // Fusionner les données du backend avec la structure locale
        this.mergeWorkedDaysIntoWeek(cwt.currentWeekTimesheet!, workedDays);
        this.initializeDayForms(cwt.currentWeekTimesheet!);
        // Mettre à jour les listes de filtres après chargement
        this.updateFilterLists();
      },
      error: (error) => {
        console.error('Erreur chargement jours travaillés:', error);
        // Continuer avec la structure vide en cas d'erreur
        this.initializeDayForms(cwt.currentWeekTimesheet!);
        // Mettre à jour les listes de filtres même en cas d'erreur
        this.updateFilterLists();
      }
    });
  }

  mergeWorkedDaysIntoWeek(week: TimesheetWeekResponse, workedDays: TimesheetDayResponse[]): void {
    // Créer un map des jours travaillés par date pour un accès rapide
    const workedDaysMap = new Map<string, TimesheetDayResponse>();
    workedDays.forEach(day => {
      workedDaysMap.set(day.date, day);
    });

    // Mettre à jour chaque jour de la semaine avec les données du backend
    week.days.forEach(day => {
      const workedDay = workedDaysMap.get(day.date);
      if (workedDay) {
        // Fusionner les données du backend (avec conversion explicite de restDay en booléen)
        day.restDay = Boolean(workedDay.restDay);
        day.hours = workedDay.hours;
        day.startTime = workedDay.startTime;
        day.endTime = workedDay.endTime;
        day.breakMinutes = workedDay.breakMinutes;
        day.note = workedDay.note;
        day.isSaved = true; // Marquer comme enregistré
      } else {
        // Réinitialiser le jour s'il n'existe plus dans le backend (cas de suppression)
        // Mais conserver restDay = true si c'est un weekend
        const dateObj = new Date(day.date);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        day.restDay = isWeekend; // Conserver weekend comme jour de repos
        day.hours = null;
        day.startTime = null;
        day.endTime = null;
        day.breakMinutes = null;
        day.note = null;
        day.isSaved = false; // Non enregistré
      }
    });

    // Recalculer le total (seulement les jours enregistrés en base)
    week.totalHours = week.days
      .filter(d => !d.restDay && d.isSaved && d.hours)
      .reduce((sum, d) => sum + (d.hours || 0), 0);
  }

  createEmptyWeek(contract: ContractResponse, weekStart: Date): TimesheetWeekResponse {
    const days: TimesheetDayResponse[] = [];
    const contractStart = new Date(contract.startDate);
    contractStart.setHours(0, 0, 0, 0);
    const contractEnd = new Date(contract.endDate);
    contractEnd.setHours(23, 59, 59, 999);

    // Calculer la fin de la semaine (weekStart + 6 jours)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Déterminer la période réelle de saisie (intersection entre la semaine et le contrat)
    const startDate = weekStart < contractStart ? contractStart : weekStart;
    const endDate = weekEnd > contractEnd ? contractEnd : weekEnd;

    // Créer les jours de startDate à endDate (uniquement les jours dans la période du contrat)
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Calculer le label du jour (Lundi, Mardi, etc.)
      // getDay() retourne 0=Dimanche, 1=Lundi, ..., 6=Samedi
      // Notre tableau weekDays est [Lundi, Mardi, ..., Dimanche]
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      days.push({
        date: currentDate.toISOString().split('T')[0],
        dayLabel: this.weekDays[dayIndex],
        restDay: isWeekend,
        hours: null,
        startTime: null,
        endTime: null,
        breakMinutes: null,
        note: null,
        isSaved: false
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      contractId: contract.id,
      demandeId: contract.demandeId,
      demandeReference: contract.demandeReference,
      candidateId: contract.candidate.candidateId,
      candidateFullName: `${contract.candidate.firstName} ${contract.candidate.lastName}`,
      weekStart: days.length > 0 ? days[0].date : startDate.toISOString().split('T')[0],
      weekEnd: days.length > 0 ? days[days.length - 1].date : endDate.toISOString().split('T')[0],
      totalHours: 0,
      days
    };
  }

  getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  initializeDayForms(timesheet: TimesheetWeekResponse): void {
    timesheet.days.forEach(day => {
      const form = this.fb.group({
        restDay: [Boolean(day.restDay)],
        startTime: [day.startTime || '09:00'],
        endTime: [day.endTime || '17:00'],
        breakMinutes: [day.breakMinutes || 60],
        hours: [day.hours || 0], // Utiliser la valeur de la base si disponible
        note: [day.note || '']
      });

      this.dayForms[day.date] = form;

      // Ne calculer automatiquement que pour les jours déjà enregistrés
      if (day.isSaved) {
        this.calculateHoursFromTime(day.date);
      }
    });
  }

  selectContract(cwtOrGroup: ContractWithTimesheet | { contracts: ContractWithTimesheet[] }): void {
    let cwt: ContractWithTimesheet | null = null;

    // Déterminer si c'est un contrat direct ou un groupe agrégé
    if ('contracts' in cwtOrGroup && Array.isArray(cwtOrGroup.contracts)) {
      // C'est un groupe de la vue par mois - sélectionner le premier contrat valide
      const validContract = cwtOrGroup.contracts.find(c => {
        return c.currentWeekTimesheet !== null && c.currentWeekTimesheet !== undefined;
      });

      if (validContract) {
        cwt = validContract;
      } else if (cwtOrGroup.contracts.length > 0) {
        cwt = cwtOrGroup.contracts[0];
        const today = new Date();
        const normalizedWeekStart = this.getWeekStart(today);

        // CRÉER le currentWeekTimesheet
        const emptyWeek = this.createEmptyWeek(cwt.contract, normalizedWeekStart);
        cwt.currentWeekTimesheet = emptyWeek;

        // Charger les données réelles du backend
        this.loadWeekWithData(cwt, normalizedWeekStart);
      }

    } else {
      // C'est un ContractWithTimesheet direct de la vue par semaine
      cwt = cwtOrGroup as ContractWithTimesheet;
    }

    if (cwt) {
      this.selectedContract = cwt;
      this.editMode = null;

      // Si on est en mode mensuel, charger les timesheets mensuels du candidat
      if (this.timesheetMode === 'monthly') {
        this.loadMonthlyTimesheetsForCandidate(this.selectedContract.contract.candidate.candidateId);
      }
    }
  }

  // Méthode wrapper pour éditer jour par jour
  startEditDayWrapper(cwtOrGroup: ContractWithTimesheet | { contracts: ContractWithTimesheet[] }): void {
    this.selectContract(cwtOrGroup);
    this.startEditDay();
  }

  // Méthode wrapper pour saisie rapide
  startEditPeriodWrapper(cwtOrGroup: ContractWithTimesheet | { contracts: ContractWithTimesheet[] }): void {
    this.selectContract(cwtOrGroup);
    this.startEditPeriod();
  }

  // Méthode wrapper pour dupliquer
  duplicateToAllWrapper(cwtOrGroup: ContractWithTimesheet | { contracts: ContractWithTimesheet[] }): void {
    this.selectContract(cwtOrGroup);
    this.duplicateToAll();
  }

  // Méthode wrapper pour supprimer
  deleteWeekWrapper(cwtOrGroup: ContractWithTimesheet | { contracts: ContractWithTimesheet[] }): void {
    this.selectContract(cwtOrGroup);
    this.deleteWeek();
  }

  backToList(): void {
    this.selectedContract = null;
    this.editMode = null;
    this.selectedMonthlyTimesheet = null;
    this.editingMonthlyTimesheet = false;
    this.monthlyTimesheets = [];
  }

  navigateToPreviousWeek(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    const currentWeekStart = new Date(this.selectedContract.currentWeekTimesheet.weekStart);

    // Calculer le lundi de la semaine précédente
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Vérifier que la semaine précédente a des jours dans le contrat
    const contractStart = new Date(this.selectedContract.contract.startDate);
    contractStart.setHours(0, 0, 0, 0);

    // Calculer la fin de la semaine précédente
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);

    // Si toute la semaine précédente est avant le contrat, ne pas naviguer
    if (previousWeekEnd < contractStart) {
      return;
    }

    this.loadWeekFromDate(previousWeekStart);
  }

  navigateToNextWeek(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    const currentWeekEnd = new Date(this.selectedContract.currentWeekTimesheet.weekEnd);

    // Calculer le début de la semaine suivante (jour après la fin de la semaine actuelle)
    const nextWeekStart = new Date(currentWeekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);

    // Trouver le lundi de cette semaine
    const actualNextWeekStart = this.getWeekStart(nextWeekStart);

    const contractEnd = new Date(this.selectedContract.contract.endDate);
    contractEnd.setHours(23, 59, 59, 999);

    // Si le début de la semaine suivante est après la fin du contrat, ne pas naviguer
    if (actualNextWeekStart > contractEnd) {
      return;
    }

    this.loadWeekFromDate(actualNextWeekStart);
  }

  loadWeekFromDate(weekStart: Date): void {
    if (!this.selectedContract) return;

    // Charger la semaine avec les données du backend
    this.loadWeekWithData(this.selectedContract, weekStart);
  }

  canNavigateToPreviousWeek(): boolean {
    if (!this.selectedContract?.currentWeekTimesheet) return false;

    const currentWeekStart = new Date(this.selectedContract.currentWeekTimesheet.weekStart);
    const contractStart = new Date(this.selectedContract.contract.startDate);
    contractStart.setHours(0, 0, 0, 0);

    // Calculer le lundi de la semaine précédente
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Calculer la fin de la semaine précédente
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);

    // Vérifier que la semaine précédente contient au moins un jour dans le contrat
    return previousWeekEnd >= contractStart;
  }

  canNavigateToNextWeek(): boolean {
    if (!this.selectedContract?.currentWeekTimesheet) return false;

    const currentWeekEnd = new Date(this.selectedContract.currentWeekTimesheet.weekEnd);
    const contractEnd = new Date(this.selectedContract.contract.endDate);
    contractEnd.setHours(23, 59, 59, 999);

    // Calculer le début de la semaine suivante
    const nextWeekStart = new Date(currentWeekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);

    // Vérifier qu'il y a encore des jours après la semaine actuelle
    return nextWeekStart <= contractEnd;
  }

  startEditDay(): void {
    this.editMode = 'day';
  }

  startEditPeriod(): void {
    this.editMode = 'period';
    if (this.selectedContract?.currentWeekTimesheet) {
      const ts = this.selectedContract.currentWeekTimesheet;
      this.periodForm.patchValue({
        startDate: new Date(ts.weekStart),
        endDate: new Date(ts.weekEnd),
        totalHours: ts.totalHours,
        defaultBreakMinutes: 60
      });
    }
  }

  saveDayChanges(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    this.saving = true;
    const timesheet = this.selectedContract.currentWeekTimesheet;
    const candidateId = this.selectedContract.contract.candidate.candidateId;
    const savePromises: Promise<any>[] = [];

    timesheet.days.forEach(day => {
      const form = this.dayForms[day.date];
      if (form && form.dirty) {
        const request = {
          restDay: Boolean(form.value.restDay),
          startTime: form.value.restDay ? null : form.value.startTime,
          endTime: form.value.restDay ? null : form.value.endTime,
          breakMinutes: form.value.restDay ? null : (form.value.breakMinutes ? parseInt(form.value.breakMinutes) : null),
          hours: form.value.restDay ? null : (form.value.hours ? parseFloat(form.value.hours) : null),
          note: form.value.note || null
        };

        const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/days/${day.date}?candidateId=${candidateId}`;
        savePromises.push(
          this.http.put(url, request).toPromise()
        );
      }
    });

    Promise.all(savePromises).then(() => {
      // Recharger les données depuis le backend pour avoir l'état à jour
      const candidateId = this.selectedContract!.contract.candidate.candidateId;
      const from = timesheet.weekStart;
      const to = timesheet.weekEnd;
      const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

      this.http.get<TimesheetDayResponse[]>(url).subscribe({
        next: (workedDays) => {
          this.mergeWorkedDaysIntoWeek(timesheet, workedDays);
          this.initializeDayForms(timesheet);

          // Mettre à jour la liste principale pour refléter les changements
          this.updateContractInMainList(this.selectedContract!);

          this.snackBar.open('Heures enregistrées avec succès', 'Fermer', { duration: 3000 });
          this.saving = false;
          this.editMode = null;
        },
        error: (error) => {
          console.error('Erreur rechargement données:', error);
          this.snackBar.open('Enregistré mais erreur de rechargement', 'Fermer', { duration: 5000 });
          this.saving = false;
          this.editMode = null;
        }
      });
    }).catch(error => {
      console.error('Erreur sauvegarde:', error);
      this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 5000 });
      this.saving = false;
    });
  }

  savePeriodTotal(): void {
    if (!this.selectedContract?.currentWeekTimesheet || !this.periodForm.valid) return;

    this.saving = true;
    const timesheet = this.selectedContract.currentWeekTimesheet;
    const candidateId = this.selectedContract.contract.candidate.candidateId;

    const request = {
      startDate: this.formatDate(this.periodForm.value.startDate),
      endDate: this.formatDate(this.periodForm.value.endDate),
      totalHours: parseFloat(this.periodForm.value.totalHours),
      defaultBreakMinutes: parseInt(this.periodForm.value.defaultBreakMinutes)
    };

    const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/period-total?candidateId=${candidateId}`;
    this.http.post(url, request)
      .subscribe({
        next: () => {
          // Recharger les données depuis le backend
          const from = timesheet.weekStart;
          const to = timesheet.weekEnd;
          const reloadUrl = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

          this.http.get<TimesheetDayResponse[]>(reloadUrl).subscribe({
            next: (workedDays) => {
              this.mergeWorkedDaysIntoWeek(timesheet, workedDays);
              this.initializeDayForms(timesheet);

              // Mettre à jour la liste principale pour refléter les changements
              this.updateContractInMainList(this.selectedContract!);

              this.snackBar.open('Total enregistré avec succès', 'Fermer', { duration: 3000 });
              this.saving = false;
              this.editMode = null;
            },
            error: (error) => {
              console.error('Erreur rechargement données:', error);
              this.snackBar.open('Enregistré mais erreur de rechargement', 'Fermer', { duration: 5000 });
              this.saving = false;
              this.editMode = null;
            }
          });
        },
        error: (error) => {
          console.error('Erreur sauvegarde période:', error);
          this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 5000 });
          this.saving = false;
        }
      });
  }

  cancelEdit(): void {
    this.editMode = null;
    if (this.selectedContract?.currentWeekTimesheet) {
      this.initializeDayForms(this.selectedContract.currentWeekTimesheet);
    }
  }

  calculateHoursFromTime(date: string): void {
    const form = this.dayForms[date];
    if (!form) {
      console.warn('Form not found for date:', date);
      return;
    }

    const restDay = form.get('restDay')?.value;

    // Si c'est un jour de repos, mettre les heures à 0
    if (restDay) {
      form.get('hours')?.setValue(0, { emitEvent: false });
      return;
    }

    const startTime = form.get('startTime')?.value;
    const endTime = form.get('endTime')?.value;
    const breakMinutes = form.get('breakMinutes')?.value || 0;

    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - breakMinutes;
      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      const finalHours = hours > 0 ? hours : 0;

      // Mettre à jour le formControl (pour la vue édition)
      form.get('hours')?.setValue(finalHours, { emitEvent: false });
    }
  }

  getTotalHours(): number {
    if (!this.selectedContract?.currentWeekTimesheet) return 0;

    // Ne compter que les jours enregistrés en base
    return this.selectedContract.currentWeekTimesheet.days.reduce((sum, day) => {
      if (!day.isSaved || day.restDay) return sum;
      return sum + (day.hours || 0);
    }, 0);
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDisplayDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getCandidateName(contract: ContractResponse): string {
    return `${contract.candidate.firstName} ${contract.candidate.lastName}`;
  }

  getContractMinDate(): Date | null {
    if (!this.selectedContract) return null;
    return new Date(this.selectedContract.contract.startDate);
  }

  getContractMaxDate(): Date | null {
    if (!this.selectedContract) return null;
    return new Date(this.selectedContract.contract.endDate);
  }

  hasAnyNotes(): boolean {
    if (!this.selectedContract?.currentWeekTimesheet) return false;
    return this.selectedContract.currentWeekTimesheet.days.some(day => day.note);
  }

  // ===== FONCTIONNALITÉS DE PRODUCTIVITÉ =====

  filterContracts(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredContracts = this.contractsWithTimesheets.filter(cwt => {
      const candidateName = this.getCandidateName(cwt.contract).toLowerCase();
      const reference = cwt.contract.demandeReference.toLowerCase();
      const professional = cwt.contract.candidate.professional.toLowerCase();

      const matchesSearch = !term ||
        candidateName.includes(term) ||
        reference.includes(term) ||
        professional.includes(term);

      const matchesFilter = !this.showCompletedOnly ||
        (cwt.currentWeekTimesheet && cwt.currentWeekTimesheet.totalHours > 0);

      // Filtre par statut
      const status = this.getStatus(cwt);
      const matchesStatus = this.statusFilter === 'all' || status === this.statusFilter;

      // Filtre par période (semaine ou mois)
      let matchesPeriod = true;
      if (this.filterMode === 'week' && this.selectedWeekDate) {
        // Comparer si la date sélectionnée est dans la même semaine que le timesheet
        if (cwt.currentWeekTimesheet) {
          const weekStart = new Date(cwt.currentWeekTimesheet.weekStart);
          const weekEnd = new Date(cwt.currentWeekTimesheet.weekEnd);
          const selectedDate = new Date(this.selectedWeekDate);
          matchesPeriod = selectedDate >= weekStart && selectedDate <= weekEnd;
        } else {
          matchesPeriod = false;
        }
      } else if (this.filterMode === 'month' && (this.selectedFilterMonth || this.selectedFilterYear)) {
        // Filtrer par mois et/ou année
        if (cwt.currentWeekTimesheet) {
          const timesheetDate = new Date(cwt.currentWeekTimesheet.weekStart);
          const timesheetMonth = timesheetDate.getMonth() + 1; // getMonth() retourne 0-11
          const timesheetYear = timesheetDate.getFullYear();

          const matchesMonth = !this.selectedFilterMonth || timesheetMonth === this.selectedFilterMonth;
          const matchesYear = !this.selectedFilterYear || timesheetYear === this.selectedFilterYear;
          matchesPeriod = matchesMonth && matchesYear;
        } else {
          matchesPeriod = false;
        }
      }

      // Filtre par projet
      const matchesProject = this.projectFilter === 'all' ||
        cwt.contract.demandeReference === this.projectFilter;

      return matchesSearch && matchesFilter && matchesStatus && matchesPeriod && matchesProject;
    });
  }

  getGlobalStats() {
    const totalContracts = this.contractsWithTimesheets.length;
    const totalHours = this.contractsWithTimesheets.reduce((sum, cwt) =>
      sum + (cwt.currentWeekTimesheet?.totalHours || 0), 0
    );
    const contractsWithHours = this.contractsWithTimesheets.filter(cwt =>
      cwt.currentWeekTimesheet && cwt.currentWeekTimesheet.totalHours > 0
    ).length;

    return { totalContracts, totalHours, contractsWithHours };
  }

// Mettre à jour les listes pour les filtres (appelé une seule fois après chargement)
  private updateFilterLists(): void {
    // Récupérer tous les projets disponibles
    const projectsSet = new Set<string>();
    this.contractsWithTimesheets.forEach(cwt => {
      projectsSet.add(cwt.contract.demandeReference);
    });

    this.availableProjects = Array.from(projectsSet).sort().map(ref => ({
      value: ref,
      label: ref
    }));
  }

  goToToday(): void {
    if (!this.selectedContract) return;
    const today = new Date();
    const weekStart = this.getWeekStart(today);
    this.loadWeekWithData(this.selectedContract, weekStart);
    this.snackBar.open('Affichage de la semaine en cours', '', { duration: 2000 });
  }

  // Méthodes helper pour la vue par mois - sélectionner le premier contrat valide
  selectFirstValidContract(contracts: ContractWithTimesheet[]): void {
    if (!contracts || contracts.length === 0) return;

    const validContract = contracts.find(c => c.currentWeekTimesheet !== null);
    if (validContract) {
      this.selectContract(validContract);
    } else if (contracts[0]) {
      this.selectContract(contracts[0]);
    }
  }

  selectAndEditFirstValidContract(contracts: ContractWithTimesheet[]): void {
    if (!contracts || contracts.length === 0) return;

    const validContract = contracts.find(c => c.currentWeekTimesheet !== null);
    if (validContract) {
      this.selectContract(validContract);
      this.startEditDay();
    } else if (contracts[0]) {
      this.selectContract(contracts[0]);
      this.startEditDay();
    }
  }

  selectAndEditPeriodFirstValidContract(contracts: ContractWithTimesheet[]): void {
    if (!contracts || contracts.length === 0) return;

    const validContract = contracts.find(c => c.currentWeekTimesheet !== null);
    if (validContract) {
      this.selectContract(validContract);
      this.startEditPeriod();
    } else if (contracts[0]) {
      this.selectContract(contracts[0]);
      this.startEditPeriod();
    }
  }

  selectAndDuplicateFirstValidContract(contracts: ContractWithTimesheet[]): void {
    if (!contracts || contracts.length === 0) return;

    const validContract = contracts.find(c => c.currentWeekTimesheet !== null);
    if (validContract) {
      this.selectContract(validContract);
      this.duplicateToAll();
    } else if (contracts[0]) {
      this.selectContract(contracts[0]);
      this.duplicateToAll();
    }
  }

  selectAndDeleteFirstValidContract(contracts: ContractWithTimesheet[]): void {
    if (!contracts || contracts.length === 0) return;

    const validContract = contracts.find(c => c.currentWeekTimesheet !== null);
    if (validContract) {
      this.selectContract(validContract);
      this.deleteWeek();
    } else if (contracts[0]) {
      this.selectContract(contracts[0]);
      this.deleteWeek();
    }
  }

  copyDay(date: string): void {
    const form = this.dayForms[date];
    if (!form) return;

    this.copiedDay = { ...form.value };
    this.snackBar.open('Jour copié !', '', { duration: 2000 });
  }

  pasteDay(date: string): void {
    if (!this.copiedDay) {
      this.snackBar.open('Aucun jour copié', '', { duration: 2000 });
      return;
    }

    const form = this.dayForms[date];
    if (!form) return;

    form.patchValue(this.copiedDay);
    this.snackBar.open('Jour collé !', '', { duration: 2000 });
  }

  duplicateToAll(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    const days = this.selectedContract.currentWeekTimesheet.days;
    const firstDayWithData = days.find(d =>
      !d.restDay && (d.hours || d.startTime || d.endTime)
    );

    if (!firstDayWithData) {
      this.snackBar.open('Aucune donnée à dupliquer', '', { duration: 2000 });
      return;
    }

    const template = this.dayForms[firstDayWithData.date]?.value;
    if (!template) return;

    days.forEach(day => {
      if (!day.restDay && day.date !== firstDayWithData.date) {
        const form = this.dayForms[day.date];
        if (form) {
          form.patchValue({
            startTime: template.startTime,
            endTime: template.endTime,
            breakMinutes: template.breakMinutes,
            hours: template.hours,
            note: template.note
          });
        }
      }
    });

    this.snackBar.open('Données dupliquées sur tous les jours !', '', { duration: 2000 });
  }

  fillWeekWithStandardHours(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    this.selectedContract.currentWeekTimesheet.days.forEach(day => {
      const form = this.dayForms[day.date];
      if (!form || day.restDay) return;

      // Remplir avec 8h par jour, 9h-18h avec 1h de pause
      form.patchValue({
        restDay: false,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        hours: 8,
        note: ''
      });
    });

    this.snackBar.open('Semaine remplie avec horaires standard (9h-18h)', '', { duration: 2000 });
  }

  getWeekCompletion(): number {
    if (!this.selectedContract?.currentWeekTimesheet) return 0;

    const days = this.selectedContract.currentWeekTimesheet.days;
    const workDays = days.filter(d => !d.restDay);
    const filledDays = workDays.filter(d => d.isSaved && d.hours && d.hours > 0);

    return workDays.length > 0 ? (filledDays.length / workDays.length) * 100 : 0;
  }

  getWeekStatus(): 'empty' | 'partial' | 'complete' {
    const completion = this.getWeekCompletion();
    if (completion === 0) return 'empty';
    if (completion < 100) return 'partial';
    return 'complete';
  }

  clearWeek(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    if (!confirm('Êtes-vous sûr de vouloir effacer toutes les heures de cette semaine ?')) {
      return;
    }

    this.selectedContract.currentWeekTimesheet.days.forEach(day => {
      const form = this.dayForms[day.date];
      if (form) {
        form.patchValue({
          restDay: false,
          startTime: null,
          endTime: null,
          breakMinutes: null,
          hours: null,
          note: ''
        });
      }
    });

    this.snackBar.open('Semaine effacée', '', { duration: 2000 });
  }

  // ✅ Supprimer un jour spécifique
  deleteDay(date: string): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer les heures du ${this.formatDisplayDate(date)} ?`)) {
      return;
    }

    const timesheet = this.selectedContract.currentWeekTimesheet;
    const candidateId = this.selectedContract.contract.candidate.candidateId;
    const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/days/${date}?candidateId=${candidateId}`;

    this.saving = true;
    this.http.delete(url).subscribe({
      next: () => {
        // Recharger les données depuis le backend
        const from = timesheet.weekStart;
        const to = timesheet.weekEnd;
        const reloadUrl = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

        this.http.get<TimesheetDayResponse[]>(reloadUrl).subscribe({
          next: (workedDays) => {
            this.mergeWorkedDaysIntoWeek(timesheet, workedDays);
            this.initializeDayForms(timesheet);

            // Mettre à jour la liste principale pour refléter les changements
            this.updateContractInMainList(this.selectedContract!);

            this.snackBar.open('Jour supprimé avec succès', 'Fermer', { duration: 3000 });
            this.saving = false;
          },
          error: (error) => {
            console.error('Erreur rechargement données:', error);
            this.snackBar.open('Supprimé mais erreur de rechargement', 'Fermer', { duration: 5000 });
            this.saving = false;
          }
        });
      },
      error: (error) => {
        console.error('Erreur suppression jour:', error);
        this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 5000 });
        this.saving = false;
      }
    });
  }

  // ✅ Supprimer toute la semaine
  deleteWeek(): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement toutes les heures de cette semaine ?')) {
      return;
    }

    const timesheet = this.selectedContract.currentWeekTimesheet;
    const candidateId = this.selectedContract.contract.candidate.candidateId;
    const deletePromises: Promise<any>[] = [];

    // Supprimer tous les jours qui ont des heures
    timesheet.days.forEach(day => {
      if (day.hours && day.hours > 0) {
        const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/days/${day.date}?candidateId=${candidateId}`;
        deletePromises.push(this.http.delete(url).toPromise());
      }
    });

    if (deletePromises.length === 0) {
      this.snackBar.open('Aucune donnée à supprimer', '', { duration: 2000 });
      return;
    }

    this.saving = true;
    Promise.all(deletePromises).then(() => {
      // Recharger les données depuis le backend
      const from = timesheet.weekStart;
      const to = timesheet.weekEnd;
      const reloadUrl = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

      this.http.get<TimesheetDayResponse[]>(reloadUrl).subscribe({
        next: (workedDays) => {
          this.mergeWorkedDaysIntoWeek(timesheet, workedDays);
          this.initializeDayForms(timesheet);

          // Mettre à jour la liste principale pour refléter les changements
          this.updateContractInMainList(this.selectedContract!);

          this.snackBar.open('Semaine supprimée avec succès', 'Fermer', { duration: 3000 });
          this.saving = false;
        },
        error: (error) => {
          console.error('Erreur rechargement données:', error);
          this.snackBar.open('Supprimé mais erreur de rechargement', 'Fermer', { duration: 5000 });
          this.saving = false;
        }
      });
    }).catch(error => {
      console.error('Erreur suppression semaine:', error);
      this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 5000 });
      this.saving = false;
    });
  }

  // ✅ Modifier partiellement un jour (PATCH)
  patchDay(date: string, updates: Partial<any>): void {
    if (!this.selectedContract?.currentWeekTimesheet) return;

    const timesheet = this.selectedContract.currentWeekTimesheet;
    const candidateId = this.selectedContract.contract.candidate.candidateId;
    const url = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/days/${date}?candidateId=${candidateId}`;

    this.saving = true;
    this.http.patch(url, updates).subscribe({
      next: () => {
        // Recharger les données depuis le backend
        const from = timesheet.weekStart;
        const to = timesheet.weekEnd;
        const reloadUrl = `${environment.apiUrl}/timesheets/contracts/${timesheet.contractId}/worked-days?candidateId=${candidateId}&from=${from}&to=${to}`;

        this.http.get<TimesheetDayResponse[]>(reloadUrl).subscribe({
          next: (workedDays) => {
            this.mergeWorkedDaysIntoWeek(timesheet, workedDays);
            this.initializeDayForms(timesheet);

            // Mettre à jour la liste principale pour refléter les changements
            this.updateContractInMainList(this.selectedContract!);

            this.snackBar.open('Jour modifié avec succès', 'Fermer', { duration: 3000 });
            this.saving = false;
          },
          error: (error) => {
            console.error('Erreur rechargement données:', error);
            this.snackBar.open('Modifié mais erreur de rechargement', 'Fermer', { duration: 5000 });
            this.saving = false;
          }
        });
      },
      error: (error) => {
        console.error('Erreur modification jour:', error);
        this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 5000 });
        this.saving = false;
      }
    });
  }

  // Mettre à jour le contrat dans la liste principale
  updateContractInMainList(updatedContract: ContractWithTimesheet): void {
    // Trouver l'index dans contractsWithTimesheets
    const index = this.contractsWithTimesheets.findIndex(
      cwt => cwt.contract.id === updatedContract.contract.id
    );

    if (index !== -1) {
      // Mettre à jour la référence dans la liste principale
      this.contractsWithTimesheets[index] = updatedContract;
    }

    // Mettre à jour aussi filteredContracts
    this.filterContracts();
  }

  // Helper functions for new template
  getWeekNumber(date: string | undefined): number {
    if (!date) return 0;
    const d = new Date(date);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    return Math.ceil((((d.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
  }

  formatShortDate(date: string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  getInitials(contract: ContractResponse): string {
    const candidate = contract.candidate;
    if (!candidate) return '?';

    const firstName = candidate.firstName || '';
    const lastName = candidate.lastName || '';

    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  // ===== MÉTHODES POUR TIMESHEET MENSUEL =====

  switchToMonthlyMode(): void {
    this.timesheetMode = 'monthly';
    this.selectedMonthlyTimesheet = null;
    this.editingMonthlyTimesheet = false;
    // Si un contrat est déjà sélectionné, charger ses timesheets mensuels
    if (this.selectedContract) {
      this.loadMonthlyTimesheetsForCandidate(this.selectedContract.contract.candidate.candidateId);
    }
  }

  switchToWeeklyMode(): void {
    this.timesheetMode = 'weekly';
    this.selectedMonthlyTimesheet = null;
    this.editingMonthlyTimesheet = false;
    this.monthlyTimesheets = [];
  }

  loadMonthlyTimesheetsForCandidate(candidateId: number): void {
    this.loading = true;
    const url = `${environment.apiUrl}/timesheet-months/candidates/${candidateId}`;

    this.http.get<TimesheetMonthResponse[]>(url).subscribe({
      next: (data) => {
        this.monthlyTimesheets = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement timesheets mensuels:', error);
        this.snackBar.open('Erreur lors du chargement des timesheets mensuels', 'Fermer', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  startCreateMonthlyTimesheet(): void {
    if (!this.selectedContract) {
      this.snackBar.open('Veuillez sélectionner un contrat', 'Fermer', { duration: 3000 });
      return;
    }

    this.editingMonthlyTimesheet = true;
    this.selectedMonthlyTimesheet = null;

    // Calculer le nombre de jours dans le mois sélectionné
    const month = this.monthlyForm.get('month')?.value || new Date().getMonth() + 1;
    const year = this.monthlyForm.get('year')?.value || new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    // Utiliser emitEvent: false pour éviter de déclencher les événements selectionChange
    this.monthlyForm.patchValue({
      candidateId: this.selectedContract.contract.candidate.candidateId,
      entryDate: null,
      month: month,
      year: year,
      daysInMonth: daysInMonth,
      daysWorked: daysInMonth, // Tous les jours travaillés par défaut
      absenceDays: 0,
      paidLeaveDays: 0,
      weeklyRestDays: [],
      specificRestDates: [],
      leaveStartDate: null,
      leaveEndDate: null,
      travelFees: 0,
      salaryReminder: 0,
      salaryAdvance: 0,
      kmIndemnity: 0,
      cityAssignment: '',
      remarks: ''
    }, { emitEvent: false });
  }

  editMonthlyTimesheet(timesheet: TimesheetMonthResponse): void {
    this.viewingMonthlyTimesheetDetails = null; // Fermer les détails si ouverts
    this.editingMonthlyTimesheet = true;
    this.selectedMonthlyTimesheet = timesheet;

    // Utiliser emitEvent: false pour éviter de déclencher les événements selectionChange
    this.monthlyForm.patchValue({
      candidateId: timesheet.candidateId,
      entryDate: timesheet.entryDate,
      month: timesheet.month,
      year: timesheet.year,
      daysInMonth: timesheet.daysInMonth,
      daysWorked: timesheet.daysWorked,
      absenceDays: timesheet.absenceDays,
      paidLeaveDays: timesheet.paidLeaveDays,
      weeklyRestDays: timesheet.weeklyRestDays || [],
      specificRestDates: timesheet.specificRestDates || [],
      leaveStartDate: timesheet.leaveStartDate || null,
      leaveEndDate: timesheet.leaveEndDate || null,
      travelFees: timesheet.travelFees || 0,
      salaryReminder: timesheet.salaryReminder || 0,
      salaryAdvance: timesheet.salaryAdvance || 0,
      kmIndemnity: timesheet.kmIndemnity || 0,
      cityAssignment: timesheet.cityAssignment || '',
      remarks: timesheet.remarks || ''
    }, { emitEvent: false });
  }

  saveMonthlyTimesheet(): void {
    if (!this.monthlyForm.valid) {
      this.snackBar.open('Veuillez remplir tous les champs requis', 'Fermer', { duration: 3000 });
      return;
    }

    const formValue = this.monthlyForm.value;
    const month = formValue.month;
    const year = formValue.year;

    // Vérifier qu'il n'existe pas déjà une feuille pour ce mois/année (sauf en mode édition)
    if (!this.selectedMonthlyTimesheet) {
      const existingTimesheet = this.monthlyTimesheets.find(
        ts => ts.month === month && ts.year === year
      );

      if (existingTimesheet) {
        this.snackBar.open(
          `Une feuille existe déjà pour ${this.getMonthName(month)} ${year}`,
          'Fermer',
          { duration: 5000 }
        );
        return;
      }
    }

    // Valider que l'intervalle de congé correspond au nombre de jours
    const leaveStartDate = this.monthlyForm.get('leaveStartDate')?.value;
    const leaveEndDate = this.monthlyForm.get('leaveEndDate')?.value;
    const paidLeaveDays = this.monthlyForm.get('paidLeaveDays')?.value || 0;

    if (paidLeaveDays > 0 && leaveStartDate && leaveEndDate) {
      const start = new Date(leaveStartDate);
      const end = new Date(leaveEndDate);

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays !== paidLeaveDays) {
        this.snackBar.open(`L'intervalle de congé (${diffDays} jours) ne correspond pas au nombre de jours de congé saisi (${paidLeaveDays} jours)`, 'Fermer', { duration: 5000 });
        return;
      }
    }

    this.saving = true;

    if (this.selectedMonthlyTimesheet) {
      // Mise à jour
      const url = `${environment.apiUrl}/timesheet-months/${this.selectedMonthlyTimesheet.id}`;
      this.http.put<TimesheetMonthResponse>(url, formValue).subscribe({
        next: (response) => {
          this.snackBar.open('Timesheet mensuel mis à jour avec succès', 'Fermer', { duration: 3000 });
          this.loadMonthlyTimesheetsForCandidate(formValue.candidateId);
          this.cancelMonthlyEdit();
          this.saving = false;
        },
        error: (error) => {
          console.error('Erreur mise à jour timesheet mensuel:', error);
          this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 5000 });
          this.saving = false;
        }
      });
    } else {
      // Création
      const url = `${environment.apiUrl}/timesheet-months`;
      this.http.post<TimesheetMonthResponse>(url, formValue).subscribe({
        next: (response) => {
          this.snackBar.open('Timesheet mensuel créé avec succès', 'Fermer', { duration: 3000 });
          this.loadMonthlyTimesheetsForCandidate(formValue.candidateId);
          this.cancelMonthlyEdit();
          this.saving = false;
        },
        error: (error) => {
          console.error('Erreur création timesheet mensuel:', error);
          this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 5000 });
          this.saving = false;
        }
      });
    }
  }

  deleteMonthlyTimesheet(timesheet: TimesheetMonthResponse): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer la feuille de temps de ${this.getMonthName(timesheet.month)} ${timesheet.year} ? Cette action est irréversible.`
      },
      panelClass: 'delete-confirmation-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saving = true;
        const url = `${environment.apiUrl}/timesheet-months/${timesheet.id}`;

        this.http.delete(url).subscribe({
          next: () => {
            this.snackBar.open('Timesheet mensuel supprimé avec succès', 'Fermer', { duration: 3000 });
            this.loadMonthlyTimesheetsForCandidate(timesheet.candidateId);
            this.saving = false;
          },
          error: (error) => {
            console.error('Erreur suppression timesheet mensuel:', error);
            this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 5000 });
            this.saving = false;
          }
        });
      }
    });
  }

  cancelMonthlyEdit(): void {
    this.editingMonthlyTimesheet = false;
    this.selectedMonthlyTimesheet = null;
    this.monthlyForm.reset({
      candidateId: this.selectedContract?.contract.candidate.candidateId,
      entryDate: null,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      daysInMonth: 0,
      daysWorked: 0,
      absenceDays: 0,
      paidLeaveDays: 0,
      weeklyRestDays: [],
      specificRestDates: [],
      leaveStartDate: null,
      leaveEndDate: null,
      travelFees: 0,
      salaryReminder: 0,
      salaryAdvance: 0,
      kmIndemnity: 0,
      cityAssignment: '',
      remarks: ''
    });
  }

  viewMonthlyTimesheetDetails(timesheet: TimesheetMonthResponse): void {
    this.viewingMonthlyTimesheetDetails = timesheet;
  }

  closeMonthlyTimesheetDetails(): void {
    this.viewingMonthlyTimesheetDetails = null;
  }

  getCandidateWorkSummary(): {
    totalTimesheets: number;
    totalDaysWorked: number;
    totalAbsences: number;
    totalPaidLeave: number;
    totalTravelFees: number;
    totalKmIndemnity: number;
  } {
    if (!this.monthlyTimesheets || this.monthlyTimesheets.length === 0) {
      return {
        totalTimesheets: 0,
        totalDaysWorked: 0,
        totalAbsences: 0,
        totalPaidLeave: 0,
        totalTravelFees: 0,
        totalKmIndemnity: 0
      };
    }

    return {
      totalTimesheets: this.monthlyTimesheets.length,
      totalDaysWorked: this.monthlyTimesheets.reduce((sum, ts) => sum + (ts.daysWorked || 0), 0),
      totalAbsences: this.monthlyTimesheets.reduce((sum, ts) => sum + (ts.absenceDays || 0), 0),
      totalPaidLeave: this.monthlyTimesheets.reduce((sum, ts) => sum + (ts.paidLeaveDays || 0), 0),
      totalTravelFees: this.monthlyTimesheets.reduce((sum, ts) => sum + (ts.travelFees || 0), 0),
      totalKmIndemnity: this.monthlyTimesheets.reduce((sum, ts) => sum + (ts.kmIndemnity || 0), 0)
    };
  }

  onMonthYearChange(): void {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;

    if (month && year) {
      // Vérifier si ce mois/année existe déjà (sauf en mode édition)
      if (!this.selectedMonthlyTimesheet) {
        const existingTimesheet = this.monthlyTimesheets.find(
          ts => ts.month === month && ts.year === year
        );

        if (existingTimesheet) {
          this.snackBar.open(
            `Une feuille existe déjà pour ${this.getMonthName(month)} ${year}`,
            'Fermer',
            { duration: 4000 }
          );
          // Réinitialiser le mois
          this.monthlyForm.patchValue({ month: null }, { emitEvent: false });
          return;
        }
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const absenceDays = this.monthlyForm.get('absenceDays')?.value || 0;
      const paidLeaveDays = this.monthlyForm.get('paidLeaveDays')?.value || 0;
      const daysWorked = Math.max(0, daysInMonth - absenceDays - paidLeaveDays);

      let needsReset = false;
      const resetValues: any = { daysInMonth, daysWorked };

      // Vérifier si la date d'entrée actuelle est toujours valide pour le nouveau mois/année
      const currentEntryDate = this.monthlyForm.get('entryDate')?.value;
      if (currentEntryDate) {
        const entryDate = new Date(currentEntryDate);
        const entryMonth = entryDate.getMonth() + 1;
        const entryYear = entryDate.getFullYear();

        // Si la date d'entrée n'est pas dans le mois/année sélectionné, la réinitialiser
        if (entryMonth !== month || entryYear !== year) {
          resetValues.entryDate = null;
          needsReset = true;
        }
      }

      // Vérifier si les dates de congé sont toujours valides
      const leaveStartDate = this.monthlyForm.get('leaveStartDate')?.value;
      const leaveEndDate = this.monthlyForm.get('leaveEndDate')?.value;

      if (leaveStartDate) {
        const startDate = new Date(leaveStartDate);
        if (startDate.getMonth() + 1 !== month || startDate.getFullYear() !== year) {
          resetValues.leaveStartDate = null;
          needsReset = true;
        }
      }

      if (leaveEndDate) {
        const endDate = new Date(leaveEndDate);
        if (endDate.getMonth() + 1 !== month || endDate.getFullYear() !== year) {
          resetValues.leaveEndDate = null;
          needsReset = true;
        }
      }

      if (needsReset) {
        this.monthlyForm.patchValue(resetValues, { emitEvent: false });
        return;
      }

      // Utiliser emitEvent: false pour éviter une boucle infinie
      this.monthlyForm.patchValue({ daysInMonth, daysWorked }, { emitEvent: false });
    }
  }

  getMonthName(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1] || '';
  }

  getDayName(dayNumberOrString: number | string): string {
    // Si c'est un string (comme "MONDAY", "TUESDAY"), convertir en français
    if (typeof dayNumberOrString === 'string') {
      return this.getDayNameFromString(dayNumberOrString);
    }

    // Si c'est un number (0-6), utiliser l'index
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayNumberOrString] || '';
  }

  getDayNameFromString(dayString: string): string {
    const dayMapping: { [key: string]: string } = {
      'SUNDAY': 'Dimanche',
      'MONDAY': 'Lundi',
      'TUESDAY': 'Mardi',
      'WEDNESDAY': 'Mercredi',
      'THURSDAY': 'Jeudi',
      'FRIDAY': 'Vendredi',
      'SATURDAY': 'Samedi'
    };
    return dayMapping[dayString] || dayString;
  }

  getMonthOptions(): Array<{value: number, label: string}> {
    // Si on est en mode édition, retourner toutes les options
    if (this.selectedMonthlyTimesheet) {
      return this.monthOptions;
    }

    // Filtrer les mois déjà utilisés pour l'année sélectionnée
    const selectedYear = this.monthlyForm.get('year')?.value;
    if (!selectedYear || !this.monthlyTimesheets) {
      return this.monthOptions;
    }

    // Trouver les mois déjà utilisés pour cette année
    const usedMonths = this.monthlyTimesheets
      .filter(ts => ts.year === selectedYear)
      .map(ts => ts.month);

    // Retourner seulement les mois non utilisés
    return this.monthOptions.filter(option => !usedMonths.includes(option.value));
  }

  getYearOptions(): number[] {
    // Si on est en mode édition, retourner toutes les options
    if (this.selectedMonthlyTimesheet) {
      return this.yearOptions;
    }

    // Filtrer les années où tous les 12 mois sont déjà utilisés
    if (!this.monthlyTimesheets || this.monthlyTimesheets.length === 0) {
      return this.yearOptions;
    }

    return this.yearOptions.filter(year => {
      // Compter combien de mois sont utilisés pour cette année
      const usedMonthsCount = this.monthlyTimesheets
        .filter(ts => ts.year === year)
        .length;

      // Si tous les 12 mois sont utilisés, ne pas afficher cette année
      return usedMonthsCount < 12;
    });
  }

  getEntryDateMin(): Date | null {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;
    if (month && year) {
      return new Date(year, month - 1, 1);
    }
    return null;
  }

  getEntryDateMax(): Date | null {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;
    if (month && year) {
      const lastDay = new Date(year, month, 0).getDate();
      return new Date(year, month - 1, lastDay);
    }
    return null;
  }

  getLeaveDateMin(): Date | null {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;
    if (month && year) {
      return new Date(year, month - 1, 1);
    }
    return null;
  }

  getLeaveDateMax(): Date | null {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;
    if (month && year) {
      const lastDay = new Date(year, month, 0).getDate();
      return new Date(year, month - 1, lastDay);
    }
    return null;
  }

  toggleRestDay(dayOfWeek: number): void {
    const currentRestDays = this.monthlyForm.get('weeklyRestDays')?.value || [];
    const dayName = this.dayIndexToDayOfWeek(dayOfWeek);
    const index = currentRestDays.indexOf(dayName);

    let newRestDays: string[];
    if (index > -1) {
      // Retirer le jour de repos
      newRestDays = currentRestDays.filter((d: string) => d !== dayName);
    } else {
      // Ajouter le jour de repos
      newRestDays = [...currentRestDays, dayName];
    }

    this.monthlyForm.patchValue({ weeklyRestDays: newRestDays });
  }

  isRestDaySelected(dayOfWeek: number): boolean {
    const restDays = this.monthlyForm.get('weeklyRestDays')?.value || [];
    const dayName = this.dayIndexToDayOfWeek(dayOfWeek);
    return restDays.includes(dayName);
  }

  addSpecificRestDate(event: any): void {
    const selectedDate = event.value;
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentDates = this.monthlyForm.get('specificRestDates')?.value || [];

    // Vérifier si la date n'est pas déjà ajoutée
    if (!currentDates.includes(dateStr)) {
      const newDates = [...currentDates, dateStr].sort();
      this.monthlyForm.patchValue({ specificRestDates: newDates });
    }

    // Réinitialiser le champ de saisie
    event.targetElement.value = '';
  }

  removeSpecificRestDate(dateStr: string): void {
    const currentDates = this.monthlyForm.get('specificRestDates')?.value || [];
    const newDates = currentDates.filter((d: string) => d !== dateStr);
    this.monthlyForm.patchValue({ specificRestDates: newDates });
  }

  getSpecificRestDates(): string[] {
    return this.monthlyForm.get('specificRestDates')?.value || [];
  }

  // Convertir l'index JS (0=Dimanche, 1=Lundi, ...) en nom Java (SUNDAY, MONDAY, ...)
  private dayIndexToDayOfWeek(index: number): string {
    const mapping = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return mapping[index];
  }

  // Compter le nombre total de jours de repos dans le mois
  getRestDaysCount(): number {
    const month = this.monthlyForm.get('month')?.value;
    const year = this.monthlyForm.get('year')?.value;
    const weeklyRestDays = this.monthlyForm.get('weeklyRestDays')?.value || [];
    const specificRestDates = this.monthlyForm.get('specificRestDates')?.value || [];

    if (!month || !year) return 0;

    const daysInMonth = new Date(year, month, 0).getDate();
    const restDatesSet = new Set<string>();

    // Ajouter les jours de repos hebdomadaires récurrents
    if (weeklyRestDays.length > 0) {
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayName = this.dayIndexToDayOfWeek(date.getDay());
        if (weeklyRestDays.includes(dayName)) {
          const dateStr = date.toISOString().split('T')[0];
          restDatesSet.add(dateStr);
        }
      }
    }

    // Ajouter les dates spécifiques (Set évite automatiquement les doublons)
    specificRestDates.forEach((dateStr: string) => {
      const date = new Date(dateStr);
      // Vérifier que la date est bien dans le mois sélectionné
      if (date.getMonth() + 1 === month && date.getFullYear() === year) {
        restDatesSet.add(dateStr);
      }
    });

    return restDatesSet.size;
  }

  // Calculer le nombre de jours de repos pour un timesheet donn\u00e9
  calculateRestDaysForTimesheet(timesheet: TimesheetMonthResponse): number {
    const month = timesheet.month;
    const year = timesheet.year;
    const weeklyRestDays = timesheet.weeklyRestDays || [];
    const specificRestDates = timesheet.specificRestDates || [];

    if (!month || !year) return 0;

    const daysInMonth = new Date(year, month, 0).getDate();
    const restDatesSet = new Set<string>();

    // Ajouter les jours de repos hebdomadaires r\u00e9currents
    if (weeklyRestDays.length > 0) {
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayName = this.dayIndexToDayOfWeek(date.getDay());
        if (weeklyRestDays.includes(dayName)) {
          const dateStr = date.toISOString().split('T')[0];
          restDatesSet.add(dateStr);
        }
      }
    }

    // Ajouter les dates sp\u00e9cifiques
    specificRestDates.forEach((dateStr: string) => {
      restDatesSet.add(dateStr);
    });

    return restDatesSet.size;
  }
}
