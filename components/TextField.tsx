import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export default function TextField({ label, error, style, ...rest }: Props) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.textSecondary}
        {...rest}
        style={[styles.input, !!error && styles.inputError, style]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.danger },
  error: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
});
