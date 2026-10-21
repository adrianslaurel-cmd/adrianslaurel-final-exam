import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import Badge from '@/components/Badge';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import {
  getEventAttendance,
  getMyAttendanceForEvent,
  type AttendanceStatus,
  type StaffAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { deleteEvent, getEvent, setEventStatus, type EventRow } from '@/lib/events';
import { formatDate, formatDateTime, formatTimeRange } from '@/lib/format';
import { buildQRPayload } from '@/lib/qr';
import { confirmAction, showMessage } from '@/lib/ui';
import { useLoader } from '@/lib/useLoader';

type Data = {
  event: EventRow | null;
  attendees: StaffAttendance[];
  mine: { status: AttendanceStatus; scannedAt: string } | null;
};

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, role } = useAuth();
  const [busy, setBusy] = useState(false);

  const { data, error, loading, refreshing, refresh, reload } = useLoader<Data>(async () => {
    const ev = await getEvent(String(id));
    if (!ev.data) return { data: { event: null, attendees: [], mine: null }, error: ev.error };

    const isOwner = role === 'admin' || (role === 'teacher' && ev.data.created_by === user?.id);
    if (isOwner) {
      const att = await getEventAttendance(ev.data.id);
      return { data: { event: ev.data, attendees: att.data, mine: null }, error: att.error };
    }
    const mine = user ? await getMyAttendanceForEvent(user.id, ev.data.id) : null;
    return { data: { event: ev.data, attendees: [], mine }, error: null };
  });

  if (loading) return <LoadingView label="Loading event..." />;
  if (error && !data?.event) return <ErrorView message={error} onRetry={reload} />;
  const event = data?.event;
  if (!event) return <ErrorView message="Event not found." />;

  const canManage = role === 'admin' || (role === 'teacher' && event.created_by === user?.id);
  const attendees = data?.attendees ?? [];
  const counts = attendees.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // EVENT: staff presses Close / Reopen -> handler updates events.status in the database
  const toggleStatus = () => {
    const closing = event.status === 'open';
    confirmAction(
      closing ? 'Close this event?' : 'Reopen this event?',
      closing
        ? 'Students will no longer be able to record attendance for it.'
        : 'Students will be able to scan the QR code again.',
      async () => {
        setBusy(true);
        const { error: err } = await setEventStatus(event.id, closing ? 'closed' : 'open');
        setBusy(false);
        if (err) showMessage('Error', err);
        else reload();
      },
      closing ? 'Close Event' : 'Reopen',
      closing
    );
  };

  const handleDelete = () => {
    confirmAction(
      'Delete event?',
      'This also deletes all attendance records of this event. This cannot be undone.',
      async () => {
        setBusy(true);
        const { error: err } = await deleteEvent(event.id);
        setBusy(false);
        if (err) showMessage('Error', err);
        else router.back();
      },
      'Delete',
      true
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{event.title}</Text>
        <Badge value={event.status} />
      </View>

      <View style={styles.card}>
        <Row icon="calendar-outline" label="Date" value={formatDate(event.start_time)} />
        <Row icon="time-outline" label="Time" value={formatTimeRange(event.start_time, event.end_time)} />
        <Row icon="location-outline" label="Venue" value={event.venue || '—'} />
        {!!event.description && <Row icon="document-text-outline" label="Description" value={event.description} />}
        {canManage && <Row icon="key-outline" label="Event code" value={event.event_code} />}
      </View>

      {/* ---------- Student view ---------- */}
      {role === 'student' && (
        <View style={styles.card}>
          {data?.mine ? (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={44} color={COLORS.success} />
              <Text style={styles.okTitle}>Attendance recorded</Text>
              <Text style={styles.muted}>{formatDateTime(data.mine.scannedAt)}</Text>
              <View style={{ marginTop: 8 }}>
                <Badge value={data.mine.status} />
              </View>
            </View>
          ) : event.status === 'open' ? (
            <View>
              <Text style={styles.muted}>You have not recorded attendance for this event yet.</Text>
              <View style={{ height: 12 }} />
              <AppButton theme="primary" title="Scan QR Code" icon="qr-code-outline" onPress={() => router.push('/scan')} />
            </View>
          ) : (
            <Text style={styles.muted}>This event is closed. Attendance can no longer be recorded.</Text>
          )}
        </View>
      )}

      {/* ---------- Teacher / Admin view ---------- */}
      {canManage && (
        <>
          <View style={styles.card}>
            {event.status === 'open' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Attendance QR Code</Text>
                <View style={styles.qrBox}>
                  <QRCode value={buildQRPayload(event.event_code)} size={220} />
                </View>
                <Text style={styles.muted}>Students scan this with the Scan tab.</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="lock-closed" size={36} color={COLORS.textSecondary} />
                <Text style={styles.sectionTitle}>Event closed</Text>
                <Text style={styles.muted}>The QR code is disabled. Reopen the event to use it again.</Text>
              </View>
            )}
          </View>

          <AppButton title="Edit Event" icon="create-outline" onPress={() => router.push(`/event/form?id=${event.id}`)} />
          <AppButton
            theme={event.status === 'open' ? 'danger' : 'primary'}
            title={event.status === 'open' ? 'Close Event' : 'Reopen Event'}
            icon={event.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
            onPress={toggleStatus}
            loading={busy}
          />
          {role === 'admin' && (
            <AppButton title="Delete Event" icon="trash-outline" onPress={handleDelete} disabled={busy} />
          )}

          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{attendees.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            {(['present', 'late', 'absent', 'excused'] as const).map((s) => (
              <View key={s} style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{counts[s] ?? 0}</Text>
                <Text style={styles.summaryLabel}>{s}</Text>
              </View>
            ))}
          </View>

          {attendees.length === 0 ? (
            <EmptyView title="No attendees yet" message="Records appear here as students scan the QR code." icon="people-outline" />
          ) : (
            attendees.map((a) => (
              <View key={a.id} style={styles.attendeeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>{a.studentName}</Text>
                  <Text style={styles.muted}>
                    {[a.idNumber, a.section].filter(Boolean).join(' · ') || a.studentEmail}
                  </Text>
                  <Text style={styles.muted}>{formatDateTime(a.scannedAt)}</Text>
                </View>
                <Badge value={a.status} />
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
  content: { padding: 20, paddingBottom: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginRight: 10 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary },
  infoValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600', marginTop: 1 },
  muted: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  okTitle: { fontSize: 17, fontWeight: '700', color: COLORS.success, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, marginTop: 6 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginVertical: 12 },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  attendeeName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
});
