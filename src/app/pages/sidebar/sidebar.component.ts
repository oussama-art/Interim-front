import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppNotification,
  NotificationContext
} from '../../core/services/notification-store.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  isExpanded = signal(false);
  isOffersRoute = signal(false);

  readonly context: NotificationContext = 'user';

  offerNotificationsCount$: Observable<number>;

  private allNavItems: NavItem[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/app/demandes', icon: 'assignment', label: 'Demandes' },
    { path: '/app/offers', icon: 'local_offer', label: 'Offers' },
    { path: '/app/contracts', icon: 'description', label: 'Contracts' },
    { path: '/app/timesheets', icon: 'schedule', label: 'Timesheets' },
    { path: '/app/interim', icon: 'work', label: 'Interim' },
    { path: '/app/invoices', icon: 'receipt_long', label: 'Invoices' }
  ];

  profilItem: NavItem = {
    path: '/app/profil',
    icon: 'person',
    label: 'Profil'
  };

  navItems = computed(() => {
    const isCandidate = this.authService.isCandidate();

    return this.allNavItems.filter(item => {
      if (item.path === '/app/demandes' && isCandidate) {
        return false;
      }

      return true;
    });
  });

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.offerNotificationsCount$ = this.notificationService
      .getStoredNotifications(this.context)
      .pipe(
        map((notifications: AppNotification[]) =>
          notifications.filter(notification =>
            !notification.read &&
            (
              notification.type === 'OFFER_CREATED' ||
              notification.type === 'CANDIDATES_ADDED'
            )
          ).length
        )
      );

    this.updateOffersRouteState();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateOffersRouteState();
      });
  }

  onMouseEnter(): void {
    this.isExpanded.set(true);
  }

  onMouseLeave(): void {
    this.isExpanded.set(false);
  }

  onNavClick(item: NavItem): void {
    if (item.path === '/app/offers') {
      this.markOfferNotificationsAsRead();
    }
  }

  private updateOffersRouteState(): void {
    this.isOffersRoute.set(
      this.router.url === '/app/offers' || this.router.url.startsWith('/app/offers/')
    );
  }

  private markOfferNotificationsAsRead(): void {
    this.notificationService
      .getStoredNotifications(this.context)
      .pipe(
        take(1),
        map((notifications: AppNotification[]) =>
          notifications.filter(notification =>
            !notification.read &&
            (
              notification.type === 'OFFER_CREATED' ||
              notification.type === 'CANDIDATES_ADDED'
            )
          )
        )
      )
      .subscribe(notifications => {
        notifications.forEach(notification => {
          this.notificationService.markAsRead(this.context, notification.id);
        });
      });
  }
}
