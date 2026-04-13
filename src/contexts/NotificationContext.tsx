"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationCounts {
  inbox: number;
  orders: number;
  bookings: number;
}

interface NotificationContextValue {
  counts: NotificationCounts;
  refreshCounts: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  counts: { inbox: 0, orders: 0, bookings: 0 },
  refreshCounts: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<NotificationCounts>({ inbox: 0, orders: 0, bookings: 0 });
  const { seller, loading } = useAuth();

  const refreshCounts = useCallback(async () => {
    try {
      const data = await api<NotificationCounts>("/api/inbox/counts");
      setCounts(data);
    } catch {
      // Silent fail — badges just stay at 0
    }
  }, []);

  useEffect(() => {
    if (loading || !seller) return;
    refreshCounts();
    const interval = setInterval(refreshCounts, 60_000);
    return () => clearInterval(interval);
  }, [refreshCounts, loading, seller]);

  return (
    <NotificationContext.Provider value={{ counts, refreshCounts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
