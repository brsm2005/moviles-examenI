import type {
  ActaAuditada,
  AvanceRecinto,
  DatosMonitoreo,
  DetalleActaAuditada,
  IMonitoreoProvincial,
  ResultadoProvincial,
} from '@/domain/ports/IMonitoreoProvincial';
import type { Dignidad } from '@/domain/entities/Candidato';
import { supabase } from './client';

interface AvanceRow {
  recinto_id: string; recinto_nombre: string; canton: string; parroquia: string;
  total_mesas: number; mesas_reportadas: number; mesas_faltantes: number;
  actas_reportadas: number; actas_faltantes: number; actas_con_alerta_gps: number;
}
interface ResultadoRow {
  recinto_id: string; dignidad: Dignidad; candidato_id: string; candidato_nombre: string;
  lista_numero: string; organizacion_siglas: string; total_votos: number;
}
interface ActaRow {
  id: string; dignidad: Dignidad; latitud: number; longitud: number;
  distancia_centroide_m: number | null; alerta_ubicacion: boolean;
  foto_storage_path: string;
  mesas_jrv: { recinto_id: string; numero_mesa: number; genero: string };
}

const actaSelect = 'id, dignidad, latitud, longitud, distancia_centroide_m, alerta_ubicacion, foto_storage_path, mesas_jrv!inner(recinto_id, numero_mesa, genero)';

function mapearActa(row: ActaRow): ActaAuditada {
  return {
    id: row.id, recintoId: row.mesas_jrv.recinto_id, mesa: row.mesas_jrv.numero_mesa,
    genero: row.mesas_jrv.genero, dignidad: row.dignidad, latitud: row.latitud,
    longitud: row.longitud, distancia: row.distancia_centroide_m, alerta: row.alerta_ubicacion,
  };
}

export class SupabaseMonitoreoProvincial implements IMonitoreoProvincial {
  async consultar(): Promise<DatosMonitoreo> {
    const [avances, resultados, actas] = await Promise.all([
      this.leerAvances(), this.leerResultados(), this.leerActas(),
    ]);
    return { avances, resultados, actas };
  }

  private async leerAvances(): Promise<AvanceRecinto[]> {
    const rows: AvanceRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('vw_avance_recintos').select('*')
        .order('recinto_id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows.map((r) => ({
      recintoId: r.recinto_id, nombre: r.recinto_nombre, canton: r.canton,
      parroquia: r.parroquia, totalMesas: r.total_mesas, mesasReportadas: r.mesas_reportadas,
      mesasFaltantes: r.mesas_faltantes, actasReportadas: r.actas_reportadas,
      actasFaltantes: r.actas_faltantes, alertas: r.actas_con_alerta_gps,
    }));
  }

  private async leerResultados(): Promise<ResultadoProvincial[]> {
    const rows: ResultadoRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('vw_exit_poll_resultados').select('*')
        .order('recinto_id').order('candidato_id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows.map((r) => ({
      recintoId: r.recinto_id, dignidad: r.dignidad, candidatoId: r.candidato_id,
      candidato: r.candidato_nombre, lista: r.lista_numero, organizacion: r.organizacion_siglas,
      votos: r.total_votos,
    }));
  }

  private async leerActas(): Promise<ActaAuditada[]> {
    const rows: ActaRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('actas').select(actaSelect)
        .eq('estado_sync', 'SYNCED').order('id').range(offset, offset + 499)
        .overrideTypes<ActaRow[], { merge: false }>();
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows.map(mapearActa);
  }

  async obtenerDetalle(id: string): Promise<DetalleActaAuditada> {
    const { data, error } = await supabase.from('actas').select(actaSelect)
      .eq('id', id).eq('estado_sync', 'SYNCED').single()
      .overrideTypes<ActaRow, { merge: false }>();
    if (error) throw error;
    const { data: foto, error: errorFoto } = await supabase.storage
      .from('actas-evidencia').createSignedUrl(data.foto_storage_path, 3600);
    if (errorFoto) throw errorFoto;
    if (!foto?.signedUrl) throw new Error('No se pudo obtener la fotografía del acta.');
    return { ...mapearActa(data), fotoUrl: foto.signedUrl };
  }

  suscribir(alCambiar: () => void, alEstado: (estado: string) => void): () => void {
    const canal = supabase.channel(`monitoreo-provincial-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas' }, alCambiar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acta_votos_candidatos' }, alCambiar)
      .subscribe((estado) => alEstado(estado));
    return () => { void supabase.removeChannel(canal); };
  }
}
