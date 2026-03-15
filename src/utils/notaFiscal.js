/**
 * Serviço para buscar e parsear dados da NFC-e (Nota Fiscal de Consumidor Eletrônica)
 * a partir da URL contida no QR code da nota.
 */

function limparTexto(texto) {
  return texto
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumero(texto) {
  if (!texto) return 0;
  const limpo = limparTexto(texto)
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function adicionarProduto(produtos, nome, quantidade, valorUnitario, valorTotal) {
  nome = limparTexto(nome);
  if (!nome || nome.length < 2) return;
  valorTotal = parseNumero(String(valorTotal));
  valorUnitario = parseNumero(String(valorUnitario));
  quantidade = parseNumero(String(quantidade)) || 1;
  if (valorTotal <= 0 && valorUnitario > 0) valorTotal = valorUnitario * quantidade;
  if (valorTotal <= 0) return;
  if (valorUnitario <= 0) valorUnitario = valorTotal / quantidade;
  produtos.push({ nome, quantidade, valorUnitario, valorTotal });
}

/**
 * Extrai produtos da página HTML da NFC-e.
 * Suporta múltiplos layouts dos diferentes SEFAZs estaduais.
 */
function parseProdutosHTML(html) {
  let produtos = [];

  // === PADRÃO 1: SP/MG/RJ e muitos estados (txtTit2 + Qtde/Vl.Unit/Vl.Total) ===
  const p1 = /<span[^>]*class="[^"]*txtTit2[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?Qtde\.?[\s:]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?Vl\.?\s*Unit\.?[\s:]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?Vl\.?\s*Total[\s:]*<span[^>]*>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = p1.exec(html)) !== null) {
    adicionarProduto(produtos, m[1], m[2], m[3], m[4]);
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 2: Variação com "Quantidade", "Valor Unitário", "Valor Total" por extenso ===
  const p2 = /<span[^>]*class="[^"]*txtTit2[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?(?:Quantidade|Qtd)[\s:]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?(?:Valor\s*(?:Unit[áa]rio)?|Vl?\.\s*Unit)[\s:]*<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?(?:Valor\s*Total|Vl?\.\s*Total)[\s:]*<span[^>]*>([\s\S]*?)<\/span>/gi;
  while ((m = p2.exec(html)) !== null) {
    adicionarProduto(produtos, m[1], m[2], m[3], m[4]);
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 3: Blocos com classe "det" ou "prod" — layout MT, GO, DF ===
  const p3 = /class="[^"]*(?:det|prod|item)[^"]*"[^>]*>[\s\S]*?<(?:span|div|td)[^>]*>([\s\S]*?)<\/(?:span|div|td)>[\s\S]*?(\d[\d.,]*)\s*(?:UN|KG|PC|LT|CX|GR|ML|MT|M2|M3|DZ|PAR|BD|FR|GL|SC|TN|CT)[\s\S]*?(\d[\d.,]*)\s*[\s\S]*?(\d[\d.,]*)/gi;
  while ((m = p3.exec(html)) !== null) {
    adicionarProduto(produtos, m[1], m[2], m[3], m[4]);
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 4: Tabela HTML com colunas (Nome | Qtd | UN | Vl.Unit | Vl.Total) ===
  const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of tableRows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (cells.length >= 4) {
      const textos = cells.map(c => limparTexto(c));
      // Pular cabeçalhos
      if (textos[0].match(/^(C[óo]d|Item|Produto|Descri|#|N[úu]m)/i)) continue;
      // Tentar extrair nome e valores
      const nome = textos[0];
      const nums = textos.slice(1).map(t => parseNumero(t)).filter(v => v > 0);
      if (nome.length > 2 && nums.length >= 2) {
        const valorTotal = nums[nums.length - 1];
        const valorUnit = nums.length >= 3 ? nums[nums.length - 2] : valorTotal;
        const qtd = nums.length >= 3 ? nums[0] : 1;
        adicionarProduto(produtos, nome, qtd, valorUnit, valorTotal);
      }
    }
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 5: Divs ou spans sequenciais com dados do produto ===
  // Formato: "Nome do Produto" seguido de "Código: X | Qtde: X | Vl. Unit.: X | Vl. Total: X"
  const p5 = /(?:xProd|descricao|nome_produto|nmprod)[^>]*>([^<]+)<[\s\S]*?(?:qCom|quantidade|qtd)[^>]*>([^<]+)<[\s\S]*?(?:vUnCom|valor_unit|vlunit)[^>]*>([^<]+)<[\s\S]*?(?:vProd|valor_total|vltotal)[^>]*>([^<]+)</gi;
  while ((m = p5.exec(html)) !== null) {
    adicionarProduto(produtos, m[1], m[2], m[3], m[4]);
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 6: Layout RS (SVRS) — id="tabResult" com divs ===
  const p6 = /class="[^"]*(?:NFCDetalhe_Item|txtTit|RCod|descricao)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/gi;
  const blocos6 = [];
  while ((m = p6.exec(html)) !== null) {
    blocos6.push(limparTexto(m[1]));
  }
  // Agrupar: sequências de [nome, cod, qtd, un, vlUnit, vlTotal]
  if (blocos6.length >= 4) {
    for (let i = 0; i < blocos6.length; i++) {
      const text = blocos6[i];
      if (text.length > 3 && !text.match(/^\d/) && !text.match(/^(Qtd|UN|Vl|Val|Cod|CNPJ)/i)) {
        const next = blocos6.slice(i + 1, i + 8).join(' ');
        const vals = next.match(/(\d[\d.,]*)/g);
        if (vals && vals.length >= 2) {
          const numVals = vals.map(v => parseNumero(v)).filter(v => v > 0);
          if (numVals.length >= 2) {
            const valorTotal = numVals[numVals.length - 1];
            const valorUnit = numVals.length >= 3 ? numVals[numVals.length - 2] : valorTotal;
            const qtd = numVals.length >= 3 ? numVals[0] : 1;
            if (valorTotal > 0 && valorTotal < 50000) {
              adicionarProduto(produtos, text, qtd, valorUnit, valorTotal);
              i += Math.min(5, vals.length);
            }
          }
        }
      }
    }
  }
  if (produtos.length > 0) return produtos;

  // === PADRÃO 7: Texto puro — fallback genérico ===
  // Extrair todo o texto do HTML e buscar padrões comuns de produto + valor
  const textoLimpo = html.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n');
  const lines = textoLimpo.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Palavras que indicam que NÃO é um produto
  const naoEhProduto = /^(CNPJ|CPF|NFC-?e|SAT|CF-?e|Valor|Troco|TOTAL|Dinheiro|Cart[aã]o|Cr[eé]d|D[eé]b|Chave|Protocolo|Data|Hora|S[eé]rie|N[úu]mero|Consumidor|Endere[cç]o|Tribut|Informa|ICMS|QR\s*Code|Consulte|www\.|http|Notas?\s*Fiscal|Emiss[aã]o|Autoriza|\.gov\.|SEFAZ|Secretaria|Fone|Tel|CEP|Bairro|Munic[ií]pio|Estado|UF|DANFE|Via|Observa)/i;

  let currentName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Possível nome de produto: texto sem ser número, sem ser campo auxiliar
    if (
      line.length > 3 &&
      !line.match(/^\d+[.,]\d{2}$/) &&
      !line.match(/^\d+$/) &&
      !naoEhProduto.test(line)
    ) {
      // Verificar se PROXIMHAS linhas contém valores monetários
      const lookahead = lines.slice(i + 1, i + 6).join(' | ');
      if (lookahead.match(/\d+[.,]\d{2}/)) {
        currentName = line;
        continue;
      }
    }

    // Busca por "Qtde.: X   Vl. Unit.: X   Vl. Total X" na mesma linha
    const inlineMatch = line.match(/(\d[\d.,]*)\s*(?:UN|KG|PC|LT|CX|GR|ML|MT|M2|M3|DZ|PAR)?[\s]*.*?(\d[\d.,]+)\s*.*?(\d[\d.,]+)\s*$/i);
    if (currentName && inlineMatch) {
      adicionarProduto(produtos, currentName, inlineMatch[1], inlineMatch[2], inlineMatch[3]);
      currentName = null;
      continue;
    }

    // Linha com valores monetários: "1    UN    5,99    5,99"
    if (currentName) {
      const valores = line.match(/(\d[\d.,]*)/g);
      if (valores && valores.length >= 2) {
        const numVals = valores.map(v => parseNumero(v)).filter(v => v > 0);
        if (numVals.length >= 2) {
          const valorTotal = numVals[numVals.length - 1];
          const valorUnit = numVals.length >= 3 ? numVals[numVals.length - 2] : valorTotal;
          const qtd = numVals.length >= 3 ? numVals[0] : 1;
          if (valorTotal > 0 && valorTotal < 50000) {
            adicionarProduto(produtos, currentName, qtd, valorUnit, valorTotal);
            currentName = null;
            continue;
          }
        }
      }
    }
  }

  return produtos;
}

/**
 * Extrai um trecho do texto para debug quando o parsing falha.
 */
function extrairTrechoDebug(html) {
  const texto = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  const lines = texto.split('\n').map(l => l.trim()).filter(l => l.length > 1);
  return lines.slice(0, 60).join('\n');
}

/**
 * Busca a página da NFC-e a partir da URL do QR code e extrai os produtos.
 */
export async function buscarProdutosNota(url) {
  // Validar que é uma URL de NFC-e válida
  const dominiosValidos = [
    'fazenda', 'sefaz', 'nfce', 'sat.sef', 'nfce.svrs',
    'nfe.', 'portalsped', 'dfe-portal', '.gov.br',
    'consultadanfe', 'nfce.encat',
  ];

  const isUrlValida = dominiosValidos.some((d) => url.toLowerCase().includes(d));
  if (!isUrlValida) {
    throw new Error('QR code não parece ser de uma nota fiscal. Escaneie o QR code da NFC-e.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let html = '';
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar a nota fiscal (código ${response.status}). Tente digitar a URL manualmente.`);
    }

    html = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('A consulta demorou muito. O site do SEFAZ pode estar lento. Tente novamente.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  // Detectar bloqueios de SEFAZ (IP bloqueado, CAPTCHA, manutenção, etc.)
  const htmlLower = html.toLowerCase();
  const bloqueios = [
    { padrao: /bloqueio|bloqueia|endere[çc]o\s*ip|ip.*listado|ip.*bloqueado/i, tipo: 'IP_BLOCKED' },
    { padrao: /captcha|recaptcha|g-recaptcha|hcaptcha|desafio.*seguran/i, tipo: 'CAPTCHA' },
    { padrao: /manuten[çc][aã]o|indispon[ií]vel|fora\s*do\s*ar|system.*unavailable/i, tipo: 'MANUTENCAO' },
    { padrao: /403\s*forbidden|access\s*denied|acesso\s*negado/i, tipo: 'ACESSO_NEGADO' },
  ];

  for (const { padrao, tipo } of bloqueios) {
    if (padrao.test(html)) {
      const err = new Error(
        tipo === 'IP_BLOCKED'
          ? 'O site do SEFAZ bloqueou o acesso porque seu IP de dados móveis está numa lista de bloqueio.\n\n' +
            'Soluções:\n' +
            '• Conecte-se a uma rede Wi-Fi e tente novamente\n' +
            '• Abra o link no navegador do celular (botão abaixo)\n' +
            '• Cole o texto da nota manualmente'
          : tipo === 'CAPTCHA'
          ? 'O site do SEFAZ exige verificação de segurança (CAPTCHA).\n\n' +
            'Abra o link no navegador, resolva o CAPTCHA, e depois cole o texto dos produtos.'
          : tipo === 'MANUTENCAO'
          ? 'O site do SEFAZ está em manutenção. Tente novamente mais tarde.'
          : 'Acesso negado pelo site do SEFAZ. Tente via Wi-Fi ou abra no navegador.'
      );
      err.tipo = tipo;
      err.url = url;
      throw err;
    }
  }

  const produtos = parseProdutosHTML(html);

  if (produtos.length === 0) {
    const trecho = extrairTrechoDebug(html);
    const err = new Error(
      'Não foi possível extrair os produtos da nota.\n\n' +
      'Conteúdo da página:\n' +
      '─────────────────\n' +
      trecho.substring(0, 800) + '\n' +
      '─────────────────\n\n' +
      'Copie esta mensagem e envie para ajuste do parser.'
    );
    err.tipo = 'PARSE_FAILED';
    err.url = url;
    throw err;
  }

  // Extrair total da nota
  let totalNota = 0;
  const totalPatterns = [
    /Valor\s*(?:total|a\s*pagar)\s*(?:R\$|:)?\s*([\d.,]+)/i,
    /TOTAL\s*(?:R\$|:)?\s*([\d.,]+)/i,
    /vNF[^>]*>([\d.,]+)/i,
    /Valor\s*Total\s*da\s*Nota[\s\S]*?([\d.,]+)/i,
  ];
  for (const pattern of totalPatterns) {
    const totalMatch = html.match(pattern);
    if (totalMatch) {
      totalNota = parseNumero(totalMatch[1]);
      if (totalNota > 0) break;
    }
  }

  return { produtos, totalNota, url };
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

/**
 * Parseia texto colado pelo usuário (copiado do navegador) para extrair produtos.
 * Suporta vários formatos comuns de texto de NFC-e.
 */
export function parseProdutosTexto(texto) {
  const produtos = [];
  const lines = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const naoEhProduto = /^(CNPJ|CPF|NFC-?e|SAT|CF-?e|Valor|Troco|TOTAL|Dinheiro|Cart[aã]o|Cr[eé]d|D[eé]b|Chave|Protocolo|Data|Hora|S[eé]rie|N[úu]mero|Consumidor|Endere[cç]o|Tribut|Informa|ICMS|QR\s*Code|Consulte|www\.|http|Notas?\s*Fiscal|Emiss[aã]o|Autoriza|\.gov\.|SEFAZ|Secretaria|Fone|Tel|CEP|Bairro|Munic[ií]pio|Estado|UF|DANFE|Via|Observa|Forma.*Pagamento|Bandeira)/i;

  let currentName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Padrão: "NOME DO PRODUTO" numa linha, "Qtde.: 1 UN x Vl. Unit.: 5,99 = Vl. Total: 5,99" na próxima
    const qtdeMatch = line.match(/(?:Qtde?\.?|Quantidade)[\s:]*(\d[\d.,]*)\s*(?:UN|KG|PC|LT|CX|GR|ML|MT|M2|M3|DZ|PAR|BD|FR|GL|SC|TN|CT)?\s*(?:x|X|\*)?\s*(?:Vl?\.?\s*(?:Unit|unit)\.?[\s:]*)?([\d.,]+)?\s*(?:=|Vl?\.?\s*(?:Total|total)[\s:]*)([\d.,]+)/i);
    if (currentName && qtdeMatch) {
      adicionarProduto(produtos, currentName, qtdeMatch[1], qtdeMatch[2] || qtdeMatch[3], qtdeMatch[3]);
      currentName = null;
      continue;
    }

    // Padrão: tudo numa linha "1 UN x 5,99 (=5,99)"
    if (currentName) {
      const inlineMatch = line.match(/(\d[\d.,]*)\s*(?:UN|KG|PC|LT|CX)?\s*(?:x|X|\*)\s*(\d[\d.,]+)\s*(?:=\s*)?(\d[\d.,]+)?/);
      if (inlineMatch) {
        const vTotal = inlineMatch[3] || inlineMatch[2];
        adicionarProduto(produtos, currentName, inlineMatch[1], inlineMatch[2], vTotal);
        currentName = null;
        continue;
      }

      // Padrão: apenas valores numéricos na linha seguinte
      const valores = line.match(/(\d[\d.,]*)/g);
      if (valores && valores.length >= 2) {
        const numVals = valores.map(v => parseNumero(v)).filter(v => v > 0);
        if (numVals.length >= 2 && numVals[numVals.length - 1] < 50000) {
          const valorTotal = numVals[numVals.length - 1];
          const valorUnit = numVals.length >= 3 ? numVals[numVals.length - 2] : valorTotal;
          const qtd = numVals.length >= 3 ? numVals[0] : 1;
          adicionarProduto(produtos, currentName, qtd, valorUnit, valorTotal);
          currentName = null;
          continue;
        }
      }
    }

    // Candidato a nome de produto
    if (
      line.length > 3 &&
      !line.match(/^\d+[.,]\d{2}$/) &&
      !line.match(/^\d+$/) &&
      !naoEhProduto.test(line)
    ) {
      const lookahead = lines.slice(i + 1, i + 4).join(' ');
      if (lookahead.match(/\d+[.,]\d{2}/)) {
        currentName = line;
      }
    }
  }

  return produtos;
}
