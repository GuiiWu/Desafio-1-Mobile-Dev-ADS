import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
// @ts-ignore - tipos do firebase/auth não expõem getReactNativePersistence p/ RN, mas existe em runtime no build nativo (iOS/Android)
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
// Desafio 1 (passo 2): importamos o initializeFirestore para criar o "banco de dados"
// do app. É o Firestore que guarda os reportes na nuvem do Firebase.
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Na web o bundle do firebase/auth não traz getReactNativePersistence (é só
// pra iOS/Android), então lá usamos getAuth normal — o Firebase já persiste
// a sessão no localStorage do navegador por padrão.
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

// Banco de dados (Firestore): é por ele que gravamos e lemos os reportes.
//
// O que entendi: o `app` acima é a "conexão" com o nosso projeto no Firebase
// (as chaves vêm do .env). O Firestore usa essa conexão para saber em qual
// banco gravar. Exportando a constante `bancoDeDados`, qualquer arquivo do
// projeto pode importar e usar o mesmo banco, sem criar outra conexão.
//
// MELHORIA: em vez do getFirestore(app) da apostila, já usamos o
// initializeFirestore com `experimentalAutoDetectLongPolling`. É a correção
// que o próprio desafio sugere para o erro "Could not reach Cloud Firestore
// backend", que acontece muito no Android/Expo Go porque a conexão de streaming
// do Firestore às vezes é bloqueada. Com essa opção o SDK detecta sozinho e
// troca para "long polling" (requisições HTTP comuns) quando precisa.
// O try/catch existe porque, no "fast refresh" do Expo, este arquivo pode rodar
// de novo com o app já iniciado; aí o initializeFirestore reclama e nós só
// pegamos a instância que já existe com getFirestore.
function criarBancoDeDados() {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}
export const bancoDeDados = criarBancoDeDados();
