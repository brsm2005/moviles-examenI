import type { ResultadoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import type { ResultadoVoto } from '@/presentation/components/monitoreo/PieChartResultados';

// Paleta oficial Exit Poll de alto contraste liderada por Morado (#6F2C91) y Amarillo (#EAE84B)
const COLORES_CANDIDATOS = [
  '#6F2C91', // Morado Principal
  '#EAE84B', // Amarillo Principal (acento institucional de alto contraste)
  '#2E7D6B', // Esmeralda institucional
  '#C2591A', // Terracota cálido
  '#2F5D9F', // Azul pizarra
  '#9A4EC4', // Orquídea medio
  '#A6345C', // Magenta oscuro
  '#5A6B2C', // Oliva oscuro
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
    { id: 'votos-blancos', nombre: 'Votos blancos', organizacion: '', votos: blancos, color: '#9B8EA8' },
    { id: 'votos-nulos', nombre: 'Votos nulos', organizacion: '', votos: nulos, color: '#222222' },
  ];
}
