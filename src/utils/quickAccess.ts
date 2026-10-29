import type { UserRole } from '../types';

export const APP_DEEP_LINK_SCHEME = 'controlherramientasobra';
export const REQUESTER_ACCESS_PATH = 'access';

export const buildRequesterAccessUrl = (scheme = APP_DEEP_LINK_SCHEME) => {
  return `${scheme}://${REQUESTER_ACCESS_PATH}?role=solicitante`;
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
