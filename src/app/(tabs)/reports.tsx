import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getAllRequests, getEffectiveRequestStatus, resetOperationalState } from '../../services/firebaseService';
import type { ToolRequest } from '../../types';

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
};

const exportCsv = (rows: ToolRequest[]) => {
  const headers = ['ID', 'Solicitante', 'Proyecto', 'Herramienta', 'Cantidad', 'Estado', 'Aprobador', 'Fecha de solicitud'];
  const csvRows = rows.flatMap((request) =>
    request.items.map((item) => [
      request.id,
      request.requesterName,
      request.projectName ?? '',
      item.toolName,
      String(item.quantity),
      request.status,
      item.approverName ?? request.approverName ?? 'Sin aprobación',
      formatDate(request.createdAt),
    ]),
  );

  const csv = [headers, ...csvRows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csv;
};

const exportPdf = (rows: ToolRequest[]) => {
  const lines = rows.flatMap((request) =>
    request.items.map((item) => `- ${request.requesterName} | ${request.projectName ?? 'Sin proyecto'} | ${item.toolName} | ${request.status} | ${item.approverName ?? request.approverName ?? 'Sin aprobación'} | ${formatDate(request.createdAt)}`),
  );

  const content = [
    'Reporte de herramientas',
    '=====================',
    ...lines,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reportes-herramientas.pdf';
  a.click();
  URL.revokeObjectURL(url);
};

const isAdminRole = (role?: string) => {
  const normalized = String(role ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ['admin', 'administrador', 'adminobra', 'admin obra', 'admin_obra', 'administrador obra', 'administrador de obra'].includes(normalized);
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterTool, setFilterTool] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const canManageInventory = isAdminRole(user?.role);

  const loadRequests = async () => {
    const allRequests = await getAllRequests();
    setRequests(allRequests);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const effectiveStatus = getEffectiveRequestStatus(request);
      const projectMatch = !filterProject || (request.projectName ?? '').toLowerCase().includes(filterProject.toLowerCase());
      const toolMatch = !filterTool || request.items.some((item) => item.toolName.toLowerCase().includes(filterTool.toLowerCase()));
      const workerMatch = !filterWorker || request.requesterName.toLowerCase().includes(filterWorker.toLowerCase());
      const statusMatch = statusFilter === 'all' || effectiveStatus === statusFilter;
      return projectMatch && toolMatch && workerMatch && statusMatch;
    });
  }, [requests, filterProject, filterTool, filterWorker, statusFilter]);

  const totalLoans = filteredRequests.reduce((sum, request) => sum + request.items.length, 0);
  const approved = filteredRequests.filter((request) => getEffectiveRequestStatus(request) === 'approved').length;
  const pending = filteredRequests.filter((request) => getEffectiveRequestStatus(request) === 'pending').length;
  const rejected = filteredRequests.filter((request) => getEffectiveRequestStatus(request) === 'rejected').length;

  const handleExport = (type: 'excel' | 'pdf') => {
    if (!filteredRequests.length) {
      Alert.alert('Sin datos', 'No hay registros que exportar con los filtros actuales.');
      return;
    }

    if (type === 'excel') {
      const csv = exportCsv(filteredRequests);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reportes-herramientas-excel.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    exportPdf(filteredRequests);
  };

  const handleResetOperationalState = () => {
    console.log('Reset action triggered', { role: user?.role, canManageInventory });

    if (!canManageInventory) {
      Alert.alert('Acceso denegado', 'Solo el rol de Administrador puede reiniciar el sistema a cero.');
      return;
    }

    setShowResetConfirm(true);
  };

  const confirmResetOperationalState = async () => {
    try {
      console.log('Executing resetOperationalState');
      setIsResetting(true);
      setShowResetConfirm(false);
      setRequests([]);
      const result = await resetOperationalState();
      console.log('Reset result', result);
      Alert.alert(
        'Sistema reiniciado',
        `Se limpiaron ${result.deletedRequests} solicitudes, ${result.deletedDeliveries} entregas, ${result.deletedReturns} devoluciones, ${result.deletedNotifications} notificaciones y ${result.deletedAuditLogs ?? 0} registros de auditoría. ${result.resetTools} herramientas quedaron disponibles.`,
      );
      await loadRequests();
    } catch (error: any) {
      console.error('Reset failure', error);
      Alert.alert('Error', error?.message ?? 'No se pudo reiniciar el flujo operativo.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reportes</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen del período</Text>
        <Text style={styles.metric}>Préstamos totales: {totalLoans}</Text>
        <Text style={styles.metric}>Solicitudes aprobadas: {approved}</Text>
        <Text style={styles.metric}>Solicitudes pendientes: {pending}</Text>
        <Text style={styles.metric}>Solicitudes rechazadas: {rejected}</Text>

        {canManageInventory && (
          <Pressable
            style={styles.resetButton}
            onPress={() => { void handleResetOperationalState(); }}
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>Reiniciar a 0</Text>
          </Pressable>
        )}
      </View>

      {showResetConfirm && (
        <View style={styles.confirmOverlay} pointerEvents="auto">
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Reiniciar a 0</Text>
            <Text style={styles.confirmText}>Esto dejará en cero las solicitudes, entregas, devoluciones y notificaciones del sistema. ¿Deseas continuar?</Text>
            <View style={styles.confirmActions}>
              <Pressable style={[styles.confirmButton, styles.cancelButton]} onPress={() => setShowResetConfirm(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, styles.confirmDangerButton, isResetting && styles.confirmDisabledButton]}
                onPress={() => { void confirmResetOperationalState(); }}
                disabled={isResetting}
              >
                <Text style={styles.confirmDangerText}>{isResetting ? 'Reiniciando...' : 'Reiniciar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filtros</Text>
        <TextInput value={filterProject} onChangeText={setFilterProject} placeholder="Proyecto" style={styles.input} />
        <TextInput value={filterTool} onChangeText={setFilterTool} placeholder="Herramienta" style={styles.input} />
        <TextInput value={filterWorker} onChangeText={setFilterWorker} placeholder="Trabajador" style={styles.input} />
        <Text style={styles.label}>Estado</Text>
        <View style={styles.statusRow}>
          {['all', 'pending', 'approved', 'rejected'].map((option) => (
            <Pressable
              key={option}
              onPress={() => setStatusFilter(option)}
              style={[styles.chip, statusFilter === option && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === option && styles.chipTextActive]}>
                {option === 'all' ? 'Todos' : option === 'pending' ? 'Pendientes' : option === 'approved' ? 'Aprobados' : 'Rechazados'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Historial completo</Text>
        {filteredRequests.length === 0 ? (
          <Text style={styles.emptyText}>No hay solicitudes para mostrar con los filtros actuales.</Text>
        ) : (
          filteredRequests.map((request) => {
            const effectiveStatus = getEffectiveRequestStatus(request);
            return (
              <View key={request.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyId}>{request.id}</Text>
                  <Text style={[styles.historyStatus, effectiveStatus === 'approved' ? styles.approved : effectiveStatus === 'rejected' ? styles.rejected : styles.pending]}>
                    {effectiveStatus === 'approved' ? 'Aprobada' : effectiveStatus === 'rejected' ? 'Rechazada' : 'Pendiente'}
                  </Text>
                </View>

                <Text style={styles.historyWorker}>{request.requesterName}</Text>
                <Text style={styles.historyMeta}>{request.projectName ?? 'Sin proyecto'} · {request.company}</Text>
                <Text style={styles.historyMeta}>Fecha: {formatDate(request.createdAt)}</Text>
                {request.guestSessionId ? <Text style={styles.historyMeta}>Origen: sesión pública/guest</Text> : null}

                {request.items.map((item) => (
                  <View key={item.id} style={styles.itemBox}>
                    <Text style={styles.itemTitle}>{item.toolName}</Text>
                    <Text style={styles.itemText}>Cantidad: {item.quantity}</Text>
                    <Text style={styles.itemText}>Motivo: {item.purpose}</Text>
                    <Text style={styles.itemText}>Área: {item.workArea}</Text>
                    <Text style={styles.itemText}>Estado del item: {item.approvalStatus === 'approved' ? 'Aprobada' : item.approvalStatus === 'rejected' ? 'Rechazada' : 'Pendiente'}</Text>
                    {item.approvalComment ? <Text style={styles.itemText}>Comentario del jefe: {item.approvalComment}</Text> : null}

                    {Array.isArray(item.photoUrls) && item.photoUrls.length > 0 ? (
                      <View style={styles.photoGrid}>
                        {item.photoUrls.map((photoUrl, photoIndex) => (
                          <Image key={`${item.id}-${photoIndex}`} source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exportar</Text>
        <Pressable style={styles.exportButton} onPress={() => handleExport('excel')}>
          <Text style={styles.exportText}>Excel</Text>
        </Pressable>
        <Pressable style={[styles.exportButton, styles.pdfButton]} onPress={() => handleExport('pdf')}>
          <Text style={styles.exportText}>PDF</Text>
        </Pressable>
      </View>
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
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  metric: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 6,
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
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  chipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: '#fff',
  },
  historyCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyId: {
    fontWeight: '700',
    color: '#0f172a',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  rejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  pending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  historyWorker: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  historyMeta: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 2,
  },
  emptyText: {
    color: '#475569',
    fontSize: 13,
  },
  itemBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemTitle: {
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemText: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  resetButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  confirmTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 110,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  confirmDangerButton: {
    backgroundColor: '#b91c1c',
  },
  confirmDisabledButton: {
    opacity: 0.7,
  },
  confirmDangerText: {
    color: '#fff',
    fontWeight: '700',
  },
  exportButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  pdfButton: {
    backgroundColor: '#1d4ed8',
  },
  exportText: {
    color: '#fff',
    fontWeight: '700',
  },
});
