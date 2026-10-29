import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import type { UserProfile, UserRole } from '../types';
import { logout } from '../services/firebaseAuthService';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

const demoUsers: Record<string, UserProfile> = {
  solicitante: {
    uid: 'demo-solicitante',
    fullName: 'María López',
    role: 'solicitante',
    company: 'BuildPro',
    position: 'Soldador',
    email: 'solicitante@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
  jefe_obra: {
    uid: 'demo-jefe',
    fullName: 'Luis Gómez',
    role: 'jefe_obra',
    company: 'BuildPro',
    position: 'Jefe de Obra',
    email: 'jefe@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
  admin: {
    uid: 'demo-admin',
    fullName: 'Ana Torres',
    role: 'admin',
    company: 'BuildPro',
    position: 'Administrador',
    email: 'admin@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
};

type AuthContextType = {
  user: UserProfile | null;
  signIn: (role: UserRole) => void;
  setUser: (user: UserProfile) => void;
  signOut: () => Promise<void>;
  trackSessionActivity: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const lastActivityRef = useRef(Date.now());
  const sessionStartedAtRef = useRef(Date.now());

  const clearSessionState = useCallback(() => {
    lastActivityRef.current = Date.now();
    sessionStartedAtRef.current = Date.now();
  }, []);

  const finishSession = useCallback(async () => {
    setUserState(null);
    clearSessionState();
    await logout();
  }, [clearSessionState]);

  const trackSessionActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    clearSessionState();

    const timer = setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;
      const totalMs = now - sessionStartedAtRef.current;

      if (idleMs >= SESSION_TIMEOUT_MS || totalMs >= MAX_SESSION_MS) {
        Alert.alert('Sesión cerrada', 'La sesión caducó por inactividad o por tiempo máximo permitido.');
        finishSession();
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [user, clearSessionState, finishSession]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        trackSessionActivity();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [trackSessionActivity]);

  const value = useMemo(
    () => ({
      user,
      signIn: (role: UserRole) => {
        const demoUser = demoUsers[role];
        if (demoUser) {
          setUserState(demoUser);
          clearSessionState();
        }
      },
      setUser: (nextUser: UserProfile) => {
        setUserState(nextUser);
        clearSessionState();
      },
      signOut: async () => {
        await finishSession();
      },
      trackSessionActivity,
    }),
    [user, clearSessionState, finishSession, trackSessionActivity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
