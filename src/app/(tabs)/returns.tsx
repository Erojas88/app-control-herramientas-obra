import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getApprovedRequestsForDelivery, recordToolReturn } from '../../services/firebaseService';
import type { ToolRequest } from '../../types';

export default function ReturnsScreen() {
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

  const returnItems = useMemo(
    () =>
      requests.flatMap((request) =>
        request.items
          .filter((item) => item.approvalStatus === 'approved')
          .map((item) => ({ request, item })),
      ),
    [requests],
  );

  const handleRegisterReturn = async (request: ToolRequest, item: ToolRequest['items'][number]) => {
    if (!user) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión para registrar devoluciones.');
      return;
    }

    setLoading(true);
    try {
      const hasDamage = item.condition === 'Damaged';
      await recordToolReturn({
        requestId: request.id,
        requesterUid: request.requesterUid,
        requesterName: request.requesterName,
        toolId: item.toolId,
        toolName: item.toolName,
        status: item.condition ?? 'Good',
        observations: observations[item.id] ?? '',
        photos: [],
        reportedDamage: hasDamage,
      });

      if (hasDamage) {
        Alert.alert('Daño detectado', 'Se generó la alerta al Jefe de Obra y se registró la devolución con daño.');
      } else {
        Alert.alert('Devolución registrada', `Se registró la devolución de ${item.toolName}.`);
      }

      setObservations((current) => ({ ...current, [item.id]: '' }));
      setRequests((current) => current.filter((entry) => entry.id !== request.id));
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la devolución.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Devoluciones</Text>
      <Text style={styles.subtitle}>Registrar entrega final y condición al devolver la herramienta.</Text>

      {returnItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sin devoluciones pendientes</Text>
          <Text style={styles.emptyText}>Las herramientas entregadas aparecerán aquí para registrar la devolución.</Text>
        </View>
      ) : (
        returnItems.map(({ request, item }) => (
          <View key={`${request.id}-${item.id}`} style={styles.card}>
            <Text style={styles.requestTitle}>{request.requesterName}</Text>
            <Text style={styles.meta}>{request.projectName} · {request.company}</Text>
            <Text style={styles.meta}>Solicitud: {request.id}</Text>

            <View style={styles.itemBox}>
              <Text style={styles.itemName}>{item.toolName}</Text>
              <Text style={styles.itemText}>Cantidad: {item.quantity}</Text>
              <Text style={styles.itemText}>Motivo: {item.purpose}</Text>
              <Text style={styles.itemText}>Estado al devolver: {item.condition}</Text>

              {item.condition === 'Damaged' && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>Se solicita descripción detallada del daño y fotografías adicionales.</Text>
                </View>
              )}

              <TextInput
                value={observations[item.id] ?? ''}
                onChangeText={(text) => setObservations((current) => ({ ...current, [item.id]: text }))}
                placeholder="Observaciones de devolución"
                multiline
                style={styles.input}
              />

              <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => handleRegisterReturn(request, item)}>
                <Text style={styles.buttonText}>Registrar devolución</Text>
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
  warningBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 8,
    marginBottom: 10,
  },
  warningText: {
    color: '#9a4d00',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#f97316',
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
