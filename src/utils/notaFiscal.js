/**
 * Serviço para buscar e parsear dados da NFC-e (Nota Fiscal de Consumidor Eletrônica)
 * a partir da URL contida no QR code da nota.
 *
 * O QR code das NFC-e brasileiras contém uma URL do SEFAZ estadual.
 * Ao acessar, retorna HTML com os produtos, quantidades e preços.
 */

/**
 * Extrai produtos da página HTML da NFC-e.
 * Suporta o layout padrão usado pela maioria dos estados brasileiros.
 */
function parseProdutosHTML(html) {
  const produtos = [];

  // Padrão 1: Layout mais comum — tabela com classe "NFCDetalworhe" ou similar
  // Cada produto aparece em blocos com nome, quantidade, unidade, valor unitário e valor total
  const blocoRegex = /<span[^>]*class="[^"]*txtTit[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const nomeRegex = /<span[^>]*class="[^"]*txtTit2[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  // Tentar padrão da maioria dos estados (SP, RJ, MG, etc)
  // Produtos ficam dentro de <tr> com classe que contém o nome, qtd, unidade, vlr unit, vlr total
  const produtoPattern = /<span[^>]*class="[^"]*txtTit2[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?Qtde\.?[\s]*:[\s]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?Vl\.\s*Unit\.?[\s]*:[\s]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?Vl\.\s*Total[\s]*:?[\s]*<span[^>]*>([\s\S]*?)<\/span>/gi;

  let match;
  while ((match = produtoPattern.exec(html)) !== null) {
    const nome = limparTexto(match[1]);
    const quantidade = parseNumero(match[2]);
    const valorUnitario = parseNumero(match[3]);
    const valorTotal = parseNumero(match[4]);

    if (nome && valorTotal > 0) {
      produtos.push({
        nome,
        quantidade: quantidade || 1,
        valorUnitario: valorUnitario || valorTotal,
        valorTotal,
      });
    }
  }

  // Se o padrão 1 não encontrou, tentar padrão alternativo (alguns estados)
  if (produtos.length === 0) {
    const altPattern = /<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;

    while ((match = altPattern.exec(html)) !== null) {
      const nome = limparTexto(match[1]);
      const quantidade = parseNumero(match[2]);
      const valorUnitario = parseNumero(match[4]);
      const valorTotal = parseNumero(match[5]);

      if (nome && nome.length > 2 && valorTotal > 0 && !nome.match(/^(C[óo]d|UN|Qtd|Vl)/i)) {
        produtos.push({
          nome,
          quantidade: quantidade || 1,
          valorUnitario: valorUnitario || valorTotal,
          valorTotal,
        });
      }
    }
  }

  // Padrão 3: texto puro entre tags, busca por padrões de preço
  if (produtos.length === 0) {
    const lines = html.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
    let currentName = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Linha com nome do produto (geralmente em maiúsculas, sem números de preço)
      if (line.length > 3 && !line.match(/^\d/) && !line.match(/^(Qtd|UN|Vl|Total|CNPJ|CPF|NFC|SAT|Valor|Troco|TOTAL|Dinheiro|Cart|Cr[eé]d|D[eé]b)/i)) {
        // Verificar se a próxima linha parece ter quantidade/valor
        const nextLines = lines.slice(i + 1, i + 5).join(' ');
        const valorMatch = nextLines.match(/(\d+[.,]\d{2})/);
        if (valorMatch) {
          currentName = line;
        }
      }
      // Linha com valor total do produto
      if (currentName && line.match(/(\d+[.,]\d{2})/)) {
        const valores = line.match(/(\d+[.,]\d{2})/g);
        if (valores && valores.length > 0) {
          const valorTotal = parseNumero(valores[valores.length - 1]);
          const quantidade = line.match(/(\d+)\s*x/i);
          const qtd = quantidade ? parseInt(quantidade[1], 10) : 1;

          if (valorTotal > 0 && valorTotal < 10000) {
            produtos.push({
              nome: currentName,
              quantidade: qtd,
              valorUnitario: valorTotal / qtd,
              valorTotal,
            });
            currentName = null;
          }
        }
      }
    }
  }

  return produtos;
}

function limparTexto(texto) {
  return texto
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumero(texto) {
  if (!texto) return 0;
  const limpo = limparTexto(texto).replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

/**
 * Busca a página da NFC-e a partir da URL do QR code e extrai os produtos.
 */
export async function buscarProdutosNota(url) {
  // Validar que é uma URL de NFC-e válida (domínios SEFAZ dos estados)
  const dominiosValidos = [
    'fazenda', 'sefaz', 'nfce', 'sat.sef', 'nfce.svrs',
    'nfe.', 'portalsped', 'dfe-portal',
  ];

  const isUrlValida = dominiosValidos.some((d) => url.toLowerCase().includes(d));
  if (!isUrlValida) {
    throw new Error('QR code não parece ser de uma nota fiscal. Escaneie o QR code da NFC-e.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar a nota fiscal (código ${response.status})`);
    }

    const html = await response.text();
    const produtos = parseProdutosHTML(html);

    if (produtos.length === 0) {
      throw new Error(
        'Não foi possível extrair os produtos da nota. ' +
        'A página pode ter um formato diferente ou estar indisponível.'
      );
    }

    // Extrair total da nota se disponível
    let totalNota = 0;
    const totalMatch = html.match(/Valor\s*total\s*R?\$?\s*([\d.,]+)/i) ||
                       html.match(/TOTAL\s*R?\$?\s*([\d.,]+)/i);
    if (totalMatch) {
      totalNota = parseNumero(totalMatch[1]);
    }

    return {
      produtos,
      totalNota,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Tenta associar automaticamente produtos da nota com produtos da compra.
 * Usa similaridade por nome (palavras em comum).
 */
export function matchProdutos(produtosNota, produtosCompra) {
  return produtosNota.map((pNota) => {
    const palavrasNota = pNota.nome.toLowerCase().split(/\s+/);

    let melhorMatch = null;
    let melhorScore = 0;

    for (const pCompra of produtosCompra) {
      if (!pCompra.nome) continue;
      const palavrasCompra = pCompra.nome.toLowerCase().split(/\s+/);

      // Contar palavras em comum
      let score = 0;
      for (const palavra of palavrasNota) {
        if (palavra.length < 3) continue;
        for (const palavraCompra of palavrasCompra) {
          if (palavraCompra.length < 3) continue;
          if (palavraCompra.includes(palavra) || palavra.includes(palavraCompra)) {
            score += 1;
          }
        }
      }

      // Normalizar pelo total de palavras
      const totalPalavras = Math.max(palavrasNota.length, palavrasCompra.length);
      const scoreNormal = totalPalavras > 0 ? score / totalPalavras : 0;

      if (scoreNormal > melhorScore && scoreNormal > 0.2) {
        melhorScore = scoreNormal;
        melhorMatch = pCompra;
      }
    }

    return {
      produtoNota: pNota,
      produtoCompra: melhorMatch,
      score: melhorScore,
      confirmado: melhorScore > 0.5,
    };
  });
}
