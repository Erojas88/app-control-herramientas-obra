import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { mockRequests, mockTools } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { addToolRequest, getRequestsByUser, getTools } from '../../services/firebaseService';
import type { Tool, ToolRequest } from '../../types';

const emptyForm = {
  purpose: '',
  workArea: '',
  dueDate: '',
  quantity: '1',
  training: 'yes',
  condition: 'Good',
};

export default function RequestsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [toolCatalog, setToolCatalog] = useState<Tool[]>(mockTools);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const [tools, userRequests] = await Promise.all([
        getTools(),
        getRequestsByUser(user.uid),
      ]);

      setToolCatalog(tools);
      setRequests(userRequests.length ? userRequests : mockRequests.filter((request) => request.requesterUid === user.uid));
    };

    loadData();
  }, [user]);

  const availableTools = useMemo(
    () => toolCatalog.filter((tool) => tool.status === 'available'),
    [toolCatalog],
  );

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((current) =>
      current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId],
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión para registrar una solicitud.');
      return;
    }

    if (!selectedToolIds.length) {
      Alert.alert('Sin herramientas', 'Selecciona al menos una herramienta disponible.');
      return;
    }

    if (!form.purpose.trim() || !form.workArea.trim() || !form.dueDate) {
      Alert.alert('Faltan datos', 'Completa el motivo, área de trabajo y fecha estimada de devolución.');
      return;
    }

    const trainingValue = form.training as 'yes' | 'no' | 'n/a';
    const conditionValue = form.condition as 'Excellent' | 'Good' | 'Regular' | 'Damaged';
    const requestId = `REQ-${Date.now()}`;

    const newRequest: ToolRequest = {
      id: requestId,
      requesterUid: user.uid,
      requesterName: user.fullName,
      role: user.role,
      company: user.company,
      projectName: user.projectName ?? 'Proyecto San Martín',
      createdAt: new Date().toISOString(),
      status: 'pending',
      items: selectedToolIds.map((toolId) => {
        const tool = toolCatalog.find((entry) => entry.id === toolId);
        return {
          id: `IT-${Date.now()}-${toolId}`,
          requestId,
          toolId,
          toolName: tool?.name ?? 'Herramienta',
          quantity: Number(form.quantity) || 1,
          purpose: form.purpose,
          workArea: form.workArea,
          dueDate: form.dueDate,
          training: trainingValue,
          condition: conditionValue,
          approvalStatus: 'pending',
        };
      }),
    };

    const savedRequestId = await addToolRequest(newRequest);
    const finalizedRequest: ToolRequest = {
      ...newRequest,
      id: savedRequestId,
      items: newRequest.items.map((item) => ({ ...item, requestId: savedRequestId })),
    };

    setRequests((current) => [finalizedRequest, ...current]);
    setSelectedToolIds([]);
    setForm(emptyForm);
    Alert.alert('Solicitud enviada', 'La solicitud fue registrada y se notificó al Jefe de Obra. Queda pendiente de aprobación.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Solicitudes</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Nueva solicitud</Text>

        <Text style={styles.label}>Solicitante</Text>
        <TextInput
          value={user?.fullName ?? 'Sin sesión'}
          editable={false}
          style={[styles.input, styles.disabledInput]}
        />

        <Text style={styles.label}>Proyecto</Text>
        <TextInput
          value={user?.projectName ?? 'Proyecto San Martín'}
          editable={false}
          style={[styles.input, styles.disabledInput]}
        />

        <Text style={styles.label}>Herramientas disponibles</Text>
        <View style={styles.chipGroup}>
          {availableTools.map((tool) => {
            const selected = selectedToolIds.includes(tool.id);
            return (
              <Pressable
                key={tool.id}
                onPress={() => toggleTool(tool.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tool.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Cantidad</Text>
        <TextInput
          value={form.quantity}
          onChangeText={(value) => setForm((current) => ({ ...current, quantity: value }))}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Motivo de uso</Text>
        <TextInput
          value={form.purpose}
          onChangeText={(value) => setForm((current) => ({ ...current, purpose: value }))}
          style={styles.input}
          placeholder="Ej. instalación de estructura metálica"
        />

        <Text style={styles.label}>Área de trabajo</Text>
        <TextInput
          value={form.workArea}
          onChangeText={(value) => setForm((current) => ({ ...current, workArea: value }))}
          style={styles.input}
          placeholder="Patio de obra / nivel 2"
        />

        <Text style={styles.label}>Fecha estimada de devolución</Text>
        <TextInput
          value={form.dueDate}
          onChangeText={(value) => setForm((current) => ({ ...current, dueDate: value }))}
          style={styles.input}
          placeholder="2026-10-30"
        />

        <Text style={styles.label}>¿Ha recibido capacitación?</Text>
        <View style={styles.rowOptions}>
          {(['yes', 'no', 'n/a'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setForm((current) => ({ ...current, training: option }))}
              style={[styles.option, form.training === option && styles.optionSelected]}
            >
              <Text style={[styles.optionText, form.training === option && styles.optionTextSelected]}>{option === 'yes' ? 'Sí' : option === 'no' ? 'No' : 'No aplica'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Estado al retirar</Text>
        <View style={styles.rowOptions}>
          {(['Excellent', 'Good', 'Regular', 'Damaged'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setForm((current) => ({ ...current, condition: option }))}
              style={[styles.option, form.condition === option && styles.optionSelected]}
            >
              <Text style={[styles.optionText, form.condition === option && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        {form.training === 'no' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>El uso de esta herramienta requiere autorización especial y capacitación previa.</Text>
          </View>
        )}

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Registrar solicitud</Text>
        </Pressable>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Historial de solicitudes</Text>
        {requests.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.requestId}>{item.id}</Text>
              <Text style={[styles.status, item.status === 'approved' ? styles.approved : styles.pending]}>{item.status}</Text>
            </View>
            <Text style={styles.requester}>{item.requesterName}</Text>
            <Text style={styles.meta}>{item.projectName} · {item.company}</Text>
            <Text style={styles.meta}>Fecha: {item.createdAt}</Text>

            {item.items.map((entry) => (
              <View key={entry.id} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{entry.toolName}</Text>
                <Text style={styles.itemText}>Cantidad: {entry.quantity}</Text>
                <Text style={styles.itemText}>Motivo: {entry.purpose}</Text>
                <Text style={styles.itemText}>Capacitación: {entry.training}</Text>
                <Text style={styles.itemText}>Estado: {entry.condition}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  label: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  rowOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: '#ecfeff',
    borderColor: '#0f766e',
  },
  optionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#0f766e',
  },
  warningBox: {
    marginTop: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warningText: {
    color: '#9a4d00',
    fontWeight: '600',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  listSection: {
    marginTop: 8,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontWeight: '700',
    color: '#0f172a',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  approved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  requester: {
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
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  itemTitle: {
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  itemText: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 2,
  },
});
