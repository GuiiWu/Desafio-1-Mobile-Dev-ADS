import type { TipoOcorrencia } from "@/constants/tipos";

export type StatusOcorrencia = "aberto" | "em_execucao" | "resolvido";

export type Ocorrencia = {
  id: string;
  titulo: string;
  descricao?: string;
  status: StatusOcorrencia;
  latitude: number;
  longitude: number;
  // Desafio 1 (melhorias): campos novos gravados junto com o reporte.
  // Opcionais porque os dados de mentira (services/ocorrencias.ts) não têm.
  tipo?: TipoOcorrencia;
  endereco?: string | null;
};
