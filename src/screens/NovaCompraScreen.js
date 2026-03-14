import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { criarCompra, gerarId } from '../utils/storage';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function NovaCompraScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [mercado, setMercado] = useState('');

  async function handleCriar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      return;
    }

    const hoje = new Date();
    const data = hoje.toLocaleDateString('pt-BR');

    const novaCompra = {
      id: gerarId(),
      nome: nomeLimpo,
      mercado: mercado.trim(),
      data,
      criadoEm: hoje.toISOString(),
      produtos: [],
    };

    await criarCompra(novaCompra);
    navigation.replace('DetalhesCompra', { compraId: novaCompra.id });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🛒 Nova Compra</Text>
        <Text style={styles.subtitle}>
          Dê um nome para esta compra e comece a adicionar produtos
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da compra *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Compra semanal"
            value={nome}
            onChangeText={setNome}
            autoFocus
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supermercado</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mercado São João"
            value={mercado}
            onChangeText={setMercado}
            maxLength={100}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, !nome.trim() && styles.buttonDisabled]}
          onPress={handleCriar}
          disabled={!nome.trim()}
        >
          <Text style={styles.buttonText}>Iniciar Compra</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
