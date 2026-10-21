import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import RoleGate from '@/components/RoleGate';
import { COLORS } from '@/constants/colors';
import { recordAttendance, type RegisterCode, type RegisterResult } from '@/lib/attendance';
import { formatDateTime } from '@/lib/format';

const RESULT_STYLE: Record<RegisterCode, { icon: keyof typeof Ionicons.glyphMap; color: string; title: string }> = {
  ok: { icon: 'checkmark-circle', color: COLORS.success, title: 'Attendance recorded' },
  duplicate: { icon: 'copy-outline', color: COLORS.warning, title: 'Already recorded' },
  closed: { icon: 'lock-closed', color: COLORS.danger, title: 'Event closed' },
  not_started: { icon: 'time-outline', color: COLORS.warning, title: 'Event not started' },
  ended: { icon: 'hourglass-outline', color: COLORS.warning, title: 'Event ended' },
  invalid_qr: { icon: 'close-circle', color: COLORS.danger, title: 'Invalid QR code' },
  unauthorized: { icon: 'ban', color: COLORS.danger, title: 'Unauthorized' },
  forbidden: { icon: 'ban', color: COLORS.danger, title: 'Unauthorized' },
  error: { icon: 'cloud-offline-outline', color: COLORS.danger, title: 'Something went wrong' },
};

function ScanInner() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  // The scanner can fire several times before React re-renders, so lock with a ref.
  const lockRef = useRef(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>We need access to your camera to scan attendance QR codes.</Text>
        <AppButton theme="primary" title="Grant Permission" icon="camera" onPress={requestPermission} />
      </View>
    );
  }

  // EVENT: the QR scanner detects a QR code
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setProcessing(true);
    setResult(null);
    const res = await recordAttendance(data); // validate + insert (database function)
    setResult(res);
    setProcessing(false);
  };

  // EVENT: user presses "Scan Again"
  const handleScanAgain = () => {
    setResult(null);
    lockRef.current = false;
  };

  const style = result ? RESULT_STYLE[result.code] ?? RESULT_STYLE.error : null;
  const waiting = !processing && !result;

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={waiting ? handleBarcodeScanned : undefined}
        />
      )}

      {waiting && <View style={styles.frame} pointerEvents="none" />}

      <View style={styles.overlay}>
        {waiting && <Text style={styles.overlayText}>Point your camera at the event QR code</Text>}

        {processing && (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={[styles.overlayText, { marginTop: 10 }]}>Checking QR code...</Text>
          </View>
        )}

        {result && style && (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <Ionicons name={style.icon} size={52} color={style.color} />
            <Text style={[styles.resultTitle, { color: style.color }]}>{style.title}</Text>
            {!!result.eventTitle && <Text style={styles.eventTitle}>{result.eventTitle}</Text>}
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.success && !!result.scannedAt && (
              <Text style={styles.time}>{formatDateTime(result.scannedAt)}</Text>
            )}
            <View style={{ width: '100%', marginTop: 14 }}>
              <AppButton theme="primary" title="Scan Again" icon="refresh" onPress={handleScanAgain} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ScanScreen() {
  return (
    <RoleGate allow={['student']}>
      <ScanInner />
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  camera: { ...StyleSheet.absoluteFillObject },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 120,
  },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: 'center',
  },
  overlayText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  resultTitle: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 6, textAlign: 'center' },
  resultMessage: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  time: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
