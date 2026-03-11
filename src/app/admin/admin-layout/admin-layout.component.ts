import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationSoundService } from '../../core/services/sound.service';
import { NotificationMessage } from '../../core/models/notification.model';
import {
  OfferNotificationComponent,
  NotificationSnackBarData
} from '../../layout/offer-notification/offer-notification.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isExpanded = signal(false);

  private routerSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  private websocketSubscription?: Subscription;

  menuItems = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      route: '/admin/dashboard',
      active: false
    },
    {
      title: 'Demandes de mission',
      icon: 'assignment',
      route: '/admin/demandes',
      active: false
    },
    {
      title: 'Offres',
      icon: 'work_outline',
      route: '/admin/offers',
      active: false
    },
    {
      title: 'Contrats',
      icon: 'description',
      route: '/admin/contracts',
      active: false
    },
    {
      title: 'Inscriptions entreprises',
      icon: 'business_center',
      route: '/admin/account-requests',
      active: false
    },
    {
      title: 'Clients',
      icon: 'business',
      route: '/admin/clients',
      active: false
    },
    {
      title: 'Candidats',
      icon: 'people',
      route: '/admin/candidates',
      active: false
    }
  ];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private notificationSoundService: NotificationSoundService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.updateActiveMenuItem();

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveMenuItem();
      });

    this.notificationSoundService.initialize();
    this.notificationService.loadAdminNotificationsFromBackend();

    const token = this.authService.getAuthToken('admin');

    if (!this.authService.isAuthenticated() || !token) {
      console.warn('[AdminLayout] Admin not authenticated, skipping WebSocket connection');
      return;
    }

    this.initializeAdminWebSocket(token);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.websocketSubscription?.unsubscribe();
    this.notificationSubscription?.unsubscribe();
    this.notificationService.disconnect();
  }

  private initializeAdminWebSocket(token: string): void {
    this.notificationService.initWebSocketConnection(token);
    console.log('[AdminLayout] Initialisation WebSocket admin...');

    this.websocketSubscription = this.notificationService
      .isWebSocketConnected()
      .subscribe((connected) => {
        if (!connected) {
          return;
        }

        console.log('[AdminLayout] WebSocket connecté, souscription aux topics admin');

        this.notificationService.subscribeToAdminAccountRequests();
        this.notificationService.subscribeToAdminOffers();
        this.notificationService.subscribeToAdminDemandes();

        if (!this.notificationSubscription) {
          this.subscribeToAdminNotifications();
        }
      });
  }

  private subscribeToAdminNotifications(): void {
    this.notificationSubscription = this.notificationService
      .getAdminNotifications()
      .subscribe({
        next: (notification: NotificationMessage) => {
          console.log('[AdminLayout] Admin notification received:', notification);
          this.handleAdminNotification(notification);
        },
        error: (error) => {
          console.error('[AdminLayout] Error receiving admin notification:', error);
        }
      });
  }

  private handleAdminNotification(notification: NotificationMessage): void {
    if (notification.type === 'ACCOUNT_REQUEST_CREATED') {
      this.showNotification(
        {
          title: 'Nouvelle inscription entreprise',
          message: notification.message || 'Nouvelle demande d’inscription entreprise',
          actionLabel: 'Voir les inscriptions',
          icon: 'business_center'
        },
        '/admin/account-requests'
      );
      return;
    }

    if (
      notification.type === 'CANDIDATE_ACCEPTED' ||
      notification.type === 'CANDIDATE_REJECTED'
    ) {
      const defaultMessage =
        notification.type === 'CANDIDATE_ACCEPTED'
          ? 'Un candidat a été accepté par le client.'
          : 'Un candidat a été refusé par le client.';

      this.showNotification(
        {
          title: 'Mise à jour sur une offre',
          message: notification.message || defaultMessage,
          actionLabel: 'Voir les offres',
          icon: 'work_outline'
        },
        '/admin/offers'
      );
      return;
    }

    if (
      notification.type === 'DEMANDE_CREATED' ||
      notification.type === 'DEMANDE_UPDATED'
    ) {
      const defaultMessage =
        notification.type === 'DEMANDE_CREATED'
          ? 'Une nouvelle demande a été ajoutée.'
          : 'Une demande a été modifiée.';

      this.showNotification(
        {
          title:
            notification.type === 'DEMANDE_CREATED'
              ? 'Nouvelle demande'
              : 'Demande modifiée',
          message: notification.message || defaultMessage,
          actionLabel: 'Voir les demandes',
          icon: 'assignment'
        },
        '/admin/demandes'
      );
    }
  }

  private showNotification(
    data: NotificationSnackBarData,
    route: string
  ): void {
    const snackBarRef = this.snackBar.openFromComponent(OfferNotificationComponent, {
      data,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['professional-notification']
    });

    snackBarRef.onAction().subscribe(() => {
      this.router.navigate([route]);
    });
  }

  updateActiveMenuItem(): void {
    const currentRoute = this.router.url;

    this.menuItems.forEach(item => {
      item.active =
        currentRoute === item.route || currentRoute.startsWith(item.route + '/');
    });
  }

  onMouseEnter(): void {
    this.isExpanded.set(true);
  }

  onMouseLeave(): void {
    this.isExpanded.set(false);
  }

  logout(): void {
    this.notificationService.disconnect();
    this.authService.logout('/admin/login');
  }
}
