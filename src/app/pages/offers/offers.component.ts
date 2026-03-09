import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { OfferService } from '../../core/services/offer.service';
import { OfferResponse, OfferProfilGroup } from '../../core/models/offer.model';
import { ClientService } from '../../core/services/client.service';
import { DemandeService } from '../../core/services/demande.service';
import { DemandeResponse } from '../../core/models/demande.model';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { AcceptOfferDialogComponent } from './accept-offer-dialog/accept-offer-dialog.component';
import { ProfilCandidatesDialogComponent } from './profil-candidates-dialog/profil-candidates-dialog.component';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateResponse } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';
import { GlobalSearchService } from '../../core/services/global-search.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule
  ],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: '0', overflow: 'hidden', margin: '0' })),
      state('expanded', style({ height: '*', opacity: '1', margin: '1rem 0' })),
      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class OffersComponent implements OnInit, OnDestroy {
  private readonly SEEN_OFFERS_KEY = 'seen_offers_';
  private readonly OFFER_CANDIDATES_KEY = 'offer_candidates_';
  private readonly NOTIFIED_OFFERS_KEY = 'notified_offers_';
  private destroy$ = new Subject<void>();

  offers: OfferResponse[] = [];
  filteredOffers: OfferResponse[] = [];
  loading = false;
  clientId: number | null = null;
  candidatesDetails: Map<number, CandidateResponse> = new Map();
  demandesDetails: Map<number, DemandeResponse> = new Map();
  expandedOffers = new Set<number>();
  expandedCandidates: Set<number> = new Set();
  offerProfilGroups: Map<number, OfferProfilGroup[]> = new Map();
  searchQuery: string = '';

  constructor(
    private offerService: OfferService,
    private clientService: ClientService,
    private candidateService: CandidateService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private demandeService: DemandeService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private globalSearchService: GlobalSearchService
  ) {}

  ngOnInit(): void {
    this.loadClientAndOffers();
    // Réinitialiser le compteur de nouvelles offres quand l'utilisateur visite la page
    this.notificationService.resetNewOffers();

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
      this.filteredOffers = [...this.offers];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredOffers = this.offers.filter(offer => {
      const offerId = offer.offerId?.toString() || '';
      const demandeRef = offer.demandeReference?.toLowerCase() || '';
      const demandeId = offer.demandeId?.toString() || '';

      return offerId.includes(query) ||
             demandeRef.includes(query) ||
             demandeId.includes(query);
    });
  }

  /**
   * Récupère les IDs des offres déjà vues depuis le localStorage
   */
  private getSeenOfferIds(): Set<number> {
    if (!this.clientId) return new Set();
    const key = this.SEEN_OFFERS_KEY + this.clientId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
        return new Set();
      }
    }
    return new Set();
  }

  /**
   * Récupère le nombre de candidats par offre depuis le localStorage
   */
  private getOfferCandidateCounts(): Map<number, number> {
    if (!this.clientId) return new Map();
    const key = this.OFFER_CANDIDATES_KEY + this.clientId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        return new Map(Object.entries(obj).map(([k, v]) => [parseInt(k), v as number]));
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
        return new Map();
      }
    }
    return new Map();
  }

  /**
   * Sauvegarde le nombre de candidats par offre dans le localStorage
   */
  private saveOfferCandidateCounts(counts: Map<number, number>): void {
    if (!this.clientId) return;
    const key = this.OFFER_CANDIDATES_KEY + this.clientId;
    const obj = Object.fromEntries(counts);
    localStorage.setItem(key, JSON.stringify(obj));
  }

  /**
   * Récupère les IDs des offres pour lesquelles le son a déjà été joué
   */
  private getNotifiedOfferIds(): Set<number> {
    if (!this.clientId) return new Set();
    const key = this.NOTIFIED_OFFERS_KEY + this.clientId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
        return new Set();
      }
    }
    return new Set();
  }

  /**
   * Sauvegarde les IDs des offres pour lesquelles le son a été joué
   */
  private saveNotifiedOfferIds(offerIds: Set<number>): void {
    if (!this.clientId) return;
    const key = this.NOTIFIED_OFFERS_KEY + this.clientId;
    localStorage.setItem(key, JSON.stringify(Array.from(offerIds)));
  }

  /**
   * Sauvegarde les IDs des offres vues dans le localStorage
   */
  private saveSeenOfferIds(offerIds: Set<number>): void {
    if (!this.clientId) return;
    const key = this.SEEN_OFFERS_KEY + this.clientId;
    localStorage.setItem(key, JSON.stringify(Array.from(offerIds)));
  }

  /**
   * Marque les nouvelles offres et détecte les nouveaux candidats
   */
  private markNewOffers(offers: OfferResponse[]): void {
    const seenOfferIds = this.getSeenOfferIds();
    const notifiedOfferIds = this.getNotifiedOfferIds();
    const previousCandidateCounts = this.getOfferCandidateCounts();
    const newOffersToNotify: number[] = [];

    offers.forEach(offer => {
      const currentCandidateCount = offer.proposedCandidates.length;
      const previousCount = previousCandidateCounts.get(offer.offerId) || 0;

      // Nouvelle offre
      if (!seenOfferIds.has(offer.offerId)) {
        offer.isNew = true;
        offer.hasNewCandidates = false;
        // Jouer le son seulement si on n'a jamais notifié cette offre
        if (!notifiedOfferIds.has(offer.offerId)) {
          newOffersToNotify.push(offer.offerId);
        }
      }
      // Offre existante avec nouveaux candidats
      else if (currentCandidateCount > previousCount) {
        offer.isNew = true;
        offer.hasNewCandidates = true;
        const newCandidatesCount = currentCandidateCount - previousCount;
      }
      else {
        offer.isNew = false;
        offer.hasNewCandidates = false;
      }
    });

    // Marquer les nouvelles offres comme notifiées (sans son)
    if (newOffersToNotify.length > 0) {
      newOffersToNotify.forEach(offerId => notifiedOfferIds.add(offerId));
      this.saveNotifiedOfferIds(notifiedOfferIds);
    }
  }

  /**
   * Marque une offre comme vue et met à jour le localStorage
   */
  private markOfferAsSeen(offerId: number): void {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (offer) {
      // Retirer le flag isNew
      offer.isNew = false;
      offer.hasNewCandidates = false;

      // Ajouter l'ID aux offres vues et sauvegarder
      const seenOfferIds = this.getSeenOfferIds();
      seenOfferIds.add(offerId);
      this.saveSeenOfferIds(seenOfferIds);

      // Mettre à jour le compteur de candidats
      const candidateCounts = this.getOfferCandidateCounts();
      candidateCounts.set(offerId, offer.proposedCandidates.length);
      this.saveOfferCandidateCounts(candidateCounts);

      // Marquer tous les candidats de cette offre comme vus dans le layout storage
      this.markCandidatesAsSeenInLayoutStorage(offerId, offer.proposedCandidates.map(c => c.candidateId));
    }
  }

  /**
   * Marque les candidats comme vus dans le localStorage du layout
   */
  private markCandidatesAsSeenInLayoutStorage(offerId: number, candidateIds: number[]): void {
    if (!this.clientId) return;

    const LAYOUT_SEEN_CANDIDATES_KEY = 'layout_seen_candidates_';
    const key = LAYOUT_SEEN_CANDIDATES_KEY + this.clientId;
    const stored = localStorage.getItem(key);

    let seenCandidates: {[key: number]: number[]} = {};
    if (stored) {
      try {
        seenCandidates = JSON.parse(stored);
      } catch (e) {
        console.error('Erreur parsing localStorage candidats vus:', e);
      }
    }

    // Fusionner les candidats existants avec les nouveaux
    const existingIds = seenCandidates[offerId] || [];
    const mergedIds = new Set([...existingIds, ...candidateIds]);
    seenCandidates[offerId] = Array.from(mergedIds);

    localStorage.setItem(key, JSON.stringify(seenCandidates));
  }

  loadClientAndOffers(): void {
    this.loading = true;
    this.clientService.getMe().subscribe({
      next: (client) => {
        this.clientId = client.id;
        this.loadOffers();
      },
      error: () => {
        this.showError('Erreur chargement profil');
        this.loading = false;
      }
    });
  }

  loadOffers(): void {
    if (!this.clientId) return;
    this.offerService.getOffersByClientId(this.clientId).subscribe({
      next: (data) => {
        // Marquer les nouvelles offres en comparant avec localStorage
        this.markNewOffers(data);
        this.offers = data;
        this.loadDemandeReferences();
      },
      error: () => {
        this.showError('Erreur chargement offres');
        this.loading = false;
      }
    });
  }

  loadDemandeReferences(): void {
    const demandeIds = new Set<number>();
    this.offers.forEach(offer => demandeIds.add(offer.demandeId));

    if (demandeIds.size === 0) {
      this.loadCandidatesDetails();
      return;
    }

    const requests = Array.from(demandeIds).map(id => this.demandeService.getMyDemandeDetail(id));
    forkJoin(requests).subscribe({
      next: (demandes) => {
        demandes.forEach((demande) => {
          // Stocker les détails de la demande
          this.demandesDetails.set(demande.id!, demande);

          const offer = this.offers.find(o => o.demandeId === demande.id);
          if (offer) {
            offer.demandeReference = demande.reference;
          }
        });
        this.loadCandidatesDetails();
      },
      error: () => {
        this.showError('Erreur chargement références demandes');
        this.loadCandidatesDetails();
      }
    });
  }

  loadCandidatesDetails(): void {
    const candidateIds = new Set<number>();
    this.offers.forEach(offer => {
      offer.proposedCandidates.forEach(c => candidateIds.add(c.candidateId));
    });

    if (candidateIds.size === 0) {
      this.filteredOffers = [...this.offers];
      this.loading = false;
      return;
    }

    const requests = Array.from(candidateIds).map(id => this.candidateService.getCandidateById(id));
    forkJoin(requests).subscribe({
      next: (candidates) => {
        candidates.forEach(c => this.candidatesDetails.set(c.id, c));
        this.organizeAllOffersByProfil();
        this.filteredOffers = [...this.offers];
        this.loading = false;
      },
      error: () => {
        this.showError('Erreur détails candidats');
        this.filteredOffers = [...this.offers];
        this.loading = false;
      }
    });
  }

  organizeAllOffersByProfil(): void {
    this.offers.forEach(offer => {
      const demande = this.demandesDetails.get(offer.demandeId);
      if (demande) {
        this.offerProfilGroups.set(offer.offerId, this.organizeOfferByProfil(offer, demande));
      }
    });
  }

  organizeOfferByProfil(offer: OfferResponse, demande: DemandeResponse): OfferProfilGroup[] {
    const profilMap = new Map<number, OfferProfilGroup>();
    const isDemandeClosed = demande.status === 'CLOSED' || demande.status === 'REJECTED';

    // Initialiser tous les profils de la demande
    demande.profils.forEach(profil => {
      profilMap.set(profil.id, {
        profilId: profil.id,
        profilName: profil.profilName,
        quantityRequested: profil.quantity,
        candidates: [],
        acceptedCount: 0
      });
    });

    // Ajouter les candidats à leurs profils respectifs
    offer.proposedCandidates.forEach(candidate => {
      const profilId = candidate.demandeProfilId;
      if (profilId && profilMap.has(profilId)) {
        // Si la demande est clôturée, afficher seulement les candidats acceptés ou refusés
        if (isDemandeClosed) {
          if (candidate.status === 'ACCEPTED' || candidate.status === 'REJECTED') {
            const group = profilMap.get(profilId)!;
            group.candidates.push(candidate);
            if (candidate.status === 'ACCEPTED') {
              group.acceptedCount++;
            }
          }
        } else {
          // Si la demande est ouverte, afficher tous les candidats
          const group = profilMap.get(profilId)!;
          group.candidates.push(candidate);
          if (candidate.status === 'ACCEPTED') {
            group.acceptedCount++;
          }
        }
      }
    });

    // Si la demande est clôturée, ne retourner que les profils qui ont des candidats
    const allProfils = Array.from(profilMap.values());
    if (isDemandeClosed) {
      return allProfils.filter(profil => profil.candidates.length > 0);
    }
    return allProfils;
  }

  getProfilGroups(offerId: number): OfferProfilGroup[] {
    return this.offerProfilGroups.get(offerId) || [];
  }

  openProfilDetailDialog(profilGroup: OfferProfilGroup, offerId: number): void {
    const offer = this.offers.find(o => o.offerId === offerId);
    const demande = offer ? this.demandesDetails.get(offer.demandeId) : null;

    const dialogRef = this.dialog.open(ProfilCandidatesDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        profilGroup: profilGroup,
        offerId: offerId,
        clientId: this.clientId,
        candidatesDetails: this.candidatesDetails,
        startDate: demande?.startDate,
        endDate: demande?.endDate,
        demandeStatus: demande?.status
      },
      panelClass: 'profil-candidates-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recharger les offres pour mettre à jour l'UI
        this.loadOffers();
      }
    });
  }

  toggleCandidates(offerId: number): void {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return;

    // Marquer l'offre comme vue
    this.markOfferAsSeen(offerId);

    // Si plus de 3 profils, ouvrir un dialog au lieu du dropdown
    const profilGroups = this.getProfilGroups(offerId);
    if (profilGroups.length > 3) {
      this.openAllProfilsDialog(offerId);
    } else {
      // Toggle normal pour 3 profils ou moins
      this.expandedOffers.has(offerId) ? this.expandedOffers.delete(offerId) : this.expandedOffers.add(offerId);
    }
  }

  /**
   * Ouvre un dialog affichant tous les profils quand il y a plus de 3 profils
   */
  openAllProfilsDialog(offerId: number): void {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return;

    const demande = this.demandesDetails.get(offer.demandeId);
    const profilGroups = this.getProfilGroups(offerId);

    const dialogRef = this.dialog.open(ProfilCandidatesDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        allProfils: profilGroups,
        offerId: offerId,
        clientId: this.clientId,
        candidatesDetails: this.candidatesDetails,
        startDate: demande?.startDate,
        endDate: demande?.endDate,
        demandeStatus: demande?.status,
        showAllProfils: true
      },
      panelClass: 'profil-candidates-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOffers();
      }
    });
  }

  toggleCandidateDetails(candidateId: number): void {
    this.expandedCandidates.has(candidateId) ? this.expandedCandidates.delete(candidateId) : this.expandedCandidates.add(candidateId);
  }

  isCandidatesExpanded(offerId: number): boolean {
    return this.expandedOffers.has(offerId);
  }

  getCandidateDetail(candidateId: number) {
    return this.candidatesDetails.get(candidateId);
  }

  viewCv(candidateId: number): void {
    const url = `${environment.apiUrl}/candidates/${candidateId}/cv`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: () => {
        this.showError('Erreur lors du chargement du CV');
      }
    });
  }

  acceptCandidate(offerId: number, candidateId: number): void {
    if (!this.clientId) return;

    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return;

    const demande = this.demandesDetails.get(offer.demandeId);
    if (!demande) {
      this.showError('Détails de la demande non disponibles');
      return;
    }

    const candidate = offer.proposedCandidates.find(c => c.candidateId === candidateId);
    if (!candidate) return;

    // Vérifier le nombre d'employés déjà acceptés
    const acceptedCount = offer.proposedCandidates.filter(c => c.status === 'ACCEPTED').length;

    if (acceptedCount >= demande.totalEmployeesNeeded) {
      this.snackBar.open(
        `Nombre maximum d'employés atteint (${demande.totalEmployeesNeeded}). Vous ne pouvez pas accepter plus de candidats.`,
        'Fermer',
        { duration: 5000 }
      );
      return;
    }

    // Utiliser directement les dates de la demande
    const acceptRequest = {
      candidateId: candidateId,
      startDate: demande.startDate,
      endDate: demande.endDate
    };

    this.offerService.acceptOffer(this.clientId, offerId, acceptRequest).subscribe({
      next: () => {
        this.snackBar.open('Candidat retenu avec succès', 'Fermer', { duration: 3000 });

        // Vérifier si on a atteint le nombre requis
        const newAcceptedCount = acceptedCount + 1;
        if (newAcceptedCount >= demande.totalEmployeesNeeded) {
          this.snackBar.open(
            `Nombre requis d'employés atteint (${demande.totalEmployeesNeeded}/${demande.totalEmployeesNeeded})`,
            'Fermer',
            { duration: 5000 }
          );
        }

        this.loadOffers();
      },
      error: (error) => {
        console.error('Erreur lors de l\'acceptation:', error);
        this.showError('Erreur lors de l\'acceptation du candidat');
      }
    });
  }

  rejectCandidate(offerId: number, candidateId: number): void {
    if (!this.clientId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Décliner ce candidat',
        message: 'Êtes-vous sûr de vouloir décliner ce candidat ? Cette action ne pourra pas être annulée.',
        confirmText: 'Décliner',
        cancelText: 'Annuler',
        type: 'reject'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.clientId) {
        this.offerService.rejectCandidate(this.clientId, offerId, candidateId).subscribe({
          next: () => {
            this.snackBar.open('Candidat décliné', 'Fermer', { duration: 3000 });
            this.loadOffers();
          },
          error: () => this.showError('Erreur lors du rejet du candidat')
        });
      }
    });
  }

  private updateStatus(offerId: number, candidateId: number, status: string, message: string) {
    this.offerService.updateCandidateStatus(offerId, candidateId, status).subscribe({
      next: () => {
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
        this.loadOffers();
      },
      error: () => this.showError('Erreur lors de la mise à jour')
    });
  }

  private showError(msg: string) {
    this.snackBar.open(msg, 'Fermer', { duration: 3000 });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getAcceptedCount(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    return offer.proposedCandidates.filter(c => c.status === 'ACCEPTED').length;
  }

  getTotalNeeded(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    const demande = this.demandesDetails.get(offer.demandeId);
    return demande?.totalEmployeesNeeded || 0;
  }

  isMaxReached(offerId: number): boolean {
    return this.getAcceptedCount(offerId) >= this.getTotalNeeded(offerId);
  }

  hasRejectedCandidates(offerId: number): boolean {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return false;
    return offer.proposedCandidates.some(c => c.status === 'REJECTED');
  }

  getRejectedCount(offerId: number): number {
    const offer = this.offers.find(o => o.offerId === offerId);
    if (!offer) return 0;
    return offer.proposedCandidates.filter(c => c.status === 'REJECTED').length;
  }

  requestNewCandidates(offerId: number, demandeId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Demander de nouveaux candidats',
        message: 'Voulez-vous créer une nouvelle offre avec d\'autres candidats pour cette demande ? Cela permettra à l\'agence de vous proposer de nouveaux profils.',
        confirmText: 'Confirmer',
        cancelText: 'Annuler',
        type: 'info'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.clientId) {
        // Appeler le service pour créer une nouvelle offre basée sur la même demande
        this.offerService.createOfferForDemande(this.clientId, demandeId).subscribe({
          next: () => {
            this.snackBar.open(
              'Nouvelle demande de candidats envoyée avec succès. Vous recevrez bientôt de nouvelles propositions.',
              'Fermer',
              { duration: 5000 }
            );
            this.loadOffers();
          },
          error: (error) => {
            console.error('Erreur lors de la création de la nouvelle offre:', error);
            this.showError('Erreur lors de l\'envoi de la demande');
          }
        });
      }
    });
  }

  getDemandeStatus(demandeId: number): string {
    const demande = this.demandesDetails.get(demandeId);
    return demande?.status || 'UNKNOWN';
  }
}
