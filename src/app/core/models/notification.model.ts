export interface NotificationMessage {
  type: string;
  title: string;
  message: string;
  clientId?: number | null;
  offerId?: number | null;
  demandeId?: number | null;
  createdAt: string;
}

export interface WebSocketNotification {
  message: NotificationMessage;
  read?: boolean;
  id?: string;
}
