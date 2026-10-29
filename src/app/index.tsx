import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoleFromDeepLink } from '../utils/quickAccess';

export default function Index() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const handleIncomingLink = (url: string | null) => {
      const role = getRoleFromDeepLink(url);

      if (role === 'solicitante') {
        signIn('solicitante');
        router.replace('/(tabs)/dashboard');
        return;
      }

      if (user) {
        router.replace('/(tabs)/dashboard');
        return;
      }

      router.replace('/(auth)/login');
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingLink(url);
    });

    const resolveInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        handleIncomingLink(initialUrl);
      } finally {
        setIsResolving(false);
      }
    };

    resolveInitialUrl();

    return () => {
      subscription.remove();
    };
  }, [router, signIn, user]);

  if (isResolving) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
