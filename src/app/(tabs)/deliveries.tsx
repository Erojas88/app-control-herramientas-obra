import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getApprovedRequestsForDelivery, recordToolDelivery } from '../../services/firebaseService';
import type { ToolRequest } from '../../types';

export default function DeliveriesScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadApproved = async () => {
      const approved = await getApprovedRequestsForDelivery();
      setRequests(approved);
    };

    loadApproved();
  }, []);

  const approvedItems = useMemo(
    () =>
      requests.flatMap((request) =>
        request.items
          .filter((item) => item.approvalStatus === 'approved')
          .map((item) => ({ request, item })),
      ),
    [requests],
  );

  const handleRegisterDelivery = async (request: ToolRequest, item: ToolRequest['items'][number]) => {
    if (!user) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión para registrar entregas.');
      return;
    }

    setLoading(true);
    try {
      await recordToolDelivery({
        requestId: request.id,
        requesterUid: request.requesterUid,
        requesterName: request.requesterName,
        toolId: item.toolId,
        toolName: item.toolName,
        status: item.condition ?? 'Excellent',
        observations: observations[item.id] ?? '',
        photos: [],
      });

      Alert.alert('Entrega registrada', `Se registró la entrega de ${item.toolName}.`);
      setObservations((current) => ({ ...current, [item.id]: '' }));
      setRequests((current) => current.filter((entry) => entry.id !== request.id));
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la entrega.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Entregas</Text>
      <Text style={styles.subtitle}>Registro oficial de entrega de herramientas aprobadas.</Text>

      {approvedItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No hay entregas pendientes</Text>
          <Text style={styles.emptyText}>Las herramientas aprobadas aparecerán aquí cuando se puedan entregar.</Text>
        </View>
      ) : (
        approvedItems.map(({ request, item }) => (
          <View key={`${request.id}-${item.id}`} style={styles.card}>
            <Text style={styles.requestTitle}>{request.requesterName}</Text>
            <Text style={styles.meta}>{request.projectName} · {request.company}</Text>
            <Text style={styles.meta}>Solicitud: {request.id}</Text>

            <View style={styles.itemBox}>
              <Text style={styles.itemName}>{item.toolName}</Text>
              <Text style={styles.itemText}>Cantidad: {item.quantity}</Text>
              <Text style={styles.itemText}>Motivo: {item.purpose}</Text>
              <Text style={styles.itemText}>Área: {item.workArea}</Text>
              <Text style={styles.itemText}>Estado al salir: {item.condition}</Text>

              <TextInput
                value={observations[item.id] ?? ''}
                onChangeText={(text) => setObservations((current) => ({ ...current, [item.id]: text }))}
                placeholder="Observaciones de entrega"
                multiline
                style={styles.input}
              />

              <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => handleRegisterDelivery(request, item)}>
                <Text style={styles.buttonText}>Registrar entrega</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
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
  requestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    marginTop: 4,
  },
  itemBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  itemText: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 12,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
