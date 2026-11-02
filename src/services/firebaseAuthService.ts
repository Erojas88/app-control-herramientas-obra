import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import type { UserProfile } from '../types';

export type AuthResult = {
  ok: boolean;
  user?: UserProfile;
  error?: string;
};

const DEMO_USERS: Record<string, { password: string; user: UserProfile }> = {
  'jefe@demo': {
    password: 'demo1234',
    user: {
      uid: 'demo-jefe-obra',
      fullName: 'Jefe de Obra Demo',
      role: 'jefe_obra',
      company: 'Constructora Demo',
      position: 'Jefe de Obra',
      email: 'jefe@demo',
      active: true,
      projectName: 'Proyecto Jardín Botánico',
    },
  },
  'jefe@demo.com': {
    password: 'demo1234',
    user: {
      uid: 'demo-jefe-obra',
      fullName: 'Jefe de Obra Demo',
      role: 'jefe_obra',
      company: 'Constructora Demo',
      position: 'Jefe de Obra',
      email: 'jefe@demo.com',
      active: true,
      projectName: 'Proyecto Jardín Botánico',
    },
  },
};

const normalizeRole = (role?: string): UserProfile['role'] => {
  const normalized = (role ?? 'solicitante').toLowerCase();

  if (normalized === 'jefe' || normalized === 'jefeobra' || normalized === 'jefe_obra') {
    return 'jefe_obra';
  }

  if (normalized === 'solicitante') return 'solicitante';
  if (normalized === 'admin') return 'admin';

  return 'solicitante';
};

const getFirebaseAuthErrorMessage = (error: any): string => {
  const code = error?.code ?? '';
  const message = error?.message ?? 'Credenciales inválidas.';

  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'No existe ese usuario en Firebase Authentication o la contraseña es incorrecta.';
  }

  if (code === 'auth/invalid-email') {
    return 'El correo ingresado no es válido.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Se intentaron varios accesos. Intenta nuevamente en unos minutos.';
  }

  return message;
};

export const registerWithEmailAndPassword = async (
  email: string,
  password: string,
  profile: Partial<UserProfile>,
): Promise<AuthResult> => {
  if (!auth || !db || !isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está configurado. Verifica las variables EXPO_PUBLIC_FIREBASE_* antes de crear usuarios.',
    };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const userDoc: UserProfile = {
      uid: credential.user.uid,
      fullName: profile.fullName ?? credential.user.email ?? 'Usuario',
      role: profile.role ?? 'solicitante',
      company: profile.company ?? 'BuildPro',
      position: profile.position ?? 'Trabajador',
      email: credential.user.email ?? email,
      active: true,
      projectName: profile.projectName ?? 'Proyecto San Martín',
    };

    await setDoc(doc(db, 'users', credential.user.uid), userDoc);
    return { ok: true, user: userDoc };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'No se pudo crear la cuenta.' };
  }
};

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<AuthResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const demoUser = DEMO_USERS[normalizedEmail] ?? DEMO_USERS[normalizedEmail.replace(/\.com$/, '')];

  if (demoUser && password.trim() === demoUser.password) {
    return {
      ok: true,
      user: {
        ...demoUser.user,
        email: normalizedEmail,
      },
    };
  }

  if (!auth || !db || !isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está configurado. Verifica las variables EXPO_PUBLIC_FIREBASE_* para iniciar sesión.',
    };
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

    if (userDoc.exists()) {
      const firestoreUser = userDoc.data() as Partial<UserProfile> & { role?: string; rol?: string; name?: string; fullName?: string };
      const normalizedUser: UserProfile = {
        uid: firestoreUser.uid ?? credential.user.uid,
        fullName: firestoreUser.fullName ?? firestoreUser.name ?? credential.user.displayName ?? 'Usuario',
        role: normalizeRole(firestoreUser.role ?? firestoreUser.rol),
        company: firestoreUser.company ?? 'BuildPro',
        position: firestoreUser.position ?? 'Trabajador',
        email: firestoreUser.email ?? credential.user.email ?? email,
        active: firestoreUser.active ?? true,
        projectName: firestoreUser.projectName ?? 'Proyecto San Martín',
      };

      return { ok: true, user: normalizedUser };
    }

    return {
      ok: false,
      error: 'Este usuario no tiene un perfil registrado en Firebase. Contacta al administrador para crear su cuenta.',
    };
  } catch (error: any) {
    return { ok: false, error: getFirebaseAuthErrorMessage(error) };
  }
};

export const logout = async () => {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase no está configurado. Verifica las variables EXPO_PUBLIC_FIREBASE_* antes de cerrar sesión.');
  }

  await firebaseSignOut(auth);
};

export const observeAuthState = (callback: (user: User | null) => void) => {
  if (!auth || !isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};
