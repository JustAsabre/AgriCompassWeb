import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { setSentryUser } from "@/sentry";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://agricompassweb.fly.dev';

type AuthContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Set Sentry user context
        if (data.user) {
          setSentryUser({
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
          });
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Set Sentry user context
        if (data.user) {
          setSentryUser({
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
          });
        }
      }
    } catch (error) {
      console.error("User refresh failed:", error);
    }
  };

  const login = (user: User) => {
    setUser(user);
    // Set Sentry user context on login
    setSentryUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      // Clear Sentry user context on logout
      setSentryUser(null);
      // Clear all React Query cache to prevent data leakage between users
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
