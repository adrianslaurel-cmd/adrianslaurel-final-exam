import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function EmptyView({
  title,
  message,
  icon = 'file-tray-outline',
}: {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={COLORS.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={44} color={COLORS.danger} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function UnauthorizedView({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name="lock-closed-outline" size={48} color={COLORS.warning} />
      <Text style={styles.title}>Unauthorized</Text>
      <Text style={styles.text}>{message ?? 'You do not have permission to open this page.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 240 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 14, textAlign: 'center' },
  text: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  retry: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: { color: COLORS.primary, fontWeight: '700' },
});
