import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAllRequests } from '../../services/firebaseService';
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

export default function ReportsScreen() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterTool, setFilterTool] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      const allRequests = await getAllRequests();
      setRequests(allRequests);
    };

    load();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const projectMatch = !filterProject || (request.projectName ?? '').toLowerCase().includes(filterProject.toLowerCase());
      const toolMatch = !filterTool || request.items.some((item) => item.toolName.toLowerCase().includes(filterTool.toLowerCase()));
      const workerMatch = !filterWorker || request.requesterName.toLowerCase().includes(filterWorker.toLowerCase());
      const statusMatch = statusFilter === 'all' || request.status === statusFilter;
      return projectMatch && toolMatch && workerMatch && statusMatch;
    });
  }, [requests, filterProject, filterTool, filterWorker, statusFilter]);

  const totalLoans = filteredRequests.reduce((sum, request) => sum + request.items.length, 0);
  const approved = filteredRequests.filter((request) => request.status === 'approved').length;
  const pending = filteredRequests.filter((request) => request.status === 'pending').length;
  const rejected = filteredRequests.filter((request) => request.status === 'rejected').length;

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reportes</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen del período</Text>
        <Text style={styles.metric}>Préstamos totales: {totalLoans}</Text>
        <Text style={styles.metric}>Solicitudes aprobadas: {approved}</Text>
        <Text style={styles.metric}>Solicitudes pendientes: {pending}</Text>
        <Text style={styles.metric}>Solicitudes rechazadas: {rejected}</Text>
      </View>

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
