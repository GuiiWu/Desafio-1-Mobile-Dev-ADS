/**
 * MELHORIA (além do proposto): regras de validação do reporte num arquivo
 * separado, sem nada de React nem de Firebase.
 *
 * O que entendi: se a validação ficasse dentro da tela, só daria para testar
 * abrindo o app e clicando. Separando numa função "pura" (recebe dados e
 * devolve uma resposta, sem efeito colateral), dá para rodar testes
 * automáticos (ver services/validar-reporte.test.ts) e a tela e o serviço
 * usam exatamente a mesma regra.
 *
 * Os limites de tamanho são os mesmos do arquivo firestore.rules, então o que
 * o app aceita o banco também aceita.
 */
import { TIPOS, type TipoOcorrencia } from "../constants/tipos";

export const LIMITE_TITULO = 80;
export const LIMITE_DESCRICAO = 500;
export const MINIMO_TITULO = 3;

export type ErroDeValidacao = { campo: "titulo" | "descricao" | "tipo"; mensagem: string };

export function validarReporte(dados: {
  titulo: string;
  descricao: string;
  tipo: string | null;
}): ErroDeValidacao | null {
  const titulo = dados.titulo.trim();
  const descricao = dados.descricao.trim();

  if (!titulo) {
    return { campo: "titulo", mensagem: "Diga onde está o problema." };
  }
  if (titulo.length < MINIMO_TITULO) {
    return { campo: "titulo", mensagem: `O título precisa ter pelo menos ${MINIMO_TITULO} letras.` };
  }
  if (titulo.length > LIMITE_TITULO) {
    return { campo: "titulo", mensagem: `O título pode ter no máximo ${LIMITE_TITULO} caracteres.` };
  }
  if (descricao.length > LIMITE_DESCRICAO) {
    return { campo: "descricao", mensagem: `A descrição pode ter no máximo ${LIMITE_DESCRICAO} caracteres.` };
  }
  if (!dados.tipo || !TIPOS.includes(dados.tipo as TipoOcorrencia)) {
    return { campo: "tipo", mensagem: "Escolha o tipo do problema." };
  }
  return null;
}

/**
 * Monta um endereço curto ("Rua X, 123 - Bairro, Cidade") a partir do que o
 * Location.reverseGeocodeAsync devolve. Campos que vierem vazios são pulados.
 */
export function formatarEndereco(lugar: {
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  name?: string | null;
} | null | undefined): string | null {
  if (!lugar) return null;
  const rua = [lugar.street, lugar.streetNumber].filter(Boolean).join(", ");
  const cidade = lugar.city ?? lugar.subregion;
  const partes = [rua || lugar.name, lugar.district, cidade].filter(Boolean);
  // Evita repetir a mesma informação (ex.: name igual ao bairro).
  const unicas = partes.filter((parte, i) => partes.indexOf(parte) === i);
  if (unicas.length === 0) return null;
  const [primeira, ...resto] = unicas;
  return resto.length ? `${primeira} - ${resto.join(", ")}` : String(primeira);
}
