import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { getCompras, atualizarCompra, formatarMoeda } from '../utils/storage';
import { matchProdutos } from '../utils/notaFiscal';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

export default function MatchProdutosScreen({ route, navigation }) {
  const { compraId, produtosNota, totalNota } = route.params;
  const [compra, setCompra] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    carregarCompra();
  }, []);

  async function carregarCompra() {
    const compras = await getCompras();
    const encontrada = compras.find((c) => c.id === compraId);
    if (encontrada) {
      setCompra(encontrada);
      const matchList = matchProdutos(produtosNota, encontrada.produtos || []);
      setMatches(matchList);
    }
  }

  function selecionarProdutoCompra(indexNota, produtoCompra) {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === indexNota
          ? { ...m, produtoCompra, confirmado: true }
          : m
      )
    );
  }

  function desselecionarMatch(indexNota) {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === indexNota
          ? { ...m, produtoCompra: null, confirmado: false, score: 0 }
          : m
      )
    );
  }

  function ignorarProduto(indexNota) {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === indexNota
          ? { ...m, produtoCompra: null, confirmado: false, ignorado: true }
          : m
      )
    );
  }

  function restaurarProduto(indexNota) {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === indexNota
          ? { ...m, ignorado: false }
          : m
      )
    );
  }

  async function aplicarPrecos() {
    if (!compra) return;

    const matchesAtivos = matches.filter((m) => m.produtoCompra && !m.ignorado);

    if (matchesAtivos.length === 0) {
      Alert.alert('Atenção', 'Nenhum produto foi associado. Associe pelo menos um produto da nota com um produto da compra.');
      return;
    }

    const atualizada = { ...compra };
    atualizada.produtos = atualizada.produtos.map((p) => {
      const match = matchesAtivos.find((m) => m.produtoCompra && m.produtoCompra.id === p.id);
      if (match) {
        return {
          ...p,
          precoNota: match.produtoNota.valorUnitario,
          nomeNota: match.produtoNota.nome,
        };
      }
      return p;
    });

    await atualizarCompra(atualizada);

    Alert.alert(
      'Preços atualizados!',
      `${matchesAtivos.length} produto(s) tiveram o preço da nota preenchido automaticamente.`,
      [{ text: 'OK', onPress: () => navigation.navigate('DetalhesCompra', { compraId }) }]
    );
  }

  function produtosCompraDisponiveis(indexAtual) {
    if (!compra) return [];
    const jaAssociados = new Set();
    matches.forEach((m, i) => {
      if (i !== indexAtual && m.produtoCompra && !m.ignorado) {
        jaAssociados.add(m.produtoCompra.id);
      }
    });
    return (compra.produtos || []).filter((p) => !jaAssociados.has(p.id));
  }

  const [expandido, setExpandido] = useState(null);

  function renderMatch({ item, index }) {
    const { produtoNota, produtoCompra, confirmado, ignorado } = item;
    const isExpandido = expandido === index;

    if (ignorado) {
      return (
        <TouchableOpacity
          style={[styles.matchCard, styles.matchCardIgnorado]}
          onPress={() => restaurarProduto(index)}
        >
          <Text style={styles.ignoradoText}>
            ✖ {produtoNota.nome} — ignorado (toque para restaurar)
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.matchCard, confirmado && styles.matchCardConfirmado]}>
        {/* Produto da Nota */}
        <View style={styles.notaSection}>
          <Text style={styles.sectionLabel}>📄 NOTA FISCAL</Text>
          <Text style={styles.notaNome} numberOfLines={2}>{produtoNota.nome}</Text>
          <View style={styles.notaDetalhes}>
            <Text style={styles.notaDetalhe}>
              Qtd: {produtoNota.quantidade}
            </Text>
            <Text style={styles.notaDetalhe}>
              Unit: {formatarMoeda(produtoNota.valorUnitario)}
            </Text>
            <Text style={[styles.notaDetalhe, styles.notaTotal]}>
              Total: {formatarMoeda(produtoNota.valorTotal)}
            </Text>
          </View>
        </View>

        {/* Seta de associação */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>{confirmado ? '✅' : '↕️'}</Text>
        </View>

        {/* Produto da Compra (associado) */}
        {produtoCompra ? (
          <TouchableOpacity
            style={styles.compraSection}
            onPress={() => desselecionarMatch(index)}
          >
            <Text style={styles.sectionLabel}>🛒 SUA COMPRA</Text>
            <Text style={styles.compraNome} numberOfLines={1}>
              {produtoCompra.nome}
            </Text>
            <Text style={styles.compraPreco}>
              Prateleira: {formatarMoeda(produtoCompra.precoPrateleira || 0)}
            </Text>
            <Text style={styles.compraTrocar}>Toque para trocar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.compraSectionVazia}
            onPress={() => setExpandido(isExpandido ? null : index)}
          >
            <Text style={styles.sectionLabel}>🛒 SUA COMPRA</Text>
            <Text style={styles.associarText}>
              Toque para associar um produto
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista de produtos para selecionar */}
        {isExpandido && !produtoCompra && (
          <View style={styles.selecionarLista}>
            {produtosCompraDisponiveis(index).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.selecionarItem}
                onPress={() => {
                  selecionarProdutoCompra(index, p);
                  setExpandido(null);
                }}
              >
                <Text style={styles.selecionarNome} numberOfLines={1}>
                  {p.nome}
                </Text>
                <Text style={styles.selecionarPreco}>
                  {formatarMoeda(p.precoPrateleira || 0)}
                </Text>
              </TouchableOpacity>
            ))}
            {produtosCompraDisponiveis(index).length === 0 && (
              <Text style={styles.semProdutos}>
                Todos os produtos já foram associados
              </Text>
            )}
          </View>
        )}

        {/* Botão ignorar */}
        {!produtoCompra && (
          <TouchableOpacity
            style={styles.ignorarBtn}
            onPress={() => ignorarProduto(index)}
          >
            <Text style={styles.ignorarBtnText}>Ignorar este item</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const totalAssociados = matches.filter((m) => m.produtoCompra && !m.ignorado).length;
  const totalIgnorados = matches.filter((m) => m.ignorado).length;

  return (
    <View style={styles.container}>
      {/* Header com resumo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Associar Produtos</Text>
        <Text style={styles.headerSubtitle}>
          {produtosNota.length} itens na nota
          {totalNota > 0 ? ` • Total: ${formatarMoeda(totalNota)}` : ''}
        </Text>
        <View style={styles.headerCounts}>
          <Text style={[styles.headerCount, { color: COLORS.success }]}>
            ✅ {totalAssociados} associados
          </Text>
          <Text style={[styles.headerCount, { color: COLORS.textSecondary }]}>
            ✖ {totalIgnorados} ignorados
          </Text>
        </View>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderMatch}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.aplicarBtn, totalAssociados === 0 && styles.aplicarBtnDisabled]}
          onPress={aplicarPrecos}
          disabled={totalAssociados === 0}
        >
          <Text style={styles.aplicarBtnText}>
            Aplicar Preços ({totalAssociados} {totalAssociados === 1 ? 'produto' : 'produtos'})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerCounts: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  headerCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
  },
  matchCardConfirmado: {
    borderLeftColor: COLORS.success,
  },
  matchCardIgnorado: {
    opacity: 0.5,
    padding: SPACING.sm,
    borderLeftColor: COLORS.disabled,
  },
  ignoradoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  notaSection: {
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  notaNome: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  notaDetalhes: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  notaDetalhe: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  notaTotal: {
    fontWeight: '700',
    color: COLORS.accent,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  arrow: {
    fontSize: 20,
  },
  compraSection: {
    backgroundColor: COLORS.successLight,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  compraNome: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  compraPreco: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  compraTrocar: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  compraSectionVazia: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 8,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  associarText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.warning,
    fontWeight: '600',
  },
  selecionarLista: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.xs,
    maxHeight: 200,
  },
  selecionarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selecionarNome: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    flex: 1,
  },
  selecionarPreco: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  semProdutos: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.md,
  },
  ignorarBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-end',
  },
  ignorarBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
  },
  aplicarBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  aplicarBtnDisabled: {
    backgroundColor: COLORS.disabled,
  },
  aplicarBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
