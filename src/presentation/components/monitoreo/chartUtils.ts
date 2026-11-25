import type { ResultadoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import type { ResultadoVoto } from '@/presentation/components/monitoreo/PieChartResultados';

// Paleta oficial de alto contraste liderada por Morado Principal (#6F2C91)
const COLORES_CANDIDATOS = [
  '#6F2C91', // Morado Principal (líder / primario)
  '#9A4EC4', // Morado medio
  '#2E7D6B', // Verde esmeralda institucional
  '#C2591A', // Terracota cálido
  '#2F5D9F', // Azul pizarra
  '#A6345C', // Magenta oscuro
  '#5A6B2C', // Oliva oscuro
  '#4F467A', // Índigo apagado
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
    { id: 'votos-blancos', nombre: 'Votos blancos', organizacion: '', votos: blancos, color: '#8A8194' },
    { id: 'votos-nulos', nombre: 'Votos nulos', organizacion: '', votos: nulos, color: '#222222' },
  ];
}
