import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import type { UserDto } from '../types';
import { userApi } from '../api';

interface AuthContextType {
  user: UserDto | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<UserDto | null>(null);

  // Fetch our user profile (storage quota etc.) whenever Clerk auth state changes
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Small delay so Clerk has set window.Clerk.session before our axios interceptor runs
      const t = setTimeout(() => {
        userApi.getMe()
          .then((r) => setUser(r.data))
          .catch(() => setUser(null));
      }, 100);
      return () => clearTimeout(t);
    } else {
      setUser(null);
    }
  }, [isSignedIn, isLoaded, clerkUser?.id]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await userApi.getMe();
      setUser(response.data);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading: !isLoaded, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
