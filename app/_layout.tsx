import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { initAuth, useAuth } from '@/lib/auth';

const stackHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.textPrimary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
} as const;

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  // EVENT: app started -> restore the saved session & subscribe to auth changes
  useEffect(() => {
    initAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const path = segments[0] as string | undefined;
  const inAuthGroup = path === 'login' || path === 'register';

  // Redirect BEFORE rendering the Stack (protects every screen, not only the tabs)
  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/[id]" options={{ ...stackHeader, title: 'Event' }} />
      <Stack.Screen name="event/form" options={{ ...stackHeader, title: 'Event' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
