import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/Badge';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import { getMyAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useLoader } from '@/lib/useLoader';

export default function StudentHistory() {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useLoader(() =>
    getMyAttendance(user?.id ?? '')
  );

  if (loading) return <LoadingView label="Loading your attendance..." />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const records = data ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          records.length > 0 ? (
            <Text style={styles.summary}>
              {records.length} event{records.length === 1 ? '' : 's'} attended
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyView
            title="No attendance yet"
            message="Scan an event QR code to record your first attendance."
            icon="time-outline"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => item.eventId && router.push(`/event/${item.eventId}`)}
          >
            <View style={styles.row}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {item.eventTitle}
              </Text>
              <Badge value={item.status} />
            </View>
            {!!item.venue && <Text style={styles.meta}>{item.venue}</Text>}
            <Text style={styles.meta}>Recorded {formatDateTime(item.scannedAt)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  summary: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginRight: 10 },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
