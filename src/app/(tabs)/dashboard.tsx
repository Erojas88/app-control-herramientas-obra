import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { getDashboardSummary, getNotificationsByUser, getTools, markNotificationsAsRead } from '../../services/firebaseService';
import { buildRequesterAccessUrl } from '../../utils/quickAccess';

const emptySummary = {
  totalInventory: 0,
  available: 0,
  loaned: 0,
  overdue: 0,
  damaged: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  totalLoans: 0,
  topTools: [] as string[],
  topWorkers: [] as string[],
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [tools, setTools] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [summary, setSummary] = useState(emptySummary);

  useEffect(() => {
    const loadDashboard = async () => {
      const [toolList, dashboardSummary] = await Promise.all([
        getTools(),
        getDashboardSummary(),
      ]);

      setTools(toolList);
      setSummary(dashboardSummary);

      if (user?.uid) {
        const userNotifications = await getNotificationsByUser(user.uid);
        setNotifications(userNotifications);
        await markNotificationsAsRead(user.uid);
      }
    };

    loadDashboard();
  }, [user?.uid]);

  const dashboardSummary = summary;

  const cards = useMemo(() => [
    { label: 'Inventario', value: dashboardSummary.totalInventory, tone: '#334155' },
    { label: 'Disponible', value: dashboardSummary.available, tone: '#0f766e' },
    { label: 'Prestadas', value: dashboardSummary.loaned, tone: '#2563eb' },
    { label: 'Vencidas', value: dashboardSummary.overdue, tone: '#f59e0b' },
    { label: 'Dañadas', value: dashboardSummary.damaged, tone: '#ef4444' },
  ], [dashboardSummary]);

  const pendingCount = dashboardSummary.pending;
  const rejectedCount = dashboardSummary.rejected;
  const requesterAccessUrl = buildRequesterAccessUrl();

  const topTools = dashboardSummary.topTools.length ? dashboardSummary.topTools : ['Sin datos aún'];
  const topWorkers = dashboardSummary.topWorkers.length ? dashboardSummary.topWorkers : ['Sin datos aún'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Panel General</Text>
      <Text style={styles.subtitle}>{user?.role ? `Rol: ${user.role}` : 'Jefe de obra'} · Proyecto Jardín Botanico</Text>

      {user?.role === 'admin' && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Acceso directo para solicitantes</Text>
          <Text style={styles.qrDescription}>Escanea este QR para abrir la app en modo solicitante y crear solicitudes de herramientas.</Text>
          <View style={styles.qrWrapper}>
            <QRCode value={requesterAccessUrl} size={180} backgroundColor="#ffffff" color="#0f172a" />
          </View>
          <Text style={styles.qrUrl}>{requesterAccessUrl}</Text>
        </View>
      )}

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.card, { borderTopColor: card.tone }]}> 
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={[styles.cardValue, { color: card.tone }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Indicadores principales</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Solicitudes pendientes</Text>
          <Text style={styles.metricValue}>{pendingCount}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Solicitudes rechazadas</Text>
          <Text style={styles.metricValue}>{rejectedCount}</Text>
        </View>
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Herramientas más usadas</Text>
        {topTools.map((tool, index) => (
          <Text key={tool + index} style={styles.listItem}>{index + 1}. {tool}</Text>
        ))}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Trabajadores destacados</Text>
        {topWorkers.map((worker, index) => (
          <Text key={worker + index} style={styles.listItem}>{index + 1}. {worker}</Text>
        ))}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        {notifications.length ? notifications.map((notification) => (
          <View key={notification.id} style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.body}</Text>
          </View>
        )) : (
          <Text style={styles.notificationBody}>No hay notificaciones para este usuario.</Text>
        )}
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
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderTopWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 30,
    fontWeight: '700',
  },
  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  qrDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    alignSelf: 'center',
  },
  qrUrl: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  metricLabel: {
    color: '#475569',
    fontSize: 14,
  },
  metricValue: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  listItem: {
    fontSize: 14,
    color: '#334155',
    paddingVertical: 4,
  },
  notificationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  notificationTitle: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 14,
  },
  notificationBody: {
    color: '#475569',
    fontSize: 13,
    marginTop: 4,
  },
});
