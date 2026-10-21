import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import { getAuditLog, getOverview, type AuditEntry, type Overview } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { listEvents, type EventRow } from '@/lib/events';
import { formatDateTime } from '@/lib/format';
import { useLoader } from '@/lib/useLoader';

type Data = {
  events: EventRow[];
  overview: Overview | null;
  audit: AuditEntry[];
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StaffHome() {
  const { user, role, profile } = useAuth();
  const isAdmin = role === 'admin';

  const { data, error, loading, refreshing, refresh, reload } = useLoader<Data>(async () => {
    const eventsRes = await listEvents(isAdmin ? 'all' : 'mine', user?.id);
    if (!isAdmin) return { data: { events: eventsRes.data, overview: null, audit: [] }, error: eventsRes.error };
    const [overview, audit] = await Promise.all([getOverview(), getAuditLog(20)]);
    return { data: { events: eventsRes.data, overview, audit }, error: eventsRes.error };
  });

  if (loading) return <LoadingView label="Loading dashboard..." />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const events = data?.events ?? [];
  const open = events.filter((e) => e.status === 'open').length;
  const totalAttendees = events.reduce((sum, e) => sum + e.attendee_count, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.greeting}>
        {isAdmin ? 'Administrator' : 'Teacher'} · {profile?.full_name || profile?.email}
      </Text>

      <Text style={styles.section}>{isAdmin ? 'Campus Overview' : 'My Events Summary'}</Text>
      <View style={styles.statRow}>
        {isAdmin && data?.overview ? (
          <>
            <Stat label="Students" value={data.overview.students} />
            <Stat label="Teachers" value={data.overview.teachers} />
            <Stat label="Admins" value={data.overview.admins} />
          </>
        ) : (
          <>
            <Stat label="Events" value={events.length} />
            <Stat label="Open" value={open} />
            <Stat label="Closed" value={events.length - open} />
          </>
        )}
      </View>
      <View style={styles.statRow}>
        {isAdmin && data?.overview ? (
          <>
            <Stat label="Open events" value={data.overview.openEvents} />
            <Stat label="Closed events" value={data.overview.closedEvents} />
            <Stat label="Attendance" value={data.overview.attendanceRecords} />
          </>
        ) : (
          <Stat label="Total attendees across my events" value={totalAttendees} />
        )}
      </View>

      <AppButton
        theme="primary"
        title="Create Event"
        icon="add-circle-outline"
        onPress={() => router.push('/event/form')}
      />

      <Text style={styles.section}>{isAdmin ? 'Recent Events' : 'My Recent Events'}</Text>
      {events.length === 0 ? (
        <EmptyView title="No events yet" message="Create an event to generate its QR code." icon="calendar-outline" />
      ) : (
        events.slice(0, 5).map((e) => (
          <EventCard key={e.id} event={e} showCount onPress={() => router.push(`/event/${e.id}`)} />
        ))
      )}

      {isAdmin && (
        <>
          <Text style={styles.section}>System Records</Text>
          {(data?.audit ?? []).length === 0 ? (
            <Text style={styles.muted}>No activity recorded yet.</Text>
          ) : (
            (data?.audit ?? []).map((a) => (
              <View key={a.id} style={styles.logRow}>
                <Text style={styles.logMain}>
                  {a.action} {a.tableName} — {a.summary}
                </Text>
                <Text style={styles.logMeta}>
                  {a.actor} · {formatDateTime(a.createdAt)}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 6 },
  section: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 14, marginBottom: 10 },
  statRow: { flexDirection: 'row', marginBottom: 10 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  muted: { color: COLORS.textSecondary, fontSize: 14 },
  logRow: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8 },
  logMain: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  logMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
