import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getCompras,
  atualizarCompra,
  gerarId,
} from '../utils/storage';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function AdicionarProdutoScreen({ route, navigation }) {
  const { compraId, produtoId } = route.params;

  const [nome, setNome] = useState('');
  const [precoPrateleira, setPrecoPrateleira] = useState('');
  const [precoNota, setPrecoNota] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [foto, setFoto] = useState(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (produtoId) {
      carregarProduto();
    }
  }, []);

  async function carregarProduto() {
    const compras = await getCompras();
    const compra = compras.find((c) => c.id === compraId);
    if (compra) {
      const produto = compra.produtos.find((p) => p.id === produtoId);
      if (produto) {
        setNome(produto.nome);
        setPrecoPrateleira(produto.precoPrateleira ? produto.precoPrateleira.toString() : '');
        setPrecoNota(produto.precoNota ? produto.precoNota.toString() : '');
        setQuantidade(produto.quantidade ? produto.quantidade.toString() : '1');
        setFoto(produto.foto || null);
        setEditando(true);
        navigation.setOptions({ title: 'Editar Produto' });
      }
    }
  }

  async function tirarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à câmera para fotografar o produto.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFoto(result.assets[0].uri);
    }
  }

  async function escolherDaGaleria() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à galeria para selecionar uma foto.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFoto(result.assets[0].uri);
    }
  }

  function parseMoeda(texto) {
    if (!texto) return 0;
    const limpo = texto.replace(',', '.');
    const valor = parseFloat(limpo);
    return isNaN(valor) ? 0 : valor;
  }

  async function handleSalvar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      Alert.alert('Atenção', 'Informe o nome do produto.');
      return;
    }

    const precoP = parseMoeda(precoPrateleira);
    if (precoP <= 0) {
      Alert.alert('Atenção', 'Informe o preço da prateleira.');
      return;
    }

    const compras = await getCompras();
    const compra = compras.find((c) => c.id === compraId);
    if (!compra) return;

    const produto = {
      id: produtoId || gerarId(),
      nome: nomeLimpo,
      precoPrateleira: precoP,
      precoNota: parseMoeda(precoNota),
      quantidade: parseInt(quantidade, 10) || 1,
      foto,
    };

    if (editando) {
      compra.produtos = compra.produtos.map((p) =>
        p.id === produtoId ? produto : p
      );
    } else {
      compra.produtos.push(produto);
    }

    await atualizarCompra(compra);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seção de Foto */}
        <View style={styles.fotoSection}>
          {foto ? (
            <TouchableOpacity onPress={tirarFoto}>
              <Image source={{ uri: foto }} style={styles.fotoPreview} />
              <Text style={styles.fotoHint}>Toque para trocar a foto</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.fotoButtons}>
              <TouchableOpacity style={styles.fotoButton} onPress={tirarFoto}>
                <Text style={styles.fotoButtonIcon}>📸</Text>
                <Text style={styles.fotoButtonText}>Tirar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fotoButton}
                onPress={escolherDaGaleria}
              >
                <Text style={styles.fotoButtonIcon}>🖼️</Text>
                <Text style={styles.fotoButtonText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          )}
          {foto && (
            <TouchableOpacity
              style={styles.removerFoto}
              onPress={() => setFoto(null)}
            >
              <Text style={styles.removerFotoText}>Remover foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Campos do Produto */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do produto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Arroz 5kg"
            value={nome}
            onChangeText={setNome}
            maxLength={150}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Preço prateleira *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              value={precoPrateleira}
              onChangeText={setPrecoPrateleira}
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantidade</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preço na nota fiscal</Text>
          <Text style={styles.labelHint}>
            (preencha depois, ao conferir a nota)
          </Text>
          <TextInput
            style={[styles.input, styles.inputNota]}
            placeholder="0,00"
            value={precoNota}
            onChangeText={setPrecoNota}
            keyboardType="decimal-pad"
            maxLength={10}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>
            {editando ? 'Salvar Alterações' : 'Adicionar Produto'}
          </Text>
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
    paddingBottom: SPACING.xl * 2,
  },
  fotoSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  fotoButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  fotoButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    width: 140,
  },
  fotoButtonIcon: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  fotoButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  fotoPreview: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  fotoHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  removerFoto: {
    marginTop: SPACING.sm,
  },
  removerFotoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    fontWeight: '600',
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
  labelHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
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
  inputNota: {
    borderColor: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
