import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  route?: string;
  referenceId?: number | null;
  referenceType?: string | null;
}

export type NotificationContext = 'admin' | 'user';

@Injectable({
  providedIn: 'root'
})
export class NotificationStoreService {
  private readonly notificationsSubjects: Record<NotificationContext, BehaviorSubject<AppNotification[]>> = {
    admin: new BehaviorSubject<AppNotification[]>([]),
    user: new BehaviorSubject<AppNotification[]>([])
  };

  private readonly unreadCountSubjects: Record<NotificationContext, BehaviorSubject<number>> = {
    admin: new BehaviorSubject<number>(0),
    user: new BehaviorSubject<number>(0)
  };

  constructor() {
    this.loadFromStorage('admin');
    this.loadFromStorage('user');
  }

  getNotifications(context: NotificationContext): Observable<AppNotification[]> {
    return this.notificationsSubjects[context].asObservable();
  }

  getUnreadCount(context: NotificationContext): Observable<number> {
    return this.unreadCountSubjects[context].asObservable();
  }

  getSnapshot(context: NotificationContext): AppNotification[] {
    return this.notificationsSubjects[context].value;
  }

  add(context: NotificationContext, notification: AppNotification): void {
    const current = this.notificationsSubjects[context].value;

    const alreadyExists = current.some(existing => existing.id === notification.id);
    if (alreadyExists) {
      return;
    }

    const updated = [notification, ...current];
    this.notificationsSubjects[context].next(updated);
    this.updateUnreadCount(context, updated);
    this.persist(context, updated);
  }

  setAll(context: NotificationContext, notifications: AppNotification[]): void {
    this.notificationsSubjects[context].next(notifications);
    this.updateUnreadCount(context, notifications);
    this.persist(context, notifications);
  }

  markAsRead(context: NotificationContext, notificationId: string): void {
    const updated = this.notificationsSubjects[context].value.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    this.notificationsSubjects[context].next(updated);
    this.updateUnreadCount(context, updated);
    this.persist(context, updated);
  }

  markAllAsRead(context: NotificationContext): void {
    const updated = this.notificationsSubjects[context].value.map(notification => ({
      ...notification,
      read: true
    }));

    this.notificationsSubjects[context].next(updated);
    this.updateUnreadCount(context, updated);
    this.persist(context, updated);
  }

  remove(context: NotificationContext, notificationId: string): void {
    const updated = this.notificationsSubjects[context].value.filter(
      notification => notification.id !== notificationId
    );

    this.notificationsSubjects[context].next(updated);
    this.updateUnreadCount(context, updated);
    this.persist(context, updated);
  }

  clear(context: NotificationContext): void {
    this.notificationsSubjects[context].next([]);
    this.unreadCountSubjects[context].next(0);
    localStorage.removeItem(this.getStorageKey(context));
  }

  private updateUnreadCount(context: NotificationContext, notifications: AppNotification[]): void {
    const unread = notifications.filter(notification => !notification.read).length;
    this.unreadCountSubjects[context].next(unread);
  }

  private persist(context: NotificationContext, notifications: AppNotification[]): void {
    localStorage.setItem(this.getStorageKey(context), JSON.stringify(notifications));
  }

  private loadFromStorage(context: NotificationContext): void {
    const raw = localStorage.getItem(this.getStorageKey(context));

    if (!raw) {
      return;
    }

    try {
      const notifications: AppNotification[] = JSON.parse(raw);
      this.notificationsSubjects[context].next(notifications);
      this.updateUnreadCount(context, notifications);
    } catch (error) {
      console.error(`Erreur lecture notifications ${context} localStorage:`, error);
      localStorage.removeItem(this.getStorageKey(context));
    }
  }

  private getStorageKey(context: NotificationContext): string {
    return context === 'admin' ? 'admin_notifications' : 'user_notifications';
  }
}
