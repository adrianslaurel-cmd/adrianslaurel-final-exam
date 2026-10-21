import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { listEvents } from '@/lib/events';
import { useLoader } from '@/lib/useLoader';

export default function StudentHome() {
  const { profile } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useLoader(() => listEvents('open'));

  const header = (
    <View>
      <Text style={styles.greeting}>Hi, {profile?.full_name?.split(' ')[0] || 'Student'} 👋</Text>
      <Text style={styles.subtitle}>Open events you can attend. Scan the event QR code to record attendance.</Text>
      <AppButton theme="primary" title="Scan QR Code" icon="qr-code-outline" onPress={() => router.push('/scan')} />
      <Text style={styles.section}>Available Events</Text>
    </View>
  );

  if (loading) return <LoadingView label="Loading events..." />;

  return (
    <View style={styles.container}>
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyView
              title="No open events"
              message="There are no events to attend right now. Pull down to refresh."
              icon="calendar-outline"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginTop: 4, marginBottom: 18 },
  section: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, marginTop: 6 },
});
