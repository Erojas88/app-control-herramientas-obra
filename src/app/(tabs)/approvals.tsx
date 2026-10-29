import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { mockRequests } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { getPendingRequestsForApproval, updateToolRequestItemApproval } from '../../services/firebaseService';
import type { ToolRequest, ToolRequestItem } from '../../types';

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>(mockRequests);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadPending = async () => {
      const pending = await getPendingRequestsForApproval();
      if (pending.length) {
        setRequests(pending);
      }
    };

    loadPending();
  }, []);

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

  return (
    <View style={styles.container}>
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
