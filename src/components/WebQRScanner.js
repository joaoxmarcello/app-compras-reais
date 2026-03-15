import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Html5Qrcode } from 'html5-qrcode';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function WebQRScanner({ onScan, onSwitchManual }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let html5Qr = null;

    async function startScanner() {
      try {
        html5Qr = new Html5Qrcode('web-qr-reader');
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            html5Qr.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setError(err?.message || 'Não foi possível acessar a câmera');
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📸</Text>
        <Text style={styles.errorTitle}>Câmera indisponível</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Verifique se o site tem permissão para acessar a câmera nas configurações do navegador.
        </Text>
        <TouchableOpacity style={styles.manualBtn} onPress={onSwitchManual}>
          <Text style={styles.manualBtnText}>Digitar URL manualmente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div id="web-qr-reader" style={{ width: '100%', maxWidth: 500 }} />
      <View style={styles.bottomBar}>
        <Text style={styles.instruction}>Aponte para o QR code da nota fiscal</Text>
        <TouchableOpacity style={styles.switchBtn} onPress={onSwitchManual}>
          <Text style={styles.switchBtnText}>Digitar URL manualmente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  instruction: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  switchBtn: {
    padding: SPACING.sm,
  },
  switchBtnText: {
    color: '#aaa',
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger || '#c62828',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  errorHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  manualBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  manualBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
