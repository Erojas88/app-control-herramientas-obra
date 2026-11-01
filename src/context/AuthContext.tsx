import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile, UserRole } from '../types';
import { logout, observeAuthState } from '../services/firebaseAuthService';
import { auth, db, isFirebaseConfigured } from '../config/firebase';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

type AuthContextType = {
  user: UserProfile | null;
  signIn: (role: UserRole) => void;
  setUser: (user: UserProfile) => void;
  signOut: () => Promise<void>;
  trackSessionActivity: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (role?: string): UserProfile['role'] => {
  const normalized = (role ?? 'solicitante').toLowerCase();

  if (normalized === 'jefe' || normalized === 'jefeobra' || normalized === 'jefe_obra') {
    return 'jefe_obra';
  }

  if (normalized === 'admin') {
    return 'admin';
  }

  return 'solicitante';
};

const restoreSessionUser = async (uid: string): Promise<UserProfile | null> => {
  if (!db || !isFirebaseConfigured) {
    return null;
  }

  const userDoc = await getDoc(doc(db, 'users', uid));

  if (!userDoc.exists()) {
    return null;
  }

  const firestoreUser = userDoc.data() as Partial<UserProfile> & { role?: string; rol?: string; name?: string; fullName?: string };

  return {
    uid: firestoreUser.uid ?? uid,
    fullName: firestoreUser.fullName ?? firestoreUser.name ?? 'Usuario',
    role: normalizeRole(firestoreUser.role ?? firestoreUser.rol),
    company: firestoreUser.company ?? 'BuildPro',
    position: firestoreUser.position ?? 'Trabajador',
    email: firestoreUser.email ?? '',
    active: firestoreUser.active ?? true,
    projectName: firestoreUser.projectName ?? 'Proyecto San Martín',
  };
};

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

  const setUser = useCallback((nextUser: UserProfile) => {
    setUserState(nextUser);
    clearSessionState();
  }, [clearSessionState]);

  const trackSessionActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      return;
    }

    const unsubscribe = observeAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setUserState(null);
        return;
      }

      try {
        const restoredUser = await restoreSessionUser(firebaseUser.uid);
        setUserState(restoredUser ?? null);
        if (restoredUser) {
          clearSessionState();
        }
      } catch {
        setUserState(null);
      }
    });

    return () => unsubscribe();
  }, [clearSessionState]);

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
        void finishSession();
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
      signIn: (_role: UserRole) => {
        // Se fuerza el uso de Firebase, sin usuarios demo ni fallback en memoria.
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
