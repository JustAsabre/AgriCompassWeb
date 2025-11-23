import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
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
  const { user } = useAuth();
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

    const newSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
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

    // Listen for new notifications
    newSocket.on("new_notification", (notification: Notification) => {
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
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      
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
