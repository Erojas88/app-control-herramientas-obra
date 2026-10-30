import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithEmailAndPassword } from '../../services/firebaseAuthService';
import { useAuth } from '../../context/AuthContext';
import { buildRequesterAccessUrl } from '../../utils/quickAccess';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, signIn } = useAuth();
  const [email, setEmail] = useState('solicitante@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const result = await loginWithEmailAndPassword(email, password);
    setLoading(false);

    if (!result.ok || !result.user) {
      Alert.alert('Error de acceso', result.error ?? 'No se pudo iniciar sesión.');
      return;
    }

    setUser(result.user);
    router.replace('/(tabs)/dashboard');
  };

  const handleQuickSolicitanteAccess = () => {
    signIn('solicitante');
    router.replace('/(tabs)/dashboard');
  };

  const handlePublicSolicitanteAccess = () => {
    router.push('/solicitante');
  };

  const requesterAccessUrl = buildRequesterAccessUrl();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrap}>
        <View style={styles.brandPanel}>
          <Text style={styles.brandBadge}>OBRA</Text>
          <Text style={styles.title}>Control de herramientas</Text>
          <Text style={styles.subtitle}>Gestión, autorización y trazabilidad de equipos</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Inicia sesión</Text>

          <Text style={styles.label}>Correo</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="usuario@empresa.com"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="••••••••"
          />

          <Pressable style={[styles.button, loading && styles.buttonDisabled]} disabled={loading} onPress={handleLogin}>
            <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleQuickSolicitanteAccess}>
            <Text style={styles.secondaryButtonText}>Entrar como solicitante</Text>
          </Pressable>

          <Pressable style={[styles.secondaryButton, styles.webButton]} onPress={handlePublicSolicitanteAccess}>
            <Text style={styles.secondaryButtonText}>Abrir formulario público del solicitante</Text>
          </Pressable>

          <Text style={styles.quickAccessHint}>QR de acceso rápido: {requesterAccessUrl}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: 20,
  },
  contentWrap: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  brandPanel: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandBadge: {
    backgroundColor: '#0f766e',
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 18,
  },
  label: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  webButton: {
    backgroundColor: '#ecfeff',
    borderColor: '#67e8f9',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  quickAccessHint: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
});
