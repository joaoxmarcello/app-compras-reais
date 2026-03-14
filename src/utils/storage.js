import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@compras_reais_compras';

export async function getCompras() {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function salvarCompras(compras) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(compras));
}

export async function criarCompra(compra) {
  const compras = await getCompras();
  compras.unshift(compra);
  await salvarCompras(compras);
  return compras;
}

export async function atualizarCompra(compraAtualizada) {
  const compras = await getCompras();
  const index = compras.findIndex((c) => c.id === compraAtualizada.id);
  if (index !== -1) {
    compras[index] = compraAtualizada;
    await salvarCompras(compras);
  }
  return compras;
}

export async function excluirCompra(compraId) {
  const compras = await getCompras();
  const filtradas = compras.filter((c) => c.id !== compraId);
  await salvarCompras(filtradas);
  return filtradas;
}

export function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function calcularTotalPrateleira(produtos) {
  return produtos.reduce((acc, p) => acc + (p.precoPrateleira || 0) * (p.quantidade || 1), 0);
}

export function calcularTotalNota(produtos) {
  return produtos.reduce((acc, p) => acc + (p.precoNota || 0) * (p.quantidade || 1), 0);
}

export function calcularDiferenca(produtos) {
  return calcularTotalNota(produtos) - calcularTotalPrateleira(produtos);
}
