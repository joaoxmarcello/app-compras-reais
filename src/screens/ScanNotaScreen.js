import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';
import { buscarProdutosNota } from '../utils/notaFiscal';

export default function ScanNotaScreen({ route, navigation }) {
  const { compraId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urlManual, setUrlManual] = useState('');
  const [modoManual, setModoManual] = useState(false);

  async function processarUrl(url) {
    if (loading) return;
    setLoading(true);
    setScanned(true);

    try {
      const resultado = await buscarProdutosNota(url);
      navigation.replace('MatchProdutos', {
        compraId,
        produtosNota: resultado.produtos,
        totalNota: resultado.totalNota,
      });
    } catch (error) {
      Alert.alert('Erro', error.message, [
        { text: 'Tentar novamente', onPress: () => { setScanned(false); setLoading(false); } },
      ]);
    }
  }

  function handleBarCodeScanned({ type, data }) {
    if (scanned || loading) return;
    // QR codes de NFC-e são URLs
    if (data && (data.startsWith('http') || data.startsWith('HTTP'))) {
      processarUrl(data);
    } else {
      Alert.alert(
        'QR Code inválido',
        'Este não parece ser o QR code de uma nota fiscal. Procure o QR code na parte inferior da nota.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  }

  function handleUrlManual() {
    const url = urlManual.trim();
    if (!url) {
      Alert.alert('Atenção', 'Cole a URL da nota fiscal.');
      return;
    }
    if (!url.startsWith('http')) {
      Alert.alert('Atenção', 'A URL deve começar com http ou https.');
      return;
    }
    processarUrl(url);
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📸</Text>
        <Text style={styles.permissionTitle}>Acesso à câmera</Text>
        <Text style={styles.permissionText}>
          Precisamos da câmera para escanear o QR code da nota fiscal
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Permitir Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setModoManual(true)}
        >
          <Text style={styles.manualBtnText}>Digitar URL manualmente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (modoManual) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Cole a URL da Nota Fiscal</Text>
          <Text style={styles.manualSubtitle}>
            Abra a nota fiscal no navegador e copie a URL completa
          </Text>
          <TextInput
            style={styles.manualInput}
            placeholder="https://www.nfce.fazenda..."
            value={urlManual}
            onChangeText={setUrlManual}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUrlManual}>
                <Text style={styles.submitBtnText}>Buscar Produtos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setModoManual(false)}
              >
                <Text style={styles.switchBtnText}>Escanear QR Code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              Aponte para o QR code da nota fiscal
            </Text>
            {loading && (
              <ActivityIndicator size="large" color="#fff" style={{ marginTop: SPACING.md }} />
            )}
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setModoManual(true)}
            >
              <Text style={[styles.switchBtnText, { color: '#fff' }]}>
                Digitar URL manualmente
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const SCAN_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primaryLight,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  instructionText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  permissionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  permissionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  manualContainer: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  manualTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  manualSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  manualInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  manualBtn: {
    marginTop: SPACING.lg,
  },
  manualBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  switchBtn: {
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  switchBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
