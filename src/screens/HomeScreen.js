import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCompras, excluirCompra, formatarMoeda, calcularTotalPrateleira } from '../utils/storage';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const [compras, setCompras] = useState([]);

  useFocusEffect(
    useCallback(() => {
      carregarCompras();
    }, [])
  );

  async function carregarCompras() {
    const dados = await getCompras();
    setCompras(dados);
  }

  function confirmarExclusao(compra) {
    Alert.alert(
      'Excluir Compra',
      `Deseja excluir a compra "${compra.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const atualizadas = await excluirCompra(compra.id);
            setCompras(atualizadas);
          },
        },
      ]
    );
  }

  function renderCompra({ item }) {
    const totalPrateleira = calcularTotalPrateleira(item.produtos || []);
    const qtdProdutos = (item.produtos || []).length;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalhesCompra', { compraId: item.id })}
        onLongPress={() => confirmarExclusao(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nome}</Text>
          <Text style={styles.cardDate}>{item.data}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardInfo}>
            {qtdProdutos} {qtdProdutos === 1 ? 'produto' : 'produtos'}
          </Text>
          <Text style={styles.cardTotal}>
            {formatarMoeda(totalPrateleira)}
          </Text>
        </View>
        {item.mercado ? (
          <Text style={styles.cardMercado}>📍 {item.mercado}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {compras.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Nenhuma compra registrada</Text>
          <Text style={styles.emptySubtext}>
            Toque no botão abaixo para iniciar uma nova compra
          </Text>
        </View>
      ) : (
        <FlatList
          data={compras}
          keyExtractor={(item) => item.id}
          renderItem={renderCompra}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NovaCompra')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  cardDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  cardTotal: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardMercado: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.textLight,
    lineHeight: 34,
  },
});
