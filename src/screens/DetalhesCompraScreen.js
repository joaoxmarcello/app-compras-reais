import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCompras,
  atualizarCompra,
  formatarMoeda,
  calcularTotalPrateleira,
  calcularTotalNota,
  calcularDiferenca,
} from '../utils/storage';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function DetalhesCompraScreen({ route, navigation }) {
  const { compraId } = route.params;
  const [compra, setCompra] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarCompra();
    }, [])
  );

  async function carregarCompra() {
    const compras = await getCompras();
    const encontrada = compras.find((c) => c.id === compraId);
    if (encontrada) {
      setCompra(encontrada);
      navigation.setOptions({ title: encontrada.nome });
    }
  }

  function confirmarExcluirProduto(produtoId) {
    Alert.alert('Excluir Produto', 'Deseja remover este produto da compra?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => excluirProduto(produtoId),
      },
    ]);
  }

  async function excluirProduto(produtoId) {
    const atualizada = {
      ...compra,
      produtos: compra.produtos.filter((p) => p.id !== produtoId),
    };
    await atualizarCompra(atualizada);
    setCompra(atualizada);
  }

  if (!compra) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const produtos = compra.produtos || [];
  const totalPrateleira = calcularTotalPrateleira(produtos);
  const totalNota = calcularTotalNota(produtos);
  const diferenca = calcularDiferenca(produtos);
  const temNota = produtos.some((p) => p.precoNota > 0);

  function renderProduto({ item }) {
    const subtotalPrateleira = (item.precoPrateleira || 0) * (item.quantidade || 1);
    const subtotalNota = (item.precoNota || 0) * (item.quantidade || 1);
    const diff = subtotalNota - subtotalPrateleira;
    const temDiferenca = item.precoNota > 0 && item.precoPrateleira > 0 && Math.abs(diff) > 0.01;

    return (
      <TouchableOpacity
        style={styles.produtoCard}
        onPress={() =>
          navigation.navigate('AdicionarProduto', {
            compraId: compra.id,
            produtoId: item.id,
          })
        }
        onLongPress={() => confirmarExcluirProduto(item.id)}
      >
        <View style={styles.produtoRow}>
          {item.foto ? (
            <Image source={{ uri: item.foto }} style={styles.produtoFoto} />
          ) : (
            <View style={styles.produtoFotoPlaceholder}>
              <Text style={styles.produtoFotoPlaceholderText}>📦</Text>
            </View>
          )}

          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome} numberOfLines={1}>
              {item.nome}
            </Text>
            {item.quantidade > 1 && (
              <Text style={styles.produtoQtd}>Qtd: {item.quantidade}</Text>
            )}

            <View style={styles.precosRow}>
              <View style={styles.precoBox}>
                <Text style={styles.precoLabel}>Prateleira</Text>
                <Text style={styles.precoValor}>
                  {formatarMoeda(item.precoPrateleira || 0)}
                </Text>
              </View>
              {item.precoNota > 0 && (
                <View style={styles.precoBox}>
                  <Text style={styles.precoLabel}>Nota</Text>
                  <Text style={styles.precoValor}>
                    {formatarMoeda(item.precoNota)}
                  </Text>
                </View>
              )}
            </View>

            {temDiferenca && (
              <View
                style={[
                  styles.diffBadge,
                  diff > 0 ? styles.diffNegativo : styles.diffPositivo,
                ]}
              >
                <Text
                  style={[
                    styles.diffText,
                    diff > 0 ? styles.diffTextNegativo : styles.diffTextPositivo,
                  ]}
                >
                  {diff > 0 ? '⚠️ Nota ' : '✅ Nota '}
                  {formatarMoeda(Math.abs(diff))}
                  {diff > 0 ? ' mais cara' : ' mais barata'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.resumo}>
        <View style={styles.resumoHeader}>
          <Text style={styles.resumoTitle}>Resumo da Compra</Text>
          {compra.mercado ? (
            <Text style={styles.resumoMercado}>📍 {compra.mercado}</Text>
          ) : null}
        </View>

        <View style={styles.resumoCards}>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoCardLabel}>Prateleira</Text>
            <Text style={[styles.resumoCardValor, { color: COLORS.primary }]}>
              {formatarMoeda(totalPrateleira)}
            </Text>
          </View>

          {temNota && (
            <>
              <View style={styles.resumoCard}>
                <Text style={styles.resumoCardLabel}>Nota Fiscal</Text>
                <Text style={[styles.resumoCardValor, { color: COLORS.accent }]}>
                  {formatarMoeda(totalNota)}
                </Text>
              </View>

              <View
                style={[
                  styles.resumoCard,
                  diferenca > 0.01
                    ? styles.resumoCardDanger
                    : diferenca < -0.01
                    ? styles.resumoCardSuccess
                    : null,
                ]}
              >
                <Text style={styles.resumoCardLabel}>Diferença</Text>
                <Text
                  style={[
                    styles.resumoCardValor,
                    diferenca > 0.01
                      ? { color: COLORS.danger }
                      : diferenca < -0.01
                      ? { color: COLORS.success }
                      : { color: COLORS.textSecondary },
                  ]}
                >
                  {diferenca > 0 ? '+' : ''}
                  {formatarMoeda(diferenca)}
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.produtosTitle}>
          Produtos ({produtos.length})
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {produtos.length === 0 ? (
        <View style={styles.emptyContainer}>
          {renderHeader()}
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Nenhum produto adicionado</Text>
            <Text style={styles.emptySubtext}>
              Toque no botão + para adicionar um produto
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          renderItem={renderProduto}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fabNota}
        onPress={() =>
          navigation.navigate('ScanNota', { compraId: compra.id })
        }
      >
        <Text style={styles.fabText}>📄</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('AdicionarProduto', { compraId: compra.id })
        }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: 100,
  },
  resumo: {
    padding: SPACING.md,
  },
  resumoHeader: {
    marginBottom: SPACING.md,
  },
  resumoTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  resumoMercado: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  resumoCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  resumoCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.sm,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  resumoCardDanger: {
    backgroundColor: COLORS.dangerLight,
  },
  resumoCardSuccess: {
    backgroundColor: COLORS.successLight,
  },
  resumoCardLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  resumoCardValor: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  produtosTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  produtoCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  produtoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  produtoFoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  produtoFotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  produtoFotoPlaceholderText: {
    fontSize: 28,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  produtoQtd: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  precosRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  precoBox: {},
  precoLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  precoValor: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  diffBadge: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  diffPositivo: {
    backgroundColor: COLORS.successLight,
  },
  diffNegativo: {
    backgroundColor: COLORS.dangerLight,
  },
  diffText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  diffTextPositivo: {
    color: COLORS.success,
  },
  diffTextNegativo: {
    color: COLORS.danger,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
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
  fabNota: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1565C0',
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
