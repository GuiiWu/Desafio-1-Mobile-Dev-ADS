/**
 * MELHORIA (além do proposto): tipos de problema que o cidadão pode escolher
 * no formulário de novo reporte. O valor (`buraco`, `calcada`...) é o que vai
 * gravado no Firestore; o rótulo e o ícone são só para mostrar na tela.
 *
 * Deixei a lista aqui, separada da tela, pelo mesmo motivo do constants/status.ts:
 * se amanhã precisar de um tipo novo (ex.: "lixo"), muda só neste arquivo.
 */
export const TIPOS = ["buraco", "calcada", "iluminacao", "outro"] as const;

// `typeof TIPOS[number]` vira o tipo "buraco" | "calcada" | "iluminacao" | "outro".
export type TipoOcorrencia = (typeof TIPOS)[number];

export const ROTULOS_DOS_TIPOS: Record<TipoOcorrencia, { rotulo: string; icone: string }> = {
  buraco: { rotulo: "Buraco", icone: "alert-octagon" },
  calcada: { rotulo: "Calçada", icone: "grid" },
  iluminacao: { rotulo: "Iluminação", icone: "sun" },
  outro: { rotulo: "Outro", icone: "more-horizontal" },
};
