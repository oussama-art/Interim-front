import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SidebarComponent } from '../pages/sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { OfferService } from '../core/services/offer.service';
import { ClientService } from '../core/services/client.service';
import { NotificationService } from '../core/services/notification.service';
import { AuthService } from '../core/services/auth.service';
import { OfferResponse } from '../core/models/offer.model';
import { OfferNotificationComponent } from './offer-notification/offer-notification.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ScrollingModule, MatSnackBarModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly LAYOUT_CANDIDATE_SNAPSHOTS_KEY = 'layout_candidate_snapshots_';
  private pollingSubscription?: Subscription;
  private audioContext?: AudioContext;
  private previousOfferIds = new Set<number>();
  private candidateSnapshots = new Map<number, Map<number, string>>(); // offerId -> Map(candidateId -> status)
  private clientId: number | null = null;

  constructor(
    private offerService: OfferService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Ne démarrer le polling que pour les clients (pas pour les candidats)
    if (!this.authService.isCandidate()) {
      this.initializeNotificationAudio();
      this.loadClientAndStartPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  initializeNotificationAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      };

      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
    } catch (error) {
      console.error('❌ [LAYOUT] Erreur lors de l\'initialisation de l\'audio:', error);
    }
  }

  loadClientAndStartPolling(): void {
    this.clientService.getMe().subscribe({
      next: (client) => {
        this.clientId = client.id;
        this.loadInitialOffers();
      },
      error: (error) => {
        console.error('[LAYOUT] Erreur chargement profil client:', error);
      }
    });
  }

  /**
   * Récupère les snapshots de candidats depuis localStorage
   */
  private loadCandidateSnapshotsFromStorage(): Map<number, Map<number, string>> {
    if (!this.clientId) return new Map();
    const key = this.LAYOUT_CANDIDATE_SNAPSHOTS_KEY + this.clientId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        const result = new Map<number, Map<number, string>>();
        Object.entries(obj).forEach(([offerId, candidateMap]) => {
          const innerMap = new Map<number, string>();
          Object.entries(candidateMap as {[key: string]: string}).forEach(([candidateId, status]) => {
            innerMap.set(parseInt(candidateId), status);
          });
          result.set(parseInt(offerId), innerMap);
        });
        return result;
      } catch (e) {
        console.error('Erreur parsing localStorage snapshots candidats:', e);
        return new Map();
      }
    }
    return new Map();
  }

  /**
   * Sauvegarde les snapshots de candidats dans localStorage
   */
  private saveCandidateSnapshotsToStorage(snapshots: Map<number, Map<number, string>>): void {
    if (!this.clientId) return;
    const key = this.LAYOUT_CANDIDATE_SNAPSHOTS_KEY + this.clientId;
    const obj: {[key: number]: {[key: number]: string}} = {};
    snapshots.forEach((candidateMap, offerId) => {
      const innerObj: {[key: number]: string} = {};
      candidateMap.forEach((status, candidateId) => {
        innerObj[candidateId] = status;
      });
      obj[offerId] = innerObj;
    });
    localStorage.setItem(key, JSON.stringify(obj));
  }

  loadInitialOffers(): void {
    if (!this.clientId) return;

    // Charger les snapshots depuis localStorage
    this.candidateSnapshots = this.loadCandidateSnapshotsFromStorage();

    this.offerService.getOffersByClientId(this.clientId).subscribe({
      next: (offers) => {
        // Initialiser les IDs des offres existantes et créer les snapshots
        offers.forEach(offer => {
          this.previousOfferIds.add(offer.offerId);
          // Si pas de snapshot existant, créer un nouveau snapshot avec l'état actuel
          if (!this.candidateSnapshots.has(offer.offerId)) {
            const candidateMap = new Map<number, string>();
            offer.proposedCandidates.forEach(candidate => {
              candidateMap.set(candidate.candidateId, candidate.status);
            });
            this.candidateSnapshots.set(offer.offerId, candidateMap);
          }
        });
        // Sauvegarder les snapshots mis à jour
        this.saveCandidateSnapshotsToStorage(this.candidateSnapshots);
        // Démarrer le polling
        this.startPolling();
      },
      error: (error) => {
        console.error('[LAYOUT] Erreur chargement offres initiales:', error);
      }
    });
  }

  startPolling(): void {
    this.pollingSubscription = interval(10000)
      .pipe(
        switchMap(() => {
          if (this.clientId) {
            return this.offerService.getOffersByClientId(this.clientId);
          }
          return [];
        })
      )
      .subscribe({
        next: (newOffers: OfferResponse[]) => {
          this.checkForNewOffers(newOffers);
        },
        error: (error) => {
          console.error('[LAYOUT] Erreur lors de la vérification des nouvelles offres:', error);
        }
      });
  }

  checkForNewOffers(newOffers: OfferResponse[]): void {
    const newOffersList: OfferResponse[] = [];
    const updatedOffersList: OfferResponse[] = [];

    newOffers.forEach(offer => {
      const isNew = !this.previousOfferIds.has(offer.offerId);
      const previousSnapshot = this.candidateSnapshots.get(offer.offerId) || new Map<number, string>();

      // Créer le snapshot actuel de cette offre
      const currentSnapshot = new Map<number, string>();
      offer.proposedCandidates.forEach(candidate => {
        currentSnapshot.set(candidate.candidateId, candidate.status);
      });

      // Détecter uniquement les candidats qui DEVIENNENT "PROPOSED" (nouveaux ou re-proposés)
      const changedCandidates: Array<{id: number, oldStatus?: string, newStatus: string}> = [];

      currentSnapshot.forEach((newStatus, candidateId) => {
        const oldStatus = previousSnapshot.get(candidateId);

        // Détecter uniquement si le candidat est maintenant PROPOSED ET :
        // - Soit c'est un nouveau candidat (pas d'ancien statut)
        // - Soit son statut a changé vers PROPOSED (ex: REJECTED -> PROPOSED)
        if (newStatus === 'PROPOSED' && (!oldStatus || oldStatus !== 'PROPOSED')) {
          changedCandidates.push({
            id: candidateId,
            oldStatus: oldStatus,
            newStatus: newStatus
          });
        }
      });

      const hasChanges = changedCandidates.length > 0;

      if (isNew) {
        newOffersList.push(offer);
        this.previousOfferIds.add(offer.offerId);
        this.candidateSnapshots.set(offer.offerId, currentSnapshot);
      } else if (hasChanges) {
        offer.hasNewCandidates = true;
        updatedOffersList.push(offer);
        // Mettre à jour le snapshot avec l'état actuel
        this.candidateSnapshots.set(offer.offerId, currentSnapshot);
      } else {
        // Même sans changement, mettre à jour le snapshot (pour gérer les suppressions)
        this.candidateSnapshots.set(offer.offerId, currentSnapshot);
      }
    });

    if (newOffersList.length > 0) {
      // Marquer les nouvelles offres avec un timestamp
      const timestamp = Date.now();
      newOffersList.forEach(offer => {
        offer.isNew = true;
        offer.newOfferTimestamp = timestamp;
      });

      this.playNotificationSound();
      this.showNewOfferNotification(newOffersList.length);
      this.notificationService.incrementNewOffers(newOffersList.length);
    }

    if (updatedOffersList.length > 0) {
      this.playNotificationSound();
      this.showNewCandidatesNotification(updatedOffersList.length);
      this.notificationService.incrementNewOffers(updatedOffersList.length);
    }

    // Sauvegarder les snapshots mis à jour dans localStorage
    this.saveCandidateSnapshotsToStorage(this.candidateSnapshots);
  }

  playNotificationSound(): void {
    try {
      if (!this.audioContext) {
        console.error('❌ [LAYOUT] AudioContext non initialisé');
        return;
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.createAndPlayBeep();
        });
      } else {
        this.createAndPlayBeep();
      }
    } catch (error) {
      console.error('❌ [LAYOUT] Erreur lors de la lecture du son:', error);
    }
  }

  private createAndPlayBeep(): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);

      console.log('✅ [LAYOUT] Son joué à', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ [LAYOUT] Erreur lors de la création du son:', error);
    }
  }

  showNewOfferNotification(count: number): void {
    const message = count === 1
      ? 'Nouvelle offre disponible'
      : `${count} nouvelles offres disponibles`;

    const snackBarRef = this.snackBar.openFromComponent(OfferNotificationComponent, {
      data: { message },
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['professional-notification']
    });

    snackBarRef.onAction().subscribe(() => {
      // Naviguer vers la page des offres
      window.location.href = '/app/offers';
    });
  }

  showNewCandidatesNotification(count: number): void {
    const message = count === 1
      ? 'Nouveau candidat ajouté à une offre'
      : `Nouveaux candidats ajoutés à ${count} offre(s)`;

    const snackBarRef = this.snackBar.openFromComponent(OfferNotificationComponent, {
      data: { message },
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['professional-notification']
    });

    snackBarRef.onAction().subscribe(() => {
      // Naviguer vers la page des offres
      window.location.href = '/app/offers';
    });
  }
}
