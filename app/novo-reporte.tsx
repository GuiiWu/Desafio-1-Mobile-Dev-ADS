/**
 * Desafio 1 (passo 4): tela "Novo reporte", agora um formulário que grava no Firestore.
 *
 * O que entendi do fluxo:
 *  1. O usuário toca no "+" do mapa e o Expo Router abre esta tela (rota /novo-reporte).
 *  2. useAuth() diz QUEM está logado (o uid vira o `idNotificante` do reporte).
 *  3. useCidade() diz ONDE o usuário está (latitude/longitude do GPS).
 *  4. Ao tocar em "Enviar reporte", a tela valida os campos e chama
 *     criarReporte() (services/reportes.ts), que grava na coleção "ocorrencias".
 *  5. Deu certo: mostra um aviso e volta para o mapa. Deu errado: avisa e deixa
 *     o usuário tentar de novo sem perder o que digitou.
 *
 * MELHORIAS que acrescentei (além do código da apostila):
 *  - Campo `tipo` (buraco, calçada, iluminação, outro) escolhido por botões e gravado junto.
 *  - Campo `endereco`, descoberto com Location.reverseGeocodeAsync e mostrado na tela.
 *  - Indicador de carregamento (ActivityIndicator) no botão enquanto envia,
 *    e os campos ficam travados para não mudar nada no meio do envio.
 *  - Mensagens de erro embaixo de cada campo (além do Alert), contador de
 *    caracteres e limite de tamanho (os mesmos limites das regras do Firestore).
 *  - Aviso fixo quando não está logado ou sem GPS, com botão para resolver
 *    ("Entrar" / "Tentar de novo"), em vez de só descobrir na hora de enviar.
 *  - Mensagem de erro específica quando o Firestore recusa por permissão.
 *  - Funciona na web: lá o Alert do React Native não aparece, então usamos window.alert.
 *  - Teclado não cobre o formulário (KeyboardAvoidingView + ScrollView).
 */
import { ROTULOS_DOS_TIPOS, TIPOS, TipoOcorrencia } from "@/constants/tipos";
import { useAuth } from "@/hooks/use-auth";
import { useCidade } from "@/hooks/use-cidade";
import { criarReporte } from "@/services/reportes";
import {
  ErroDeValidacao,
  formatarEndereco,
  LIMITE_DESCRICAO,
  LIMITE_TITULO,
  validarReporte,
} from "@/services/validar-reporte";
import { cores } from "@/styles";
import { Feather } from "@react-native-vector-icons/feather";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ComponentProps, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * MELHORIA: o Alert.alert do React Native não faz nada na web (react-native-web
 * não implementa). Este "avisar" usa o Alert no celular e o window.alert na web,
 * assim a validação funciona nas duas plataformas.
 */
