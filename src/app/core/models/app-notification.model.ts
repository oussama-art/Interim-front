export interface AppNotification {
  id: string;
  backendId?: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  route?: string;
  referenceId?: number | null;
  referenceType?: string | null;
}
