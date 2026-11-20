/**
 * Desafio 1 (passo 3): serviço que grava um reporte no Firestore.
 *
 * O que entendi: o serviço fica separado da tela. A tela só junta os dados do
 * formulário e chama `criarReporte`; quem sabe "como" e "onde" gravar é este
 * arquivo. Assim, se um dia o banco mudar (ex.: uma API própria), a tela não
 * precisa mudar, só este arquivo.
 *
 * Estrutura no Firestore:
 *   coleção "ocorrencias"  ->  documento (id automático)  ->  campos (titulo, status...)
 */
import { TipoOcorrencia } from "@/constants/tipos";
import { bancoDeDados } from "@/firebase-config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { validarReporte } from "./validar-reporte";

// O "contrato" do que a tela precisa mandar para criar um reporte.
export type DadosDoReporte = {
  idNotificante: string; // uid de quem está reportando (vem do login do Firebase)
  titulo: string;
  descricao: string;
  latitude: number;
  longitude: number;
  // MELHORIAS (além do proposto):
  tipo: TipoOcorrencia; // buraco, calçada, iluminação ou outro
  endereco: string | null; // endereço legível, vindo do reverseGeocodeAsync
};

/** Grava um reporte na coleção "ocorrencias" e devolve o id do documento criado. */
export async function criarReporte(dados: DadosDoReporte): Promise<string> {
  // MELHORIA: valida de novo aqui, mesmo a tela já validando. Se outra tela
  // (ou um bug) chamar o serviço com dados errados, nada inválido vai pro banco.
  const erro = validarReporte(dados);
  if (erro) throw new Error(erro.mensagem);

  // addDoc = "adiciona um documento" na coleção. Não passamos id: o Firestore
  // gera um id único sozinho e devolve uma referência ao documento criado.
  const documento = await addDoc(collection(bancoDeDados, "ocorrencias"), {
    // Precisa ser igual ao uid de quem está logado, senão a regra do
    // Firestore (firestore.rules) recusa com "Missing or insufficient permissions".
    idNotificante: dados.idNotificante,
    titulo: dados.titulo.trim(), // trim tira espaços sobrando no começo/fim
    descricao: dados.descricao.trim() || null, // descrição vazia vira null (campo opcional)
    tipo: dados.tipo,
    // slice(0, 200): mesmo limite do firestore.rules, para um endereço enorme não ser recusado.
    endereco: dados.endereco?.trim().slice(0, 200) || null,
    status: "aberto", // todo reporte novo começa "aberto"; a prefeitura muda depois
    latitude: dados.latitude,
    longitude: dados.longitude,
    // serverTimestamp usa o relógio do servidor do Firebase, e não o do
    // celular (que pode estar com a hora errada).
    criadoEm: serverTimestamp(),
  });

  return documento.id;
}
