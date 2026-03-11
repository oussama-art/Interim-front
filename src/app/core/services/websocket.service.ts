import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationMessage } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private notificationSubject$ = new Subject<NotificationMessage>();
  private subscriptions: Map<string, StompSubscription> = new Map();
  private desiredSubscriptions: Map<string, string> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private currentToken: string | null = null;

  connect(token: string): void {
    if (!token || !token.trim()) {
      console.error('WebSocket token is missing');
      return;
    }

    this.currentToken = token;

    if (this.stompClient && this.stompClient.active) {
      console.log('WebSocket client already active');
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 0,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str: string) => console.log('STOMP:', str),

      beforeConnect: async () => {
        if (!this.stompClient || !this.currentToken) {
          throw new Error('Token unavailable before STOMP connect');
        }

        this.stompClient.connectHeaders = {
          Authorization: `Bearer ${this.currentToken}`
        };
      },

      onConnect: () => {
        console.log('WebSocket Connected');
        this.connected$.next(true);
        this.reconnectAttempts = 0;
        this.restoreSubscriptions();
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
        this.connected$.next(false);
      },

      onWebSocketClose: () => {
        console.log('WebSocket connection closed');
        this.connected$.next(false);
        this.handleReconnect();
      },

      onWebSocketError: (error) => {
        console.error('WebSocket error:', error);
        this.connected$.next(false);
      }
    });

    this.stompClient.activate();
  }

  subscribeToUserNotifications(): void {
    this.subscribeToDestination('/user/queue/notifications', 'user');
  }

  subscribeToClientTopic(clientId: number): void {
    this.subscribeToDestination(`/topic/client/${clientId}/notifications`, 'client topic');
  }

  subscribeToAdminAccountRequests(): void {
    this.subscribeToDestination('/topic/admin/account-requests', 'admin account requests');
  }

  subscribeToAdminOffers(): void {
    this.subscribeToDestination('/topic/admin/offers', 'admin offers');
  }

  subscribeToAdminDemandes(): void {
    this.subscribeToDestination('/topic/admin/demandes', 'admin demandes');
  }

  private subscribeToDestination(destination: string, label: string): void {
    this.desiredSubscriptions.set(destination, label);

    if (!this.stompClient || !this.stompClient.connected) {
      console.warn(`Subscription to ${destination} saved and will be restored after connection`);
      return;
    }

    this.activateSubscription(destination, label);
  }

  private activateSubscription(destination: string, label: string): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    if (this.subscriptions.has(destination)) {
      this.subscriptions.get(destination)?.unsubscribe();
      this.subscriptions.delete(destination);
    }

    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        const notification: NotificationMessage = JSON.parse(message.body);
        console.log(`Received ${label} notification:`, notification);
        this.notificationSubject$.next(notification);
      } catch (error) {
        console.error(`Invalid ${label} notification payload:`, error);
      }
    });

    this.subscriptions.set(destination, subscription);
    console.log(`Subscribed to ${destination}`);
  }

  private restoreSubscriptions(): void {
    this.desiredSubscriptions.forEach((label, destination) => {
      this.activateSubscription(destination, label);
    });
  }

  getNotifications(): Observable<NotificationMessage> {
    return this.notificationSubject$.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.desiredSubscriptions.clear();

    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }

    this.connected$.next(false);
    this.reconnectAttempts = 0;
    console.log('WebSocket disconnected');
  }

  private handleReconnect(): void {
    if (!this.currentToken) {
      console.error('Reconnect aborted: missing token');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      if (this.currentToken) {
        this.connect(this.currentToken);
      }
    }, 5000);
  }
}
