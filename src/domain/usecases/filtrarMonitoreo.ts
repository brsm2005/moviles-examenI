import type { DatosMonitoreo, ResultadoProvincial } from '@/domain/ports/IMonitoreoProvincial';

export function filtrarMonitoreo(datos: DatosMonitoreo, canton: string, recinto: string | null) {
  const avances = datos.avances.filter(
    (avance) => avance.canton === canton && (recinto === null || avance.recintoId === recinto),
  );
  const ids = new Set(avances.map((avance) => avance.recintoId));
  const totales = new Map<string, ResultadoProvincial>();
  for (const resultado of datos.resultados) {
    if (!ids.has(resultado.recintoId)) continue;
    const previo = totales.get(resultado.candidatoId);
    if (previo) previo.votos += resultado.votos;
    else totales.set(resultado.candidatoId, { ...resultado });
  }
  return {
    avances,
    resultados: [...totales.values()].sort(
      (a, b) => b.votos - a.votos || a.candidato.localeCompare(b.candidato),
    ),
    actas: datos.actas.filter((acta) => ids.has(acta.recintoId)),
  };
}
