import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import Badge from '@/components/Badge';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import {
  ATTENDANCE_STATUSES,
  deleteAttendance,
  getStaffAttendance,
  updateAttendanceStatus,
  type AttendanceStatus,
  type StaffAttendance as AttendanceRow,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { confirmAction, showMessage } from '@/lib/ui';
import { useLoader } from '@/lib/useLoader';

/** Teacher: read-only records of own events. Admin: all records, can correct or delete. */
export default function StaffAttendance() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useLoader(() => getStaffAttendance());

  if (loading) return <LoadingView label="Loading attendance records..." />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const term = search.trim().toLowerCase();
  const records = (data ?? []).filter(
    (r) =>
      !term ||
      r.studentName.toLowerCase().includes(term) ||
      r.eventTitle.toLowerCase().includes(term) ||
      (r.idNumber ?? '').toLowerCase().includes(term)
  );

  // EVENT: admin taps a status chip -> handler updates the attendance row
  const changeStatus = async (rec: AttendanceRow, status: AttendanceStatus) => {
    if (rec.status === status) return;
    setBusyId(rec.id);
    const { error: err } = await updateAttendanceStatus(rec.id, status);
    setBusyId(null);
    if (err) showMessage('Error', err);
    else reload();
  };

  const remove = (rec: AttendanceRow) =>
    confirmAction(
      'Delete attendance record?',
      `${rec.studentName} — ${rec.eventTitle}`,
      async () => {
        setBusyId(rec.id);
        const { error: err } = await deleteAttendance(rec.id);
        setBusyId(null);
        if (err) showMessage('Error', err);
        else {
          setOpenId(null);
          reload();
        }
      },
      'Delete',
      true
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search student, ID or event"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
            />
            <Text style={styles.summary}>
              {records.length} record{records.length === 1 ? '' : 's'}
              {isAdmin ? ' · tap a record to correct it' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyView
            title={term ? 'No matching records' : 'No attendance records yet'}
            message={term ? 'Try a different search.' : 'Records appear when students scan an event QR code.'}
            icon="people-outline"
          />
        }
        renderItem={({ item }) => {
          const expanded = isAdmin && openId === item.id;
          return (
            <Pressable
              style={styles.card}
              onPress={() => isAdmin && setOpenId(expanded ? null : item.id)}
            >
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.name}>{item.studentName}</Text>
                  <Text style={styles.meta}>
                    {[item.idNumber, item.section].filter(Boolean).join(' · ') || item.studentEmail}
                  </Text>
                </View>
                <Badge value={item.status} />
              </View>
              <Text style={styles.event}>{item.eventTitle}</Text>
              <Text style={styles.meta}>{formatDateTime(item.scannedAt)}</Text>

              {expanded && (
                <View style={styles.editBox}>
                  <Text style={styles.editLabel}>Correct status</Text>
                  <View style={styles.chipRow}>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <Pressable
                        key={s}
                        disabled={busyId === item.id}
                        style={[styles.chip, item.status === s && styles.chipActive]}
                        onPress={() => changeStatus(item, s)}
                      >
                        <Text style={[styles.chipText, item.status === s && styles.chipTextActive]}>
                          {s.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable onPress={() => remove(item)} disabled={busyId === item.id}>
                    <Text style={styles.delete}>Delete record</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  search: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  summary: { fontSize: 13, color: COLORS.textSecondary, marginVertical: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  event: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 8 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  editBox: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 10 },
  editLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}22` },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  delete: { color: COLORS.danger, fontWeight: '700', fontSize: 13, marginTop: 4 },
});
