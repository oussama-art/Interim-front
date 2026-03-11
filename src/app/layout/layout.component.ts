import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { SidebarComponent } from '../pages/sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { ClientService } from '../core/services/client.service';
import { NotificationService } from '../core/services/notification.service';
import { AuthService } from '../core/services/auth.service';
import { OfferNotificationComponent } from './offer-notification/offer-notification.component';
import { NotificationMessage } from '../core/models/notification.model';
import { NotificationSoundService } from '../core/services/sound.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    ScrollingModule,
    MatSnackBarModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  private notificationSubscription?: Subscription;
  private websocketSubscription?: Subscription;
  private clientId: number | null = null;

  constructor(
    private clientService: ClientService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private notificationSoundService: NotificationSoundService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationSoundService.initialize();
    this.notificationService.loadUserNotificationsFromBackend();

    if (!this.authService.isCandidate()) {
      this.loadClientAndInitialize();
    }
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
    this.websocketSubscription?.unsubscribe();
    this.notificationService.disconnect();
  }

  private loadClientAndInitialize(): void {
    this.clientService.getMe().subscribe({
      next: (client) => {
        this.clientId = client.id;
        console.log('[LAYOUT] Client loaded:', client.emailAddress);

        if (!this.authService.isAuthenticated()) {
          console.warn('[LAYOUT] User not authenticated, skipping WebSocket connection');
          return;
        }

        const currentContext = localStorage.getItem('app_current_context') || 'user';
        const contextPrefix = currentContext === 'admin' ? 'admin_' : 'user_';
        const token = localStorage.getItem(`${contextPrefix}access_token`);

        if (!token) {
          console.error('[LAYOUT] Token introuvable pour initialiser WebSocket');
          return;
        }

        this.notificationService.initWebSocketConnection(token);

        this.websocketSubscription = this.notificationService
          .isWebSocketConnected()
          .subscribe((connected) => {
            if (connected) {
              this.notificationService.subscribeToUserNotifications();
            }
          });

        this.subscribeToWebSocketNotifications();
      },
      error: (error) => {
        console.error('[LAYOUT] Erreur chargement profil client:', error);
      }
    });
  }

  private subscribeToWebSocketNotifications(): void {
    this.notificationSubscription = this.notificationService.getUserNotifications().subscribe({
      next: (notification: NotificationMessage) => {
        console.log('🔔 [LAYOUT] User WebSocket notification received:', notification);
        this.handleWebSocketNotification(notification);
      },
      error: (error) => {
        console.error('❌ [LAYOUT] Error receiving WebSocket notification:', error);
      }
    });
  }

  private handleWebSocketNotification(notification: NotificationMessage): void {
    if (notification.type === 'OFFER_CREATED') {
      this.showNewOfferNotification(1);
      return;
    }

    if (notification.type === 'CANDIDATES_ADDED') {
      this.showNewCandidatesNotification(1);
    }
  }

  private showNewOfferNotification(count: number): void {
    const message =
      count === 1
        ? 'Nouvelle offre disponible'
        : `${count} nouvelles offres disponibles`;

    const snackBarRef = this.snackBar.openFromComponent(OfferNotificationComponent, {
      data: { message },
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['professional-notification']
    });

    snackBarRef.onAction().subscribe(() => {
      this.router.navigate(['/app/offers']);
    });
  }

  private showNewCandidatesNotification(count: number): void {
    const message =
      count === 1
        ? 'Nouveau candidat ajouté à une offre'
        : `Nouveaux candidats ajoutés à ${count} offre(s)`;

    const snackBarRef = this.snackBar.openFromComponent(OfferNotificationComponent, {
      data: { message },
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['professional-notification']
    });

    snackBarRef.onAction().subscribe(() => {
      this.router.navigate(['/app/offers']);
    });
  }
}
