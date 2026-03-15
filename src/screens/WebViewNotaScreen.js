import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

/**
 * JavaScript injetado na WebView para extrair produtos da página NFC-e.
 * Roda dentro do contexto do navegador, com acesso ao DOM real.
 */
const INJECTION_JS = `
(function() {
  // Evitar re-execução
  if (window.__extracaoFeita) return;

  function tentarExtrair() {
    var produtos = [];

    // === PADRÃO 1: span.txtTit2 (SP, RJ, MG e maioria dos estados) ===
    var nomes = document.querySelectorAll('.txtTit2');
    if (nomes.length > 0) {
      nomes.forEach(function(el) {
        var bloco = el.closest('tr') || el.closest('div') || el.parentElement.parentElement;
        if (!bloco) return;
        var texto = bloco.innerText || bloco.textContent || '';
        var nome = (el.innerText || el.textContent || '').trim();
        if (!nome || nome.length < 2) return;

        var qtdMatch = texto.match(/Qtde?\\.?[:\\s]*(\\d[\\d.,]*)/i);
        var unitMatch = texto.match(/Vl?\\.?\\s*Unit\\.?[:\\s]*(\\d[\\d.,]*)/i);
        var totalMatch = texto.match(/Vl?\\.?\\s*Total[:\\s]*(\\d[\\d.,]*)/i);

        if (totalMatch) {
          produtos.push({
            nome: nome,
            quantidade: qtdMatch ? qtdMatch[1] : '1',
            valorUnitario: unitMatch ? unitMatch[1] : totalMatch[1],
            valorTotal: totalMatch[1]
          });
        }
      });
    }

    // === PADRÃO 2: Tabela com linhas de produtos ===
    if (produtos.length === 0) {
      var tables = document.querySelectorAll('table');
      tables.forEach(function(table) {
        var rows = table.querySelectorAll('tr');
        rows.forEach(function(row) {
          var cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            var textos = Array.from(cells).map(function(c) { return (c.innerText || '').trim(); });
            var nome = textos[0];
            if (!nome || nome.length < 3) return;
            if (/^(C[oó]d|Item|Produto|Descri|#|Qtd|UN|Vl)/i.test(nome)) return;
            var nums = textos.slice(1).map(function(t) {
              return parseFloat(t.replace(/\\./g,'').replace(',','.')) || 0;
            }).filter(function(v) { return v > 0; });
            if (nums.length >= 2) {
              var vTotal = nums[nums.length - 1];
              var vUnit = nums.length >= 3 ? nums[nums.length - 2] : vTotal;
              var qtd = nums.length >= 3 ? nums[0] : 1;
              produtos.push({
                nome: nome, quantidade: String(qtd),
                valorUnitario: String(vUnit), valorTotal: String(vTotal)
              });
            }
          }
        });
      });
    }

    // === PADRÃO 3: divs com classes de produto ===
    if (produtos.length === 0) {
      var seletores = ['.det', '.prod', '.item', '[class*="produto"]', '[class*="Detalhe"]'];
      seletores.forEach(function(sel) {
        if (produtos.length > 0) return;
        var els = document.querySelectorAll(sel);
        els.forEach(function(el) {
          var texto = (el.innerText || el.textContent || '').trim();
          if (texto.length < 10) return;
          var lines = texto.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
          if (lines.length < 2) return;
          var nome = lines[0];
          if (/^\\d+[.,]\\d{2}$/.test(nome)) return;
          var rest = lines.slice(1).join(' ');
          var vals = rest.match(/(\\d[\\d.,]*)/g);
          if (vals && vals.length >= 2) {
            var numVals = vals.map(function(v) {
              return parseFloat(v.replace(/\\./g,'').replace(',','.')) || 0;
            }).filter(function(v) { return v > 0; });
            if (numVals.length >= 2) {
              var vTotal = numVals[numVals.length - 1];
              var vUnit = numVals.length >= 3 ? numVals[numVals.length - 2] : vTotal;
              var qtd = numVals.length >= 3 ? numVals[0] : 1;
              if (vTotal > 0 && vTotal < 50000) {
                produtos.push({
                  nome: nome, quantidade: String(qtd),
                  valorUnitario: String(vUnit), valorTotal: String(vTotal)
                });
              }
            }
          }
        });
      });
    }

    // === PADRÃO 4: Texto genérico — última tentativa ===
    if (produtos.length === 0) {
      var body = document.body.innerText || '';
      var allLines = body.split('\\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
      var naoEhProduto = /^(CNPJ|CPF|NFC|SAT|CF-?e|Valor|Troco|TOTAL|Dinheiro|Cart|Cred|Deb|Chave|Protocolo|Data|Hora|Serie|Numero|Consumidor|Enderec|Tribut|Informa|ICMS|QR|Consulte|www\\.|http|Nota|Emiss|Autoriza|SEFAZ|Secretaria|Fone|Tel|CEP|Bairro|Munic|Estado|UF|DANFE)/i;
      var curName = null;
      for (var i = 0; i < allLines.length; i++) {
        var line = allLines[i];
        if (line.length > 3 && !/^\\d+[.,]\\d{2}$/.test(line) && !/^\\d+$/.test(line) && !naoEhProduto.test(line)) {
          var look = allLines.slice(i+1, i+4).join(' ');
          if (/\\d+[.,]\\d{2}/.test(look)) { curName = line; continue; }
        }
        if (curName) {
          var lineVals = line.match(/(\\d[\\d.,]*)/g);
          if (lineVals && lineVals.length >= 2) {
            var nv = lineVals.map(function(v) { return parseFloat(v.replace(/\\./g,'').replace(',','.')) || 0; }).filter(function(v) { return v > 0; });
            if (nv.length >= 2 && nv[nv.length-1] < 50000) {
              produtos.push({
                nome: curName, quantidade: String(nv.length >= 3 ? nv[0] : 1),
                valorUnitario: String(nv.length >= 3 ? nv[nv.length-2] : nv[nv.length-1]),
                valorTotal: String(nv[nv.length-1])
              });
              curName = null;
            }
          }
        }
      }
    }

    // Extrair total
    var totalNota = 0;
    var bodyText = document.body.innerText || '';
    var totalMatch = bodyText.match(/Valor\\s*(?:total|a\\s*pagar)[^\\d]*(\\d[\\d.,]*)/i) ||
                     bodyText.match(/TOTAL[^\\d]*(\\d[\\d.,]*)/i);
    if (totalMatch) {
      totalNota = parseFloat(totalMatch[1].replace(/\\./g,'').replace(',','.')) || 0;
    }

    return { produtos: produtos, totalNota: totalNota };
  }

  // Tentar extrair quando a página terminar de carregar
  function enviar() {
    var result = tentarExtrair();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PRODUTOS',
      data: result
    }));
  }

  // Tentar imediatamente
  var result = tentarExtrair();
  if (result.produtos.length > 0) {
    window.__extracaoFeita = true;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PRODUTOS',
      data: result
    }));
  } else {
    // Informar que a página carregou mas sem produtos ainda
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_LOADED',
      hasProducts: false,
      title: document.title || '',
      textPreview: (document.body.innerText || '').substring(0, 200)
    }));
  }
})();
true;
`;

