import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { cleanupOrphanToolMovements, createTool, deleteTool, getTools, resetOperationalState, updateTool } from '../../services/firebaseService';
import type { Tool, ToolStatus } from '../../types';

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  loaned: 'Prestada',
  maintenance: 'En reparación',
  out_of_service: 'Fuera de servicio',
};

const statusColors: Record<string, string> = {
  available: '#0f766e',
  loaned: '#2563eb',
  maintenance: '#f59e0b',
  out_of_service: '#ef4444',
};

const statusOptions: Array<'all' | ToolStatus> = ['all', 'available', 'loaned', 'maintenance', 'out_of_service'];

type ToolFormState = {
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: ToolStatus;
  photoLabel: string;
  observations: string;
};

const emptyForm: ToolFormState = {
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'available',
  photoLabel: '🧰',
  observations: '',
};

export default function CatalogScreen() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolStatus>('all');
  const [form, setForm] = useState(emptyForm);
  const [pendingDeleteTool, setPendingDeleteTool] = useState<Tool | null>(null);

  const canManageInventory = user?.role === 'admin';

  const fetchTools = async () => {
    const items = await getTools();
    setTools(items);
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const availableCount = useMemo(() => tools.filter((tool) => tool.status === 'available').length, [tools]);

  useEffect(() => {
    const cleanUp = async () => {
      try {
        const result = await cleanupOrphanToolMovements();
        if (result.removedDeliveries || result.removedReturns) {
          await fetchTools();
        }
      } catch (error) {
        console.warn('No fue posible limpiar movimientos huérfanos.', error);
      }
    };

    cleanUp();
  }, []);

  const filteredTools = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesSearch =
        !normalized ||
        tool.name.toLowerCase().includes(normalized) ||
        tool.category.toLowerCase().includes(normalized) ||
        tool.brand.toLowerCase().includes(normalized) ||
        tool.serialNumber.toLowerCase().includes(normalized);

      const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tools]);

  const handleChange = (field: keyof ToolFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'status' ? (value as ToolStatus) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      Alert.alert('Validación', 'Nombre y categoría son obligatorios.');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      observations: form.observations.trim(),
      photoLabel: form.photoLabel || '🧰',
    };

    if (editingId) {
      await updateTool(editingId, payload);
      Alert.alert('Éxito', 'Herramienta actualizada correctamente.');
    } else {
      await createTool(payload);
      Alert.alert('Éxito', 'Herramienta creada correctamente.');
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    await fetchTools();
  };

  const handleEdit = (tool: Tool) => {
    setEditingId(tool.id);
    setForm({
      name: tool.name,
      category: tool.category,
      brand: tool.brand,
      model: tool.model,
      serialNumber: tool.serialNumber,
      status: tool.status,
      photoLabel: tool.photoLabel ?? '🧰',
      observations: tool.observations,
    });
    setShowForm(true);
  };

  const handleDelete = (tool: Tool) => {
    setPendingDeleteTool(tool);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteTool) {
      return;
    }

    try {
      await deleteTool(pendingDeleteTool.id);
      Alert.alert('Éxito', `La herramienta "${pendingDeleteTool.name}" fue eliminada correctamente.`);
      setPendingDeleteTool(null);
      await fetchTools();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo eliminar la herramienta.');
    }
  };

  const handleResetOperationalState = async () => {
    Alert.alert(
      'Reiniciar flujo operativo',
      'Se eliminarán solicitudes, entregas, devoluciones y notificaciones del sistema. Las herramientas volverán a estar disponibles. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await resetOperationalState();
              Alert.alert(
                'Sistema reiniciado',
                `Se limpiaron ${result.deletedRequests} solicitudes, ${result.deletedDeliveries} entregas, ${result.deletedReturns} devoluciones, ${result.deletedNotifications} notificaciones y ${result.deletedAuditLogs ?? 0} registros de auditoría. ${result.resetTools} herramientas quedaron disponibles.`,
              );
              await fetchTools();
            } catch (error: any) {
              Alert.alert('Error', error?.message ?? 'No se pudo reiniciar el flujo operativo.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Inventario de herramientas</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Herramientas disponibles</Text>
        <Text style={styles.summaryValue}>{availableCount}</Text>
      </View>

      {canManageInventory && (
        <>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm((prev) => !prev);
            }}
          >
            <Text style={styles.primaryButtonText}>{showForm ? 'Cancelar' : '+ Nueva herramienta'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleResetOperationalState}>
            <Text style={styles.secondaryButtonText}>Reiniciar flujo operativo</Text>
          </Pressable>
        </>
      )}

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Buscar y filtrar</Text>
        <TextInput
          placeholder="Buscar por nombre, código, categoría o marca"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Estado</Text>
        <View style={styles.statusGrid}>
          {statusOptions.map((value) => {
            const label = value === 'all' ? 'Todos' : statusLabels[value];
            const selected = statusFilter === value;

            return (
              <Pressable
                key={value}
                onPress={() => setStatusFilter(value)}
                style={[styles.statusButton, selected && styles.statusButtonActive]}
              >
                <Text style={[styles.statusButtonText, selected && styles.statusButtonTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Editar herramienta' : 'Registrar herramienta'}</Text>

          <TextInput placeholder="Nombre" value={form.name} onChangeText={(value) => handleChange('name', value)} style={styles.input} />
          <TextInput placeholder="Categoría" value={form.category} onChangeText={(value) => handleChange('category', value)} style={styles.input} />
          <TextInput placeholder="Marca" value={form.brand} onChangeText={(value) => handleChange('brand', value)} style={styles.input} />
          <TextInput placeholder="Modelo" value={form.model} onChangeText={(value) => handleChange('model', value)} style={styles.input} />
          <TextInput placeholder="Código" value={form.serialNumber} onChangeText={(value) => handleChange('serialNumber', value)} style={styles.input} />

          <Text style={styles.fieldLabel}>Estado</Text>
          <View style={styles.statusGrid}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <Pressable
                key={value}
                style={[styles.statusButton, form.status === value && styles.statusButtonActive]}
                onPress={() => handleChange('status', value)}
              >
                <Text style={[styles.statusButtonText, form.status === value && styles.statusButtonTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput placeholder="Icono / emoji de referencia" value={form.photoLabel} onChangeText={(value) => handleChange('photoLabel', value)} style={styles.input} />
          <TextInput placeholder="Observaciones" value={form.observations} onChangeText={(value) => handleChange('observations', value)} multiline style={[styles.input, styles.textArea]} />

          <Pressable style={styles.saveButton} onPress={handleSubmit}>
            <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Registrar herramienta'}</Text>
          </Pressable>
        </View>
      )}

      {pendingDeleteTool && (
        <View style={styles.confirmDeleteBox}>
          <Text style={styles.confirmDeleteTitle}>¿Seguro que deseas eliminar esta herramienta?</Text>
          <Text style={styles.confirmDeleteText}>{pendingDeleteTool.name}</Text>
          <View style={styles.confirmDeleteActions}>
            <Pressable style={styles.cancelDeleteButton} onPress={() => setPendingDeleteTool(null)}>
              <Text style={styles.cancelDeleteText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmDeleteButton} onPress={confirmDelete}>
              <Text style={styles.confirmDeleteButtonText}>Confirmar eliminación</Text>
            </Pressable>
          </View>
        </View>
      )}

      {filteredTools.length ? (
        filteredTools.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <Text style={styles.toolName}>{item.name}</Text>
                <Text style={styles.meta}>{item.category}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColors[item.status] ?? '#475569'}20` }] }>
                <Text style={[styles.status, { color: statusColors[item.status] ?? '#475569' }]}>{statusLabels[item.status] ?? item.status}</Text>
              </View>
            </View>

            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageText}>{item.photoLabel ?? '🧰'}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Código</Text>
              <Text style={styles.metaValue}>{item.serialNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Marca</Text>
              <Text style={styles.metaValue}>{item.brand || 'Sin marca'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Modelo</Text>
              <Text style={styles.metaValue}>{item.model || 'Sin modelo'}</Text>
            </View>
            <Text style={styles.observations}>{item.observations || 'Sin observaciones.'}</Text>

            {canManageInventory && (
              <View style={styles.actionsRow}>
                <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
                  <Text style={styles.actionText}>Eliminar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No hay herramientas con ese filtro</Text>
          <Text style={styles.emptyStateText}>Prueba con otro término de búsqueda o cambia el estado.</Text>
        </View>
      )}
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
  summaryBox: {
    backgroundColor: '#ecfeff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  summaryLabel: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f766e',
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: '#b45309',
    fontWeight: '700',
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0f172a',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  statusButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
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
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  toolName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  status: {
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageText: {
    fontSize: 42,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  observations: {
    marginTop: 10,
    color: '#334155',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  editButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  confirmDeleteBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 14,
  },
  confirmDeleteTitle: {
    color: '#881337',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  confirmDeleteText: {
    color: '#4c0519',
    fontSize: 14,
    marginBottom: 12,
  },
  confirmDeleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelDeleteButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelDeleteText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#475569',
    textAlign: 'center',
  },
});
