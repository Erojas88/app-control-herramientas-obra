import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getEffectiveRequestStatus, normalizeApprovalStatus, subscribeToRequestsByUser } from '../services/firebaseService';
import type { ToolRequest } from '../types';
import { buildRequesterAccessUrl, getGuestSessionIdFromUrl, readGuestSession } from '../utils/quickAccess';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  returned: 'Devuelta',
  delivered: 'Entregada',
};

const resolveRequestDisplayStatus = (request: ToolRequest) => {
  const items = request.items ?? [];

  if (items.length > 0 && items.every((item) => !!item.returnedAt)) {
    return 'returned';
  }

  return getEffectiveRequestStatus(request) === 'approved'
    ? 'approved'
    : getEffectiveRequestStatus(request) === 'rejected'
      ? 'rejected'
      : 'pending';
};

const resolveItemDisplayStatus = (item: ToolRequest['items'][number]) => {
  if (item.returnedAt) {
    return { value: 'returned', label: 'Devuelta' };
  }

  if (item.deliveredAt) {
    return { value: 'delivered', label: 'Entregada' };
  }

  const approvalStatus = normalizeApprovalStatus(item.approvalStatus);

  if (approvalStatus === 'approved') {
    return { value: 'approved', label: 'Aprobada' };
  }

  if (approvalStatus === 'rejected') {
    return { value: 'rejected', label: 'Rechazada' };
  }

  return { value: 'pending', label: 'Pendiente' };
};

export default function MisSolicitudesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ guestSessionId?: string }>();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadRequests = useCallback(async (sessionId: string | null) => {
    if (!sessionId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const unsub = subscribeToRequestsByUser(sessionId, (records) => {
        setRequests(records);
        setLoading(false);
      });

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = unsub;
    } catch (error) {
      console.warn('No se pudieron cargar las solicitudes del visitante.', error);
      setRequests([]);
      Alert.alert('Sin datos', 'No fue posible cargar tus solicitudes en este momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const resolveSessionId = async () => {
        const urlSessionId = getGuestSessionIdFromUrl(typeof window !== 'undefined' ? window.location.href : null);
        const paramSessionId = typeof params.guestSessionId === 'string' ? params.guestSessionId : null;
        const storageSession = readGuestSession();
        const nextId = paramSessionId ?? urlSessionId ?? storageSession?.id ?? null;

        setGuestSessionId(nextId);
        if (!nextId) {
          setRequests([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        unsubscribeRef.current = subscribeToRequestsByUser(nextId, (records) => {
          setRequests(records);
          setLoading(false);
        });
      };

      void resolveSessionId();

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }, [params.guestSessionId]),
  );

  const sessionUrl = useMemo(() => {
    if (!guestSessionId) {
      return null;
    }

    return buildRequesterAccessUrl('https', guestSessionId);
  }, [guestSessionId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loaderText}>Cargando tus solicitudes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerCard}>
        <Text style={styles.badge}>Solicitante</Text>
        <View style={styles.headerActions}>
          <Text style={styles.title}>Mis solicitudes</Text>
          {guestSessionId ? (
            <Pressable onPress={() => void loadRequests(guestSessionId)} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Actualizar</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Consulta el estado actual de cada herramienta solicitada y revisa la evidencia si aplica.</Text>
      </View>

      {!guestSessionId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay sesión activa</Text>
          <Text style={styles.emptyText}>Abre la app pública desde el QR o vuelve al formulario para crear una solicitud.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/solicitante')}>
            <Text style={styles.primaryButtonText}>Ir al formulario</Text>
          </Pressable>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sin solicitudes aún</Text>
          <Text style={styles.emptyText}>Todavía no hay solicitudes asociadas a esta sesión pública.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/solicitante')}>
            <Text style={styles.primaryButtonText}>Crear solicitud</Text>
          </Pressable>
        </View>
      ) : (
        requests.map((request) => {
          const effectiveStatus = resolveRequestDisplayStatus(request);
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{request.projectName || 'Solicitud sin proyecto'}</Text>
                <View style={[styles.statusPill, effectiveStatus === 'approved' ? styles.approved : effectiveStatus === 'rejected' ? styles.rejected : effectiveStatus === 'returned' ? styles.returned : styles.pending]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[effectiveStatus] ?? 'Pendiente'}</Text>
                </View>
              </View>

              <Text style={styles.metaText}>Folio: {request.id}</Text>
              <Text style={styles.metaText}>Solicitante: {request.requesterName}</Text>
              <Text style={styles.metaText}>Creada: {new Date(request.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</Text>

              {request.items.map((item) => {
                const itemStatus = resolveItemDisplayStatus(item);
                const decisionText = item.approvalComment ? `Comentario: ${item.approvalComment}` : 'Sin comentarios del jefe de obra.';

                return (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{item.toolName}</Text>
                    <Text style={styles.itemMeta}>Estado: {itemStatus.label}</Text>
                    <Text style={styles.itemMeta}>Cantidad: {item.quantity}</Text>
                    <Text style={styles.itemMeta}>Área: {item.workArea || 'Sin área'}</Text>
                    <Text style={styles.itemMeta}>Fecha estimada: {item.dueDate || 'Sin fecha'}</Text>
                    {item.approvalComment && <Text style={styles.itemComment}>{decisionText}</Text>}

                    {Array.isArray(item.photoUrls) && item.photoUrls.length > 0 && (
                      <View style={styles.photoGrid}>
                        {item.photoUrls.map((photoUrl, index) => (
                          <Image key={`${item.id}-${index}`} source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {sessionUrl && (
                <Text style={styles.sessionUrl}>Sesión pública: {sessionUrl}</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 18, paddingBottom: 40 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loaderText: { marginTop: 12, color: '#334155', fontWeight: '600' },
  headerCard: { backgroundColor: '#0f766e', borderRadius: 20, padding: 20, marginBottom: 16 },
  badge: { backgroundColor: '#ecfeff', color: '#115e59', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, fontWeight: '800', alignSelf: 'flex-start', marginBottom: 8, letterSpacing: 1 },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', flex: 1 },
  refreshButton: { backgroundColor: '#ecfeff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  refreshText: { color: '#0f766e', fontWeight: '700', fontSize: 12 },
  subtitle: { fontSize: 14, color: '#d1fae5', lineHeight: 20 },
  emptyState: { backgroundColor: '#fff', borderRadius: 18, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  requestCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flexShrink: 1, marginRight: 8 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  approved: { backgroundColor: '#dcfce7' },
  rejected: { backgroundColor: '#fee2e2' },
  pending: { backgroundColor: '#fef3c7' },
  returned: { backgroundColor: '#dbeafe' },
  statusText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  metaText: { color: '#475569', fontSize: 12, lineHeight: 18 },
  itemCard: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginTop: 12 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  itemMeta: { color: '#334155', fontSize: 12, lineHeight: 18 },
  itemComment: { color: '#0f172a', fontSize: 12, lineHeight: 18, marginTop: 6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photo: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#e2e8f0', marginRight: 8, marginBottom: 8 },
  sessionUrl: { color: '#475569', fontSize: 11, lineHeight: 16, marginTop: 12 },
});
