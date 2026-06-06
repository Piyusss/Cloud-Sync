import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface AppNotification {
  id: string;
  type: 'UPLOAD_COMPLETE' | 'FILE_SHARED' | 'STORAGE_WARNING' | 'RESTORE' | string;
  title: string;
  message: string;
  fileId?: string;
  fileName?: string;
  timestamp: string;
  read: boolean;
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api')
  .replace(/\/api$/, '');          // strip /api → base URL for the WS endpoint

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    let destroyed = false;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),

      // Fetch a fresh Clerk token just before connecting
      beforeConnect: async () => {
        try {
          const token = await (window as any).Clerk?.session?.getToken();
          if (token) {
            client.connectHeaders = { Authorization: `Bearer ${token}` };
          }
        } catch {
          // Clerk not ready yet — connect without auth (will be rejected by interceptor)
        }
      },

      onConnect: () => {
        client.subscribe('/user/queue/notifications', (frame) => {
          if (destroyed) return;
          try {
            const raw = JSON.parse(frame.body);
            const notif: AppNotification = {
              ...raw,
              id: crypto.randomUUID(),
              read: false,
            };
            setNotifications((prev) => [notif, ...prev].slice(0, 30));
            setUnread((n) => n + 1);
          } catch {
            // malformed frame — ignore
          }
        });
      },

      reconnectDelay: 5000,
    });

    client.activate();
    clientRef.current = client;

    return () => {
      destroyed = true;
      client.deactivate();
    };
  }, []);

  const markAllRead = () => {
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return { notifications, unread, markAllRead, dismiss };
}
