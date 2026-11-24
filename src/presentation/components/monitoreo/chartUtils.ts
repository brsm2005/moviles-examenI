import type { ResultadoVoto } from '@/presentation/components/monitoreo/PieChartResultados';

// Paleta de colores consistente con el diseño de la app
const COLORES_CANDIDATOS = [
  '#1B365D', // primario
  '#D97706', // secundario (ámbar)
  '#059669', // éxito (verde)
  '#DC2626', // error (rojo)
  '#7C3AED', // púrpura
  '#0891B2', // cyan
  '#D946A6', // rosa
  '#6366F1', // índigo
];

export function obtenerColorPorIndice(indice: number): string {
  return COLORES_CANDIDATOS[indice % COLORES_CANDIDATOS.length];
}

export interface ResultadoMonitoreo {
  candidatoId: string;
  candidato: string;
  organizacion: string;
  lista: string | null;
  votos: number;
  dignidad: 'ALCALDE' | 'PREFECTO';
}

export function mapearResultadosAGrafico(
  resultados: ResultadoMonitoreo[],
): ResultadoVoto[] {
  return resultados.map((r, indice) => ({
    id: r.candidatoId,
    nombre: r.candidato,
    organizacion: r.organizacion,
    votos: r.votos,
    color: obtenerColorPorIndice(indice),
  }));
}
