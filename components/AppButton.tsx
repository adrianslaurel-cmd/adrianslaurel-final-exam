import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary' | 'danger';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function AppButton({ title, icon, theme, onPress, disabled, loading }: Props) {
  const filled = theme === 'primary' || theme === 'danger';
  const bg = theme === 'danger' ? COLORS.danger : COLORS.primary;
  const inactive = disabled || loading;

  return (
    <View
      style={[
        styles.buttonOuter,
        filled && { borderWidth: 1, borderColor: bg, borderRadius: 10 },
        inactive && styles.inactive,
      ]}
    >
      <Pressable
        style={[filled ? styles.buttonInner : styles.secondaryFill, filled && { backgroundColor: bg }]}
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={filled ? COLORS.textOnPrimary : COLORS.textSecondary} />
        ) : (
          <>
            <Ionicons
              name={icon}
              size={22}
              color={filled ? COLORS.textOnPrimary : COLORS.textSecondary}
              style={styles.icon}
            />
            <Text style={[styles.label, filled && styles.labelPrimary]}>{title}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: { width: '100%', marginBottom: 14 },
  inactive: { opacity: 0.6 },
  buttonInner: {
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryFill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  icon: { paddingRight: 10 },
  label: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  labelPrimary: { fontWeight: '700', color: COLORS.textOnPrimary },
});
