import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import RoleGate from '@/components/RoleGate';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { listEvents } from '@/lib/events';
import { useLoader } from '@/lib/useLoader';

type Filter = 'all' | 'open' | 'closed';

function EventsInner() {
  const { user, role } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, loading, refreshing, refresh, reload } = useLoader(() =>
    listEvents(role === 'admin' ? 'all' : 'mine', user?.id)
  );

  if (loading) return <LoadingView label="Loading events..." />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const events = (data ?? []).filter((e) => filter === 'all' || e.status === filter);

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View>
            <AppButton
              theme="primary"
              title="New Event"
              icon="add-circle-outline"
              onPress={() => router.push('/event/form')}
            />
            <View style={styles.chipRow}>
              {(['all', 'open', 'closed'] as const).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, filter === f && styles.chipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyView
            title={filter === 'all' ? 'No events yet' : `No ${filter} events`}
            message="Tap “New Event” to create one and generate its QR code."
            icon="calendar-outline"
          />
        }
        renderItem={({ item }) => (
          <EventCard event={item} showCount onPress={() => router.push(`/event/${item.id}`)} />
        )}
      />
    </View>
  );
}

export default function EventsScreen() {
  return (
    <RoleGate allow={['teacher', 'admin']}>
      <EventsInner />
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  chipRow: { flexDirection: 'row', marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}22` },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
});
