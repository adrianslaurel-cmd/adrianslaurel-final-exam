import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import { signIn, useAuth } from '@/lib/auth';
import { validateEmail } from '@/lib/validation';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // EVENT: user presses "Sign In"
  const handleLogin = async () => {
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    if (!password) return setError('Password is required.');

    setLoading(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) {
        // generic message: do not reveal which part was wrong
        setError(
          authError.message.toLowerCase().includes('email not confirmed')
            ? 'Please confirm your email first, then sign in.'
            : 'Invalid email or password.'
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error. Check your connection.');
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

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to record or manage attendance</Text>

            {!!notice && <Text style={styles.notice}>{notice}</Text>}

            <View style={styles.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@school.edu"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                editable={!loading}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={{ marginTop: 16 }}>
                <AppButton
                  theme="primary"
                  title="Sign In"
                  icon="log-in-outline"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>
            </View>

            <Link href="/register" style={styles.link}>
              Don't have an account? Sign Up
            </Link>
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
  notice: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.warning,
    borderWidth: 1,
    color: COLORS.warning,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  form: { marginBottom: 24 },
  error: { fontSize: 14, color: COLORS.danger, marginTop: 12 },
  link: { fontSize: 14, color: COLORS.primary, textAlign: 'center', fontWeight: '600' },
});
