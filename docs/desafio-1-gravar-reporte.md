# Desafio 1 — Gravar um reporte no Firebase

Tocar no **+** do mapa, preencher o formulário e ver o reporte aparecer como documento na coleção
`ocorrencias` do Firestore.

## Passo a passo executado

| Passo | O que foi feito | Arquivo |
| --- | --- | --- |
| 1 | Regras do Firestore (leitura pública, criação só logado e em nome próprio) | [`firestore.rules`](../firestore.rules) |
| 2 | Exportar o banco `bancoDeDados` | [`firebase-config.ts`](../firebase-config.ts) |
| 3 | Serviço `criarReporte` com `addDoc` (id automático) | [`services/reportes.ts`](../services/reportes.ts) |
| 4 | Tela `novo-reporte` virou formulário | [`app/novo-reporte.tsx`](../app/novo-reporte.tsx) |
| 5 | Testes (manuais no app + automáticos) | ver abaixo |

Cada arquivo tem comentários explicando, com as minhas palavras, o que entendi de cada parte.

## Documento gravado

```
ocorrencias/{id automático}
  idNotificante: "uid do usuário logado"
  titulo:        "Buraco na Rua das Palmeiras"
  descricao:     "..." ou null
  tipo:          "buraco" | "calcada" | "iluminacao" | "outro"   (melhoria)
  endereco:      "Rua X, 123 - Centro, Cuiabá" ou null           (melhoria)
  status:        "aberto"
  latitude:      -15.6
  longitude:     -56.1
  criadoEm:      horário do servidor (serverTimestamp)
```

## Para ir além (o que acrescentei)

1. **Campo `tipo`** escolhido por botões (buraco, calçada, iluminação, outro) — lista em
   [`constants/tipos.ts`](../constants/tipos.ts).
2. **Campo `endereco`** com `Location.reverseGeocodeAsync`, mostrado na tela antes do envio.
3. **Indicador de carregamento** (`ActivityIndicator`) no botão; campos travados durante o envio
   (evita reporte duplicado).
4. **Validação reaproveitável e testada**: [`services/validar-reporte.ts`](../services/validar-reporte.ts)
   é usada pela tela *e* pelo serviço; tem testes automáticos em
   [`services/validar-reporte.test.ts`](../services/validar-reporte.test.ts) (`npm test`).
5. **Regras do Firestore reforçadas**: além da regra da apostila, o banco confere os campos
   (tamanho do título, `status` sempre `"aberto"` na criação, tipo válido, coordenadas válidas,
   `criadoEm` = horário do servidor, nenhum campo extra).
6. **Mensagens de erro por campo**, contador de caracteres e limite de tamanho.
7. **Avisos antecipados**: se não estiver logado ou sem GPS, a tela já mostra com botão
   "Entrar" / "Tentar de novo".
8. **Erro de permissão explicado** (`permission-denied`) e `initializeFirestore` com
   `experimentalAutoDetectLongPolling` (evita "Could not reach Cloud Firestore backend").
9. **Funciona na web**: `Alert.alert` não aparece no navegador, então a tela usa `window.alert` lá.
10. **Teclado** não cobre o formulário (`KeyboardAvoidingView` + `ScrollView`).

## Como testar

```bash
npm install
npm test            # testes automáticos da validação
npm run typecheck   # TypeScript
npm run lint        # ESLint
npx expo start      # app
```

No app: entrar com o Google, permitir a localização, tocar no **+**, preencher e enviar.
No console: **Firestore Database → Dados → ocorrencias**.

### Confira

- [ ] O documento tem `titulo`, `status: "aberto"`, `latitude`, `longitude`, `idNotificante` e `criadoEm`.
- [ ] Sem título, o app mostra o alerta e **não** grava.
- [ ] Sem login, o app pede para entrar e **não** grava.
