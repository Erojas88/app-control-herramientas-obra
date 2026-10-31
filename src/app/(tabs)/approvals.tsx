import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getPendingRequestsForApproval, updateToolRequestItemApproval } from '../../services/firebaseService';
import type { ToolRequest, ToolRequestItem } from '../../types';

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<{ urls: string[]; index: number } | null>(null);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const pending = await getPendingRequestsForApproval();
        setRequests(pending);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo cargar solicitudes pendientes desde Firebase.';
        setRequests([]);
        Alert.alert('Firebase no disponible', message);
      }
    };

    if (user?.role === 'jefe_obra') {
      loadPending();
    }
  }, [user?.role]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending' || request.items.some((item) => item.approvalStatus === 'pending')),
    [requests],
  );

  const handleDecision = async (requestId: string, itemId: string, decision: 'approved' | 'rejected') => {
    if (!user) {
      Alert.alert('Acceso restringido', 'Debes iniciar sesión como jefe de obra.');
      return;
    }

    const nextComment = comments[itemId] ?? '';

    await updateToolRequestItemApproval(requestId, itemId, decision, user.fullName, nextComment);

    setRequests((current) =>
      current.map((request) => {
        if (request.id !== requestId) return request;

        const updatedItems = request.items.map((item) => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            approvalStatus: decision,
            approvalComment: nextComment || undefined,
            notes: nextComment || item.notes,
          };
        });

        const allDone = updatedItems.every((item) => item.approvalStatus !== 'pending');
        const allApproved = updatedItems.every((item) => item.approvalStatus === 'approved');
        const allRejected = updatedItems.every((item) => item.approvalStatus === 'rejected');

        return {
          ...request,
          status: allDone ? (allApproved ? 'approved' : allRejected ? 'rejected' : 'pending') : 'pending',
          items: updatedItems,
        };
      }),
    );

    Alert.alert('Decisión registrada', `La herramienta fue ${decision === 'approved' ? 'aprobada' : 'rechazada'}. El solicitante recibirá la notificación correspondiente.`);
  };

  if (!user || user.role !== 'jefe_obra') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Aprobación del Jefe de Obra</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Acceso restringido</Text>
          <Text style={styles.emptyText}>Esta vista solo está disponible para el rol de jefe de obra.</Text>
        </View>
      </View>
    );
  }

  const currentPhotoUrl = selectedPhoto && selectedPhoto.urls.length > 0 ? selectedPhoto.urls[selectedPhoto.index] : null;

  return (
    <View style={styles.container}>
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPhoto(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {currentPhotoUrl && (
              <>
                <View style={styles.carouselHeader}>
                  <Text style={styles.carouselCounter}>{selectedPhoto!.index + 1} / {selectedPhoto!.urls.length}</Text>
                </View>
                <Image source={{ uri: currentPhotoUrl }} style={styles.modalImage} resizeMode="contain" />
                <View style={styles.carouselControls}>
                  <Pressable
                    style={[styles.carouselButton, selectedPhoto!.index === 0 && styles.carouselButtonDisabled]}
                    disabled={selectedPhoto!.index === 0}
                    onPress={() => setSelectedPhoto((current) => current ? { ...current, index: Math.max(0, current.index - 1) } : current)}
                  >
                    <Text style={styles.carouselButtonText}>Anterior</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.carouselButton, selectedPhoto!.index === selectedPhoto!.urls.length - 1 && styles.carouselButtonDisabled]}
                    disabled={selectedPhoto!.index === selectedPhoto!.urls.length - 1}
                    onPress={() => setSelectedPhoto((current) => current ? { ...current, index: Math.min(current.urls.length - 1, current.index + 1) } : current)}
                  >
                    <Text style={styles.carouselButtonText}>Siguiente</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Pressable style={styles.closeButton} onPress={() => setSelectedPhoto(null)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.title}>Aprobación del Jefe de Obra</Text>
      <FlatList
        data={pendingRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.requestId}>{item.id}</Text>
              <Text style={[styles.requestStatus, item.status === 'approved' ? styles.statusApproved : item.status === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                {item.status === 'approved' ? 'Aprobada' : item.status === 'rejected' ? 'Rechazada' : 'Parcial'}
              </Text>
            </View>
            <Text style={styles.requester}>{item.requesterName}</Text>
            <Text style={styles.meta}>{item.projectName} · {item.company}</Text>
            <Text style={styles.meta}>Fecha: {item.createdAt}</Text>

            {item.items.map((entry: ToolRequestItem) => (
              <View key={entry.id} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{entry.toolName}</Text>
                <Text style={styles.itemText}>Cantidad: {entry.quantity}</Text>
                <Text style={styles.itemText}>Motivo: {entry.purpose}</Text>
                <Text style={styles.itemText}>Área: {entry.workArea}</Text>
                <Text style={styles.itemText}>Capacitación: {entry.training}</Text>
                <Text style={styles.itemText}>Estado al retirar: {entry.condition}</Text>
                {entry.photoUrls && entry.photoUrls.length > 0 ? (
                  <View style={styles.photoSection}>
                    <Text style={styles.photoLabel}>Evidencia fotográfica</Text>
                    <View style={styles.photoRow}>
                      {entry.photoUrls.map((photoUrl, photoIndex) => (
                        <Pressable key={`${entry.id}-photo-${photoIndex}`} onPress={() => setSelectedPhoto({ urls: entry.photoUrls ?? [], index: photoIndex })}>
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.photoThumb}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.photoEmpty}>Sin evidencia fotográfica adjunta.</Text>
                )}
                {entry.training === 'no' && (
                  <Text style={styles.warning}>El uso de esta herramienta requiere autorización especial y capacitación previa.</Text>
                )}

                <TextInput
                  value={comments[entry.id] ?? entry.approvalComment ?? ''}
                  onChangeText={(text) => setComments((current) => ({ ...current, [entry.id]: text }))}
                  placeholder="Comentarios del aprobador"
                  style={styles.commentInput}
                  multiline
                />

                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.actionButton, styles.approveButton, entry.approvalStatus === 'approved' && styles.actionSelectedApproved]}
                    onPress={() => handleDecision(item.id, entry.id, 'approved')}
                  >
                    <Text style={styles.actionText}>Aprobar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton, entry.approvalStatus === 'rejected' && styles.actionSelectedRejected]}
                    onPress={() => handleDecision(item.id, entry.id, 'rejected')}
                  >
                    <Text style={styles.actionText}>Rechazar</Text>
                  </Pressable>
                </View>

                {entry.approvalStatus !== 'pending' && (
                  <Text style={[styles.approvalState, entry.approvalStatus === 'approved' ? styles.approvedState : styles.rejectedState]}>
                    {entry.approvalStatus === 'approved' ? 'Aprobado' : 'Rechazado'}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontWeight: '700',
    color: '#0f172a',
  },
  requestStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  requester: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 4,
  },
  itemBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemTitle: {
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemText: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 2,
  },
  photoSection: {
    marginTop: 10,
    marginBottom: 8,
  },
  photoLabel: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 82,
    height: 82,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  photoEmpty: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 360,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  carouselHeader: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  carouselCounter: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  carouselButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  carouselButtonDisabled: {
    opacity: 0.45,
  },
  carouselButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 14,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  warning: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  commentInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionSelectedApproved: {
    borderWidth: 2,
    borderColor: '#166534',
  },
  actionSelectedRejected: {
    borderWidth: 2,
    borderColor: '#991b1b',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  approvalState: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
  },
  approvedState: {
    color: '#166534',
  },
  rejectedState: {
    color: '#991b1b',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
  },
});
