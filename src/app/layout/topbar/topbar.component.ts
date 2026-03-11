import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppNotification,
  NotificationContext
} from '../../core/services/notification-store.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  userName = 'John Doe';
  searchQuery = '';
  searchPlaceholder = 'Rechercher...';

  readonly context: NotificationContext = 'user';

  private destroy$ = new Subject<void>();

  offerNotifications$: Observable<AppNotification[]>;
  unreadOfferNotificationsCount$: Observable<number>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private globalSearchService: GlobalSearchService,
    private notificationService: NotificationService
  ) {
    this.offerNotifications$ = this.notificationService
      .getStoredNotifications(this.context)
      .pipe(
        map((notifications: AppNotification[]) =>
          notifications
            .filter(notification =>
              notification.type === 'OFFER_CREATED' ||
              notification.type === 'CANDIDATES_ADDED'
            )
            .sort((a, b) => {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
        )
      );

    this.unreadOfferNotificationsCount$ = this.notificationService
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
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateSearchPlaceholder();
        this.clearSearch();
      });

    this.updateSearchPlaceholder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateSearchPlaceholder(): void {
    const url = this.router.url;

    if (url.includes('/app/demandes')) {
      this.searchPlaceholder = 'Rechercher une demande (titre, référence...)';
    } else if (url.includes('/app/offers')) {
      this.searchPlaceholder = 'Rechercher une offre (ID, référence de la demande...)';
    } else if (url.includes('/app/contracts')) {
      this.searchPlaceholder = 'Rechercher un contrat...';
    } else if (url.includes('/app/timesheets')) {
      this.searchPlaceholder = 'Rechercher une feuille de temps...';
    } else if (url.includes('/app/invoices')) {
      this.searchPlaceholder = 'Rechercher une facture...';
    } else if (url.includes('/app/profil')) {
      this.searchPlaceholder = 'Rechercher...';
    } else {
      this.searchPlaceholder = 'Rechercher...';
    }
  }

  onSearch(): void {
    this.globalSearchService.setSearchQuery(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.globalSearchService.clearSearch();
  }

  goToProfile(): void {
    this.router.navigate(['/app/profil']);
  }

  onLogout(): void {
    this.authService.logout();
  }

  onNotificationClick(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(this.context, notification.id);
    }

    this.router.navigate(['/app/offers']);
  }

  markAllOfferNotificationsAsRead(): void {
    this.offerNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        notifications
          .filter(notification => !notification.read)
          .forEach(notification => {
            this.notificationService.markAsRead(this.context, notification.id);
          });
      });
  }

  formatNotificationDate(date: string): string {
    if (!date) return '';
    // Remove excessive microseconds if present (e.g. 2026-03-11T01:18:51.922843089)
    let safeDate = date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6,}/.test(date)) {
      safeDate = date.replace(/(\.\d{3})\d+/, '$1');
    }
    const d = new Date(safeDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByNotificationId(index: number, notification: AppNotification): string {
    return notification.id;
  }
}
