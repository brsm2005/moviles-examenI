import type { ResultadoProvincial } from '@/domain/ports/IMonitoreoProvincial';
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

export function mapearResultadosAGrafico(
  resultados: ResultadoProvincial[],
  candidatosOrdenados: readonly string[] = resultados.map((resultado) => resultado.candidatoId),
): ResultadoVoto[] {
  const indices = new Map(candidatosOrdenados.map((id, indice) => [id, indice]));
  return resultados.map((r, indice) => ({
    id: r.candidatoId,
    nombre: r.candidato,
    organizacion: r.lista ? `${r.organizacion} · Lista ${r.lista}` : r.organizacion,
    votos: r.votos,
    color: obtenerColorPorIndice(indices.get(r.candidatoId) ?? indice),
  }));
}

export function mapearVotosBlancosNulos(blancos: number, nulos: number): ResultadoVoto[] {
  return [
    { id: 'votos-blancos', nombre: 'Votos blancos', organizacion: '', votos: blancos, color: '#64748B' },
    { id: 'votos-nulos', nombre: 'Votos nulos', organizacion: '', votos: nulos, color: '#292524' },
  ];
}
