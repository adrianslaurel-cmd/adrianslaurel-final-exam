import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { LoadingView } from '@/components/StateViews';
import TextField from '@/components/TextField';
import { COLORS } from '@/constants/colors';
import { refreshProfile, signOut, useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { updateProfile } from '@/lib/profiles';
import { confirmAction, showMessage } from '@/lib/ui';
import { validateIdNumber, validateName } from '@/lib/validation';

export default function ProfileScreen() {
  const { user, profile, role, loading } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [section, setSection] = useState('');
  const [errors, setErrors] = useState<{ name?: string; id?: string }>({});
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setIdNumber(profile?.id_number ?? '');
    setSection(profile?.section ?? '');
  }, [profile]);

  if (loading || !user) return <LoadingView label="Loading profile..." />;

  const isStudent = role === 'student';

  // EVENT: user presses "Save"
  const handleSave = async () => {
    const nameErr = validateName(fullName);
    const idErr = validateIdNumber(idNumber, false);
    setErrors({ name: nameErr ?? undefined, id: idErr ?? undefined });
    if (nameErr || idErr) return;

    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: fullName.trim(),
      id_number: idNumber.trim() || null,
      section: section.trim() || null,
    });
    if (error) {
      setSaving(false);
      showMessage('Error', error);
      return;
    }
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  };

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut(); // clears the secure session
    router.replace('/login');
  };

  // EVENT: user presses "Sign Out"
  const handleSignOut = () =>
    confirmAction('Sign out?', 'You will need to sign in again to use the app.', doSignOut, 'Sign Out', true);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.infoCard}>
        <View style={[styles.roleBadge, role !== 'student' && styles.roleBadgeStaff]}>
          <Text style={[styles.roleBadgeText, role !== 'student' && { color: COLORS.textOnPrimary }]}>
            {role.toUpperCase()}
          </Text>
        </View>

        {editing ? (
          <View>
            <TextField label="Full Name" value={fullName} onChangeText={setFullName} error={errors.name} maxLength={80} />
            <TextField
              label={isStudent ? 'Student ID Number' : 'Employee ID'}
              value={idNumber}
              onChangeText={setIdNumber}
              autoCapitalize="characters"
              error={errors.id}
              maxLength={20}
            />
            <TextField
              label={isStudent ? 'Course & Section' : 'Department'}
              value={section}
              onChangeText={setSection}
              maxLength={60}
            />
            <View style={{ height: 16 }} />
            <AppButton theme="primary" title="Save" icon="save-outline" onPress={handleSave} loading={saving} />
            <AppButton title="Cancel" icon="close-outline" onPress={() => setEditing(false)} disabled={saving} />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{profile?.full_name || '—'}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>

            <Text style={styles.label}>{isStudent ? 'Student ID Number' : 'Employee ID'}</Text>
            <Text style={styles.value}>{profile?.id_number || '—'}</Text>

            <Text style={styles.label}>{isStudent ? 'Course & Section' : 'Department'}</Text>
            <Text style={styles.value}>{profile?.section || '—'}</Text>

            <Text style={styles.label}>Member since</Text>
            <Text style={styles.value}>{formatDate(profile?.created_at)}</Text>
          </View>
        )}
      </View>

      {!editing && (
        <AppButton title="Edit Profile" icon="create-outline" onPress={() => setEditing(true)} />
      )}
      <AppButton title="Sign Out" icon="log-out-outline" theme="danger" onPress={handleSignOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 48 },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  roleBadgeStaff: { backgroundColor: COLORS.primary },
  roleBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4, marginTop: 12 },
  value: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
});