export default function WebViewNotaScreen({ route, navigation }) {
  const { compraId, url } = route.params;
  const [status, setStatus] = useState('loading'); // loading | ready | extracting | error
  const [statusMsg, setStatusMsg] = useState('Carregando página do SEFAZ...');
  const webviewRef = useRef(null);

  function parseNumero(texto) {
    if (!texto) return 0;
    const limpo = String(texto).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  }

  function processarProdutos(data) {
    const produtos = (data.produtos || []).map(p => ({
      nome: (p.nome || '').trim(),
      quantidade: parseNumero(p.quantidade) || 1,
      valorUnitario: parseNumero(p.valorUnitario),
      valorTotal: parseNumero(p.valorTotal),
    })).filter(p => p.nome.length > 1 && p.valorTotal > 0);

    if (produtos.length > 0) {
      navigation.replace('MatchProdutos', {
        compraId,
        produtosNota: produtos,
        totalNota: data.totalNota || 0,
      });
    } else {
      setStatus('ready');
      setStatusMsg('Não encontrei produtos. Aguarde a página carregar completamente, depois toque "Extrair".');
    }
  }

  function onMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'PRODUTOS' && msg.data) {
        if (msg.data.produtos && msg.data.produtos.length > 0) {
          setStatus('extracting');
          setStatusMsg(`${msg.data.produtos.length} produtos encontrados!`);
          setTimeout(() => processarProdutos(msg.data), 500);
        } else {
          setStatus('ready');
          setStatusMsg('Página carregada. Se os produtos estão visíveis, toque "Extrair".');
        }
      } else if (msg.type === 'PAGE_LOADED') {
        setStatus('ready');
        setStatusMsg('Página carregada. Se os produtos estão visíveis, toque "Extrair".');
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  function extrairManual() {
    setStatus('extracting');
    setStatusMsg('Extraindo produtos...');
    webviewRef.current?.injectJavaScript(`
      window.__extracaoFeita = false;
      ${INJECTION_JS}
    `);
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        {status === 'loading' && <ActivityIndicator size="small" color="#fff" />}
        {status === 'extracting' && <ActivityIndicator size="small" color="#fff" />}
        <Text style={styles.statusText} numberOfLines={2}>{statusMsg}</Text>
        {status === 'ready' && (
          <TouchableOpacity style={styles.extractBtn} onPress={extrairManual}>
            <Text style={styles.extractBtnText}>Extrair</Text>
          </TouchableOpacity>
        )}
      </View>
      <WebView
        ref={webviewRef}
        source={{ uri: url }}
        style={styles.webview}
        onMessage={onMessage}
        injectedJavaScript={INJECTION_JS}
        onLoadEnd={() => {
          if (status === 'loading') {
            setStatus('ready');
            setStatusMsg('Página carregada. Se os produtos estão visíveis, toque "Extrair".');
          }
        }}
        onError={() => {
          setStatus('error');
          setStatusMsg('Erro ao carregar. Verifique sua conexão.');
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Abrindo página do SEFAZ...</Text>
          </View>
        )}
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  statusText: {
    flex: 1,
    color: '#fff',
    fontSize: FONT_SIZE.sm,
  },
  extractBtn: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  extractBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
});