function avisar(titulo: string, mensagem: string, aoFechar?: () => void) {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensagem}`);
    aoFechar?.();
    return;
  }
  Alert.alert(titulo, mensagem, [{ text: "OK", onPress: aoFechar }]);
}

export default function NovoReporte() {
  const roteador = useRouter();
  // `user: usuario` renomeia o campo `user` do contexto para `usuario` (só para ficar em português).
  const { user: usuario } = useAuth();
  const { coordenadas, status: statusGps, atualizar: atualizarGps } = useCidade();

  // Cada useState guarda um pedaço do formulário. Quando muda, a tela redesenha.
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoOcorrencia | null>(null);
  // Guardamos o endereço junto com as coordenadas que o geraram. Assim dá para
  // saber, sem outro estado, se o endereço da posição atual já chegou.
  const [resultadoEndereco, setResultadoEndereco] = useState<{
    de: typeof coordenadas;
    texto: string | null;
  } | null>(null);
  const enderecoPronto = !!coordenadas && resultadoEndereco?.de === coordenadas;
  const endereco = enderecoPronto ? resultadoEndereco!.texto : null;
  const buscandoEndereco = !!coordenadas && !enderecoPronto;
  const [erro, setErro] = useState<ErroDeValidacao | null>(null);
  // `enviando` evita envio duplicado (dois toques rápidos = dois documentos).
  const [enviando, setEnviando] = useState(false);

  // MELHORIA: assim que o GPS tiver a posição, descobrimos o endereço dela
  // (geocodificação reversa: coordenadas -> "Rua X, 123 - Bairro, Cidade").
  useEffect(() => {
    if (!coordenadas) return;
    let ativo = true; // se a tela fechar antes da resposta, não mexe no estado
    Location.reverseGeocodeAsync(coordenadas)
      .then(([lugar]) => formatarEndereco(lugar))
      // Na web ou sem internet isso pode falhar. Não é grave: o reporte
      // continua tendo latitude/longitude, só fica sem o endereço escrito.
      .catch(() => null)
      .then((texto) => ativo && setResultadoEndereco({ de: coordenadas, texto }));
    return () => {
      ativo = false;
    };
  }, [coordenadas]);

  async function enviar() {
    // 1) Valida os campos (mesma função que os testes automáticos usam).
    const problema = validarReporte({ titulo, descricao, tipo });
    setErro(problema);
    if (problema) {
      const tituloDoAviso =
        problema.campo === "titulo" && !titulo.trim() ? "Título obrigatório" : "Confira o formulário";
      avisar(tituloDoAviso, problema.mensagem);
      return; // não grava nada
    }
    // 2) Sem login não dá: a regra do Firestore exige request.auth != null.
    if (!usuario) {
      avisar("Login necessário", "Entre com a sua conta para reportar.");
      return;
    }
    // 3) Sem GPS não sabemos onde fica o problema.
    if (!coordenadas) {
      avisar("Localização indisponível", "Ative a localização do aparelho.");
      return;
    }

    setEnviando(true);
    try {
      // `tipo!`: aqui o tipo nunca é null, porque o validarReporte já recusou esse caso.
      const id = await criarReporte({
        idNotificante: usuario.uid,
        titulo,
        descricao,
        tipo: tipo!,
        endereco,
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
      });
      console.log("Reporte gravado no Firestore com id:", id);
      avisar("Reporte enviado", "Obrigado por ajudar a cidade!", () => roteador.back());
    } catch (falha) {
      console.warn("Falha ao gravar o reporte", falha);
      // MELHORIA: mensagem diferente para o erro de permissão (regra não publicada / não logado).
      const codigo = (falha as { code?: string })?.code;
      avisar(
        "Não foi possível enviar",
        codigo === "permission-denied"
          ? "O banco recusou o reporte. Verifique se você está logado e tente de novo."
          : "Tente de novo em instantes.",
      );
    } finally {
      // finally roda dando certo ou errado: sempre libera o botão de novo.
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={estilos.tela}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={estilos.container} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Novo reporte</Text>

          {/* Avisos que impedem o envio, mostrados logo de cara */}
          {!usuario && (
            <View style={estilos.aviso}>
              <Feather name="lock" size={16} color={cores.alerta} />
              <Text style={estilos.avisoTexto}>Você precisa entrar para enviar um reporte.</Text>
              <Pressable onPress={() => roteador.push("/")}>
                <Text style={estilos.avisoLink}>Entrar</Text>
              </Pressable>
            </View>
          )}

          {/* Local do problema: endereço (melhoria) ou situação do GPS */}
          <View style={estilos.local}>
            <Feather name="map-pin" size={18} color={cores.verde} />
            <View style={{ flex: 1 }}>
              <Text style={estilos.rotulo}>Local do problema</Text>
              {coordenadas ? (
                <Text style={estilos.localTexto}>
                  {buscandoEndereco
                    ? "Buscando endereço..."
                    : (endereco ??
                      `${coordenadas.latitude.toFixed(5)}, ${coordenadas.longitude.toFixed(5)}`)}
                </Text>
              ) : statusGps === "carregando" ? (
                <Text style={estilos.localTexto}>Localizando...</Text>
              ) : (
                <Text style={[estilos.localTexto, { color: cores.alerta }]}>
                  Localização indisponível.
                </Text>
              )}
            </View>
            {!coordenadas && statusGps !== "carregando" && (
              <Pressable onPress={atualizarGps}>
                <Text style={estilos.avisoLink}>Tentar de novo</Text>
              </Pressable>
            )}
          </View>

          {/* MELHORIA: tipo do problema escolhido por botões */}
          <Text style={estilos.rotulo}>Tipo do problema</Text>
          <View style={estilos.tipos}>
            {TIPOS.map((opcao) => {
              const ativo = tipo === opcao;
              const { rotulo, icone } = ROTULOS_DOS_TIPOS[opcao];
              return (
                <Pressable
                  key={opcao}
                  disabled={enviando}
                  onPress={() => {
                    setTipo(opcao);
                    if (erro?.campo === "tipo") setErro(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  style={[estilos.tipo, ativo && estilos.tipoAtivo]}
                >
                  <Feather
                    name={icone as ComponentProps<typeof Feather>["name"]}
                    size={16}
                    color={ativo ? cores.branco : cores.cinzaEscuro}
                  />
                  <Text style={[estilos.tipoTexto, ativo && estilos.tipoTextoAtivo]}>{rotulo}</Text>
                </Pressable>
              );
            })}
          </View>
          {erro?.campo === "tipo" && <Text style={estilos.erro}>{erro.mensagem}</Text>}

          <Text style={estilos.rotulo}>Título</Text>
          <TextInput
            style={[estilos.campo, erro?.campo === "titulo" && estilos.campoComErro]}
            placeholder="Título (ex.: Buraco na Rua das Palmeiras)"
            placeholderTextColor={cores.cinzaClaro}
            value={titulo}
            onChangeText={(texto) => {
              setTitulo(texto);
              if (erro?.campo === "titulo") setErro(null);
            }}
            maxLength={LIMITE_TITULO}
            editable={!enviando}
            returnKeyType="next"
          />
          <View style={estilos.linhaInfo}>
            <Text style={estilos.erro}>{erro?.campo === "titulo" ? erro.mensagem : ""}</Text>
            <Text style={estilos.contador}>
              {titulo.length}/{LIMITE_TITULO}
            </Text>
          </View>

          <Text style={estilos.rotulo}>Descrição</Text>
          <TextInput
            style={[estilos.campo, estilos.campoGrande, erro?.campo === "descricao" && estilos.campoComErro]}
            placeholder="Descrição (opcional)"
            placeholderTextColor={cores.cinzaClaro}
            value={descricao}
            onChangeText={setDescricao}
            maxLength={LIMITE_DESCRICAO}
            editable={!enviando}
            multiline
          />
          <View style={estilos.linhaInfo}>
            <Text style={estilos.erro}>{erro?.campo === "descricao" ? erro.mensagem : ""}</Text>
            <Text style={estilos.contador}>
              {descricao.length}/{LIMITE_DESCRICAO}
            </Text>
          </View>

          {/* disabled={enviando} impede o duplo toque enquanto grava */}
          <TouchableOpacity
            style={[estilos.botao, enviando && estilos.botaoDesativado]}
            onPress={enviar}
            disabled={enviando}
            accessibilityRole="button"
          >
            {enviando && <ActivityIndicator color={cores.branco} />}
            <Text style={estilos.textoDoBotao}>{enviando ? "Enviando..." : "Enviar reporte"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => roteador.back()} disabled={enviando}>
            <Text style={estilos.cancelar}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet.create organiza os estilos; as cores vêm da paleta do projeto (styles/index.tsx).
const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.bgBrancoGelo },
  container: { padding: 20, gap: 8 },
  titulo: { fontSize: 22, fontWeight: "700", color: cores.preto, marginBottom: 4 },
  rotulo: { fontSize: 13, fontWeight: "600", color: cores.cinzaEscuro, marginTop: 6 },
  campo: {
    backgroundColor: cores.branco,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: cores.preto,
    borderWidth: 1,
    borderColor: "transparent",
  },
  campoGrande: { minHeight: 100, textAlignVertical: "top" },
  campoComErro: { borderColor: "#dc2626" },
  linhaInfo: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  erro: { flex: 1, color: "#dc2626", fontSize: 12 },
  contador: { color: cores.cinzaClaro, fontSize: 12 },
  local: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: cores.branco,
  },
  localTexto: { color: cores.preto, fontSize: 14, marginTop: 2 },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff8e1",
  },
  avisoTexto: { flex: 1, color: cores.preto, fontSize: 13 },
  avisoLink: { color: cores.verde, fontWeight: "700" },
  tipos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tipoAtivo: { backgroundColor: cores.verde, borderColor: cores.verde },
  tipoTexto: { color: cores.cinzaEscuro, fontWeight: "600" },
  tipoTextoAtivo: { color: cores.branco },
  botao: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    backgroundColor: cores.verde,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  botaoDesativado: { backgroundColor: cores.verdeEscuro, opacity: 0.8 },
  textoDoBotao: { color: cores.branco, fontWeight: "700", fontSize: 16 },
  cancelar: { textAlign: "center", color: cores.cinzaEscuro, padding: 8 },
});
