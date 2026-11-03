import type { GuestSession, UserRole } from '../types';

export const APP_DEEP_LINK_SCHEME = 'controlherramientasobra';
export const REQUESTER_ACCESS_PATH = 'access';
export const PUBLIC_REQUESTER_WEB_URL = process.env.EXPO_PUBLIC_REQUESTER_WEB_URL ?? 'https://app-control-herramientas-obra.vercel.app/solicitante';
export const GUEST_SESSION_STORAGE_KEY = 'public_guest_session_v1';

export const buildRequesterAccessUrl = (scheme = 'https', guestSessionId?: string) => {
  const isWebUrl = scheme === 'https' || scheme === 'http';
  const baseUrl = isWebUrl ? PUBLIC_REQUESTER_WEB_URL : `${scheme}://${REQUESTER_ACCESS_PATH}?role=solicitante`;

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set('role', 'solicitante');

    if (guestSessionId) {
      parsed.searchParams.set('guestSessionId', guestSessionId);
    }

    return parsed.toString();
  } catch {
    const delimiter = baseUrl.includes('?') ? '&' : '?';
    const suffix = guestSessionId ? `${delimiter}role=solicitante&guestSessionId=${guestSessionId}` : `${delimiter}role=solicitante`;
    return `${baseUrl}${suffix}`;
  }
};

export const createGuestSession = (displayName?: string): GuestSession => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `guest-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    expiresAt,
    displayName,
    status: 'active',
  };
};

export const isGuestSessionActive = (session: GuestSession | null | undefined) => {
  if (!session) {
    return false;
  }

  if (session.status === 'expired') {
    return false;
  }

  return new Date(session.expiresAt).getTime() > Date.now();
};

export const getGuestSessionIdFromUrl = (url: string | null): string | null => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('guestSessionId');
  } catch {
    const match = url.match(/[?&]guestSessionId=([^&]+)/i);
    return match?.[1] ?? null;
  }
};

export const readGuestSession = (): GuestSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as GuestSession;
    return isGuestSessionActive(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeGuestSession = (session: GuestSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage issues in restricted browsers or private modes.
  }
};

export const getRoleFromDeepLink = (url: string | null): UserRole | null => {
  if (!url) {
    return null;
  }

  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const roleFromQuery = parsedUrl.searchParams.get('role')?.toLowerCase();
    const roleFromPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (roleFromQuery === 'solicitante' || roleFromPath === 'solicitante') {
      return 'solicitante';
    }

    if (roleFromQuery === 'admin' || roleFromPath === 'admin') {
      return 'admin';
    }

    if (roleFromQuery === 'jefe_obra' || roleFromQuery === 'jefeobra' || roleFromPath === 'jefe_obra' || roleFromPath === 'jefeobra') {
      return 'jefe_obra';
    }
  } catch {
    const fallbackMatch = normalizedUrl.match(/[?&](?:role|mode)=([^&]+)/i);
    if (!fallbackMatch) {
      return null;
    }

    const fallbackRole = fallbackMatch[1]?.toLowerCase();
    if (fallbackRole === 'solicitante') return 'solicitante';
    if (fallbackRole === 'admin') return 'admin';
    if (fallbackRole === 'jefe_obra' || fallbackRole === 'jefeobra') return 'jefe_obra';
  }

  return null;
};
