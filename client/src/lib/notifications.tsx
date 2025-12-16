import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  isConnected: boolean;
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", user?.id],
    enabled: !!user,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count", user?.id],
    enabled: !!user,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    // In production (Vercel), use current origin (empty string = relative)
    // In development, use VITE_API_URL to talk directly to backend
    const socketUrl = import.meta.env.DEV 
      ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
      : undefined; // undefined = current origin in production

    const newSocket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    let authSent = false;
    newSocket.on("connect", () => {
      setIsConnected(true);
      if (!authSent) {
        newSocket.emit("authenticate", user.id);
        authSent = true;
      }
    });
    newSocket.on('authenticated', () => {
      authSent = true;
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      authSent = false;
    });

    // Listen for user updates so we can refresh current user session data
    newSocket.on("user_updated", async (_data: { userId: string; verified?: boolean }) => {
      try {
        // Await refreshUser so UI updates before subsequent operations.
        if (typeof refreshUser === 'function') {
          try {
            await refreshUser();
          } catch (err) {
            console.warn('refreshUser failed on user_updated socket event', err);
            // fall back to query invalidation
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }
      } catch (err) {
        console.error('Failed to handle user_updated socket event', err);
      }
    });

    // Listen for new notifications
    newSocket.on("new_notification", async (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });

      // Auto-refresh relevant data based on notification type
      if (notification.type === "order_update") {
        queryClient.invalidateQueries({ queryKey: ["/api/buyer/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/farmer/orders"] });
      } else if (notification.type === "message") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      } else if (notification.type === "verification_update") {
        queryClient.invalidateQueries({ queryKey: ["/api/farmer/verification"] });
        // Refresh the current user so UI reflects changes to `user.verified` (e.g., profile banner, dashboard)
        if (queryClient && typeof (queryClient as any).client?.refresh === 'undefined') {
          // not all queryClient instances expose refresh; instead call AuthProvider refresh hook
        }
        // Best-effort: if useAuth().refreshUser exists, call it (it will update local user state)
        try {
          if (typeof refreshUser === 'function') {
            await refreshUser();
          } else {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }
        } catch (err) {
          console.warn('refreshUser failed on verification_update notification', err);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }
      } else if (notification.type === "new_listing") {
        queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      }
    });

    // Listen for new listings
    newSocket.on("new_listing", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    });

    // Listen for price changes
    newSocket.on("price_change", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, queryClient]);

  const markAsRead = async (id: string) => {
    try {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");

      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/notifications/${id}`);

      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        isConnected,
        socket,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
