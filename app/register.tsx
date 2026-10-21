import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import TextField from '@/components/TextField';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';
import {
  validateEmail,
  validateIdNumber,
  validateName,
  validatePassword,
} from '@/lib/validation';

type FieldErrors = Partial<
  Record<'fullName' | 'idNumber' | 'email' | 'password' | 'confirm', string>
>;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [idNumber, setIdNumber] = useState('');
  const [section, setSection] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // EVENT: user presses "Sign Up"
  const handleRegister = async () => {
    setFormError(null);

    const next: FieldErrors = {};
    const nameErr = validateName(fullName);
    if (nameErr) next.fullName = nameErr;
    const idErr = validateIdNumber(idNumber, role === 'student');
    if (idErr) next.idNumber = idErr;
    const emailErr = validateEmail(email);
    if (emailErr) next.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) next.password = passErr;
    if (!passErr && password !== confirmPassword) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        role,
        id_number: idNumber.trim() || undefined,
        section: section.trim() || undefined,
      });

      if (authError) {
        setFormError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true); // email confirmation is enabled in Supabase
      }
    } catch {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Register to start using QR attendance</Text>

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>Check your email!</Text>
                <Text style={styles.successText}>
                  We sent a confirmation link to {email}. Click the link to verify your account, then
                  come back and sign in.
                </Text>
                <Link href="/login" style={styles.link}>
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>I am a...</Text>
                <View style={styles.roleRow}>
                  {(['student', 'teacher'] as const).map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.roleChip, role === r && styles.roleChipActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                        {r === 'student' ? 'Student' : 'Teacher'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextField
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Maria Santos"
                  editable={!loading}
                  error={errors.fullName}
                  maxLength={80}
                />
                <TextField
                  label={role === 'student' ? 'Student ID Number' : 'Employee ID (optional)'}
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="e.g. 2026-00123"
                  autoCapitalize="characters"
                  editable={!loading}
                  error={errors.idNumber}
                  maxLength={20}
                />
                <TextField
                  label={role === 'student' ? 'Course & Section (optional)' : 'Department (optional)'}
                  value={section}
                  onChangeText={setSection}
                  placeholder={role === 'student' ? 'e.g. BSIT 3-A' : 'e.g. IT Department'}
                  editable={!loading}
                  maxLength={60}
                />
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                  error={errors.email}
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters, letters + numbers"
                  secureTextEntry
                  editable={!loading}
                  error={errors.password}
                />
                <TextField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry
                  editable={!loading}
                  error={errors.confirm}
                />

                {!!formError && <Text style={styles.error}>{formError}</Text>}

                <View style={{ marginTop: 16 }}>
                  <AppButton
                    theme="primary"
                    title="Sign Up"
                    icon="person-add-outline"
                    onPress={handleRegister}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {!success && (
              <Link href="/login" style={styles.link}>
                Already have an account? Sign In
              </Link>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  headerContainer: { alignItems: 'center', marginTop: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 24 },
  form: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 4 },
  roleRow: { flexDirection: 'row', marginTop: 4 },
  roleChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
  },
  roleChipActive: { backgroundColor: `${COLORS.primary}22`, borderColor: COLORS.primary },
  roleChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  roleChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  error: { fontSize: 14, color: COLORS.danger, marginTop: 12 },
  link: { fontSize: 14, color: COLORS.primary, textAlign: 'center', fontWeight: '600' },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
});
