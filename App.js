import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import NovaCompraScreen from './src/screens/NovaCompraScreen';
import DetalhesCompraScreen from './src/screens/DetalhesCompraScreen';
import AdicionarProdutoScreen from './src/screens/AdicionarProdutoScreen';
import ScanNotaScreen from './src/screens/ScanNotaScreen';
import WebViewNotaScreen from './src/screens/WebViewNotaScreen';
import MatchProdutosScreen from './src/screens/MatchProdutosScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#2E7D32' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Compras Reais' }}
          />
          <Stack.Screen
            name="NovaCompra"
            component={NovaCompraScreen}
            options={{ title: 'Nova Compra' }}
          />
          <Stack.Screen
            name="DetalhesCompra"
            component={DetalhesCompraScreen}
            options={{ title: 'Detalhes da Compra' }}
          />
          <Stack.Screen
            name="AdicionarProduto"
            component={AdicionarProdutoScreen}
            options={{ title: 'Adicionar Produto' }}
          />
          <Stack.Screen
            name="ScanNota"
            component={ScanNotaScreen}
            options={{ title: 'Escanear Nota Fiscal' }}
          />
          <Stack.Screen
            name="WebViewNota"
            component={WebViewNotaScreen}
            options={{ title: 'Nota Fiscal' }}
          />
          <Stack.Screen
            name="MatchProdutos"
            component={MatchProdutosScreen}
            options={{ title: 'Importar Preços' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
