import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import RoleGate from '@/components/RoleGate';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { listProfiles, setUserActive, setUserRole, type Profile, type Role } from '@/lib/profiles';
import { confirmAction, showMessage } from '@/lib/ui';
import { useLoader } from '@/lib/useLoader';

const ROLES: Role[] = ['student', 'teacher', 'admin'];

function UsersInner() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useLoader(() => listProfiles());

  if (loading) return <LoadingView label="Loading users..." />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const term = search.trim().toLowerCase();
  const users = (data ?? []).filter(
    (u) =>
      !term ||
      (u.full_name ?? '').toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.id_number ?? '').toLowerCase().includes(term)
  );

  // EVENT: admin picks a new role -> confirm -> update profile
  const changeRole = (target: Profile, role: Role) => {
    if (target.role === role) return;
    confirmAction(
      'Change role?',
      `${target.full_name || target.email} will become a ${role}.`,
      async () => {
        setBusyId(target.id);
        const { error: err } = await setUserRole(target.id, role);
        setBusyId(null);
        if (err) showMessage('Error', err);
        else reload();
      }
    );
  };

  const toggleActive = (target: Profile) => {
    const deactivate = target.is_active;
    confirmAction(
      deactivate ? 'Deactivate account?' : 'Activate account?',
      deactivate
        ? 'This user will be signed out and will not be able to use the app.'
        : 'This user will be able to sign in again.',
      async () => {
        setBusyId(target.id);
        const { error: err } = await setUserActive(target.id, !deactivate);
        setBusyId(null);
        if (err) showMessage('Error', err);
        else reload();
      },
      deactivate ? 'Deactivate' : 'Activate',
      deactivate
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email or ID"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
            />
            <Text style={styles.summary}>
              {users.length} user{users.length === 1 ? '' : 's'} · tap a user to manage
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyView title="No users found" icon="people-outline" />}
        renderItem={({ item }) => {
          const expanded = openId === item.id;
          const isSelf = item.id === user?.id;
          return (
            <Pressable style={[styles.card, !item.is_active && { opacity: 0.6 }]} onPress={() => setOpenId(expanded ? null : item.id)}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.name}>
                    {item.full_name || 'No name'} {isSelf ? '(you)' : ''}
                  </Text>
                  <Text style={styles.meta}>{item.email}</Text>
                  <Text style={styles.meta}>
                    {[item.id_number, item.section].filter(Boolean).join(' · ') || 'No ID / section'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.role}>{item.role.toUpperCase()}</Text>
                  {!item.is_active && <Text style={styles.inactive}>DEACTIVATED</Text>}
                </View>
              </View>

              {expanded && (
                <View style={styles.editBox}>
                  <Text style={styles.meta}>Joined {formatDate(item.created_at)}</Text>
                  <Text style={styles.editLabel}>Role</Text>
                  <View style={styles.chipRow}>
                    {ROLES.map((r) => (
                      <Pressable
                        key={r}
                        disabled={isSelf || busyId === item.id}
                        style={[styles.chip, item.role === r && styles.chipActive, isSelf && { opacity: 0.5 }]}
                        onPress={() => changeRole(item, r)}
                      >
                        <Text style={[styles.chipText, item.role === r && styles.chipTextActive]}>
                          {r.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {isSelf ? (
                    <Text style={styles.meta}>You cannot change your own role or deactivate yourself.</Text>
                  ) : (
                    <Pressable onPress={() => toggleActive(item)} disabled={busyId === item.id}>
                      <Text style={[styles.action, { color: item.is_active ? COLORS.danger : COLORS.success }]}>
                        {item.is_active ? 'Deactivate account' : 'Activate account'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export default function UsersScreen() {
  return (
    <RoleGate allow={['admin']}>
      <UsersInner />
    </RoleGate>
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
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  role: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  inactive: { fontSize: 10, fontWeight: '800', color: COLORS.danger, marginTop: 4 },
  editBox: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 10 },
  editLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, marginBottom: 8 },
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
  action: { fontWeight: '700', fontSize: 13, marginTop: 6 },
});
