# 🛒 Compras Reais

App mobile para comparar os preços da prateleira do supermercado com os valores cobrados na nota fiscal.

## Funcionalidades

- **Criar compras** — registre cada ida ao supermercado
- **Adicionar produtos** — por foto (câmera) ou digitação manual
- **Preço da prateleira** — registre o valor que está na etiqueta
- **Preço da nota fiscal** — depois da compra, confira a nota e registre
- **Comparação automática** — veja se foi cobrado acima ou abaixo do preço exibido
- **Resumo com totais** — veja o total da prateleira vs total da nota

## Pré-requisitos

1. **Node.js** (v18+): Baixe em https://nodejs.org/
2. **Expo Go** no celular: Baixe na App Store (iOS) ou Play Store (Android)

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o app
npx expo start
```

3. Escaneie o QR code que aparece no terminal com o app **Expo Go** no celular

## Estrutura do Projeto

```
compras-reais/
├── App.js                          # Ponto de entrada + Navegação
├── app.json                        # Configurações do Expo
├── package.json                    # Dependências
└── src/
    ├── screens/
    │   ├── HomeScreen.js           # Lista de compras
    │   ├── NovaCompraScreen.js     # Criar nova compra
    │   ├── DetalhesCompraScreen.js # Detalhes + lista de produtos
    │   └── AdicionarProdutoScreen.js # Adicionar/editar produto
    └── utils/
        ├── storage.js              # AsyncStorage + funções de cálculo
        └── theme.js                # Cores e espaçamentos
```

## Como usar

1. Toque em **+** para criar uma nova compra
2. Dê um nome (ex: "Compra semanal") e opcionalmente o nome do mercado
3. Na tela da compra, toque em **+** para adicionar produtos
4. Para cada produto:
   - **Tire uma foto** da etiqueta ou do produto na prateleira
   - **Digite o nome** e o **preço da prateleira**
   - Depois, ao conferir a nota fiscal, edite o produto e preencha o **preço da nota**
5. O app calcula automaticamente a diferença entre prateleira e nota

## Dicas

- **Pressione e segure** um produto ou compra para excluir
- **Toque** em um produto para editar os valores
- A cor verde no resumo indica que a nota foi mais barata que a prateleira
- A cor vermelha indica que a nota foi mais cara
