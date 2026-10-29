import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getUnreadNotificationCount } from '../../services/firebaseService';

const roleLabels: Record<string, string> = {
  solicitante: 'Solicitante',
  jefe_obra: 'Jefe de Obra',
  admin: 'Administrador',
};

export default function TabLayout() {
  const { user, signOut, trackSessionActivity } = useAuth();
  const router = useRouter();
  const [unreadBadge, setUnreadBadge] = useState(0);

  const refreshUnreadBadge = useCallback(async () => {
    if (!user?.uid) {
      setUnreadBadge(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount(user.uid);
      setUnreadBadge(count);
    } catch (error) {
      console.warn('No se pudo cargar el conteo de notificaciones.', error);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadBadge();
      trackSessionActivity();
    }, [refreshUnreadBadge, trackSessionActivity]),
  );

  if (!user) {
    return null;
  }

  const role = user.role;
  const allowedTabs = {
    solicitante: ['dashboard', 'catalog', 'requests', 'returns'],
    jefe_obra: ['dashboard', 'catalog', 'requests', 'approvals', 'deliveries', 'returns', 'reports'],
    admin: ['dashboard', 'catalog', 'requests', 'approvals', 'deliveries', 'returns', 'reports'],
  }[role] as string[];

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const renderTabIcon = (iconName: string, color: string, size: number) => (
    <View style={styles.tabIconWrap}>
      <Ionicons name={iconName as any} size={size} color={color ?? '#64748b'} />
      {unreadBadge > 0 && (
        <View style={styles.badgeDot}>
          <Text style={styles.badgeText}>{unreadBadge > 99 ? '99+' : unreadBadge}</Text>
        </View>
      )}
    </View>
  );

  const tabConfig = [
    {
      name: 'dashboard',
      title: 'Dashboard',
      icon: 'grid-outline',
      badge: unreadBadge > 0 ? unreadBadge : undefined,
    },
    {
      name: 'catalog',
      title: 'Catálogo',
      icon: 'construct-outline',
    },
    {
      name: 'requests',
      title: 'Solicitudes',
      icon: 'document-text-outline',
    },
    {
      name: 'approvals',
      title: 'Aprobación',
      icon: 'checkmark-done-outline',
    },
    {
      name: 'deliveries',
      title: 'Entregas',
      icon: 'cube-outline',
    },
    {
      name: 'returns',
      title: 'Devoluciones',
      icon: 'return-down-back-outline',
    },
    {
      name: 'reports',
      title: 'Reportes',
      icon: 'bar-chart-outline',
    },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => (
          <View style={styles.headerTitleWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{user.fullName}</Text>
              <Text style={styles.headerRole}>{roleLabels[role] ?? role}</Text>
            </View>
          </View>
        ),
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#fff',
        headerRight: () => (
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: '#0f766e',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      {tabConfig
        .filter((tab) => allowedTabs.includes(tab.name))
        .map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarBadge: tab.badge,
              tabBarIcon: ({ color, size }: { color: any; size: number }) => renderTabIcon(tab.icon, color ?? '#64748b', size),
            }}
          />
        ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  headerRole: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  logoutButton: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f97316',
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabIconWrap: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    right: -8,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
