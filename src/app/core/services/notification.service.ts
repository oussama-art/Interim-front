import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { NotificationMessage } from '../models/notification.model';
import { WebSocketService } from './websocket.service';
import { NotificationSoundService } from './sound.service';
import { NotificationApiService } from './notification-api.service';
import {
  AppNotification,
  NotificationContext,
  NotificationStoreService
} from './notification-store.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly userNotifications$ = new Subject<NotificationMessage>();
  private readonly adminNotifications$ = new Subject<NotificationMessage>();

  constructor(
    private webSocketService: WebSocketService,
    private notificationSoundService: NotificationSoundService,
    private notificationStore: NotificationStoreService,
    private notificationApi: NotificationApiService
  ) {
    this.webSocketService.getNotifications().subscribe(notification => {
      this.handleIncomingNotification(notification);
    });
  }

  initWebSocketConnection(token: string): void {
    this.webSocketService.connect(token);
  }

  disconnect(): void {
    this.webSocketService.disconnect();
  }

  isWebSocketConnected(): Observable<boolean> {
    return this.webSocketService.isConnected();
  }

  subscribeToUserNotifications(): void {
    this.webSocketService.subscribeToUserNotifications();
  }

  subscribeToClientNotifications(clientId: number): void {
    this.webSocketService.subscribeToClientTopic(clientId);
  }

  subscribeToAdminAccountRequests(): void {
    this.webSocketService.subscribeToAdminAccountRequests();
  }

  subscribeToAdminOffers(): void {
    this.webSocketService.subscribeToAdminOffers();
  }

  subscribeToAdminDemandes(): void {
    this.webSocketService.subscribeToAdminDemandes();
  }

  loadUserNotificationsFromBackend(): void {
    this.notificationApi.getMyNotifications().subscribe({
      next: notifications => {
        const mapped: AppNotification[] = notifications.map(n => ({
          id: n.id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          read: n.read,
          route: n.targetRoute || this.resolveRoute({
            type: n.type,
            title: n.title,
            message: n.message,
            createdAt: n.createdAt
          } as NotificationMessage),
          referenceId: n.referenceId,
          referenceType: n.referenceType
        }));

        this.notificationStore.setAll('user', mapped);
      },
      error: err => {
        console.error('Erreur chargement notifications user', err);
      }
    });
  }

  loadAdminNotificationsFromBackend(): void {
    this.notificationApi.getAdminNotifications().subscribe({
      next: notifications => {
        const mapped: AppNotification[] = notifications.map(n => ({
          id: n.id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          read: n.read,
          route: n.targetRoute || this.resolveRoute({
            type: n.type,
            title: n.title,
            message: n.message,
            createdAt: n.createdAt
          } as NotificationMessage),
          referenceId: n.referenceId,
          referenceType: n.referenceType
        }));

        this.notificationStore.setAll('admin', mapped);
      },
      error: err => {
        console.error('Erreur chargement notifications admin', err);
      }
    });
  }

  getUserNotifications(): Observable<NotificationMessage> {
    return this.userNotifications$.asObservable();
  }

  getAdminNotifications(): Observable<NotificationMessage> {
    return this.adminNotifications$.asObservable();
  }

  getStoredNotifications(context: NotificationContext): Observable<AppNotification[]> {
    return this.notificationStore.getNotifications(context);
  }

  getUnreadCount(context: NotificationContext): Observable<number> {
    return this.notificationStore.getUnreadCount(context);
  }

  markAsRead(context: NotificationContext, notificationId: string): void {
    const backendId = Number(notificationId);

    if (Number.isNaN(backendId)) {
      this.notificationStore.markAsRead(context, notificationId);
      return;
    }

    this.notificationApi.markAsRead(backendId).subscribe({
      next: () => {
        this.notificationStore.markAsRead(context, notificationId);
      },
      error: err => {
        console.error('Erreur markAsRead:', err);
      }
    });
  }

  markAllAsRead(context: NotificationContext): void {
    const request$ =
      context === 'admin'
        ? this.notificationApi.markAllAdminNotificationsAsRead()
        : this.notificationApi.markAllMyNotificationsAsRead();

    request$.subscribe({
      next: () => {
        this.notificationStore.markAllAsRead(context);
      },
      error: err => {
        console.error(`Erreur markAllAsRead ${context}:`, err);
      }
    });
  }

  clearStoredNotifications(context: NotificationContext): void {
    this.notificationStore.clear(context);
  }

  private handleIncomingNotification(notification: NotificationMessage): void {
    console.log('Handling notification:', notification);

    const context = this.resolveContext(notification);
    const appNotification = this.mapToAppNotification(notification);

    this.notificationStore.add(context, appNotification);
    this.notificationSoundService.play();

    if (context === 'admin') {
      this.adminNotifications$.next(notification);
    } else {
      this.userNotifications$.next(notification);
    }
  }

  private resolveContext(notification: NotificationMessage): NotificationContext {
    const adminTypes = [
      'ACCOUNT_REQUEST_CREATED',
      'CANDIDATE_ACCEPTED',
      'CANDIDATE_REJECTED'
    ];

    if (adminTypes.includes(notification.type)) {
      return 'admin';
    }

    return 'user';
  }

  private mapToAppNotification(notification: NotificationMessage): AppNotification {
    const backendId = (notification as any).id;

    return {
      id: backendId ? String(backendId) : crypto.randomUUID(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      read: false,
      route: this.resolveRoute(notification),
      referenceId: notification.offerId ?? notification.clientId ?? null,
      referenceType: notification.type
    };
  }

  private resolveRoute(notification: NotificationMessage): string {
    if (notification.type === 'ACCOUNT_REQUEST_CREATED') {
      return '/admin/account-requests';
    }

    if (
      notification.type === 'CANDIDATE_ACCEPTED' ||
      notification.type === 'CANDIDATE_REJECTED'
    ) {
      return '/admin/offers';
    }

    if (
      notification.type === 'OFFER_CREATED' ||
      notification.type === 'CANDIDATES_ADDED'
    ) {
      return '/app/offers';
    }

    return '/';
  }
}
