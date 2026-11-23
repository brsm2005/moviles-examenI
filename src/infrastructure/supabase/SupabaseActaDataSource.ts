import { File } from 'expo-file-system';
import type { Acta } from '@/domain/entities/Acta';
import type { Dignidad } from '@/domain/entities/Candidato';
import type {
  DatosAuditoriaCorreccion,
  IActaRemoteDataSource,
} from '@/domain/ports/IActaRemoteDataSource';
import { supabase } from './client';

interface VotoCandidatoRow {
  candidato_id: string;
  votos: number;
}

interface ActaRow {
  id: string;
  mesa_id: string;
  dignidad: Dignidad;
  registrado_por: string;
  actualizado_por: string | null;
  total_sufragantes: number;
  votos_blancos: number;
  votos_nulos: number;
  foto_storage_path: string;
  latitud: number;
  longitud: number;
  precision_gps_m: number | null;
  alerta_ubicacion: boolean;
  estado_sync: 'SYNCED';
  capturada_offline_at: string;
  created_at: string;
  updated_at: string;
  acta_votos_candidatos: VotoCandidatoRow[];
}

const ACTA_SELECT =
  'id, mesa_id, dignidad, registrado_por, actualizado_por, total_sufragantes, votos_blancos, votos_nulos, foto_storage_path, latitud, longitud, precision_gps_m, alerta_ubicacion, estado_sync, capturada_offline_at, created_at, updated_at, acta_votos_candidatos(candidato_id, votos)';

function exigirFilas(
  data: ActaRow[] | null,
  error: { message: string } | null,
): ActaRow[] {
  if (error) throw error;
  if (!data) throw new Error('Supabase no devolvió el historial de actas.');
  return data;
}

async function mapearActa(row: ActaRow): Promise<Acta> {
  const { data, error } = await supabase.storage
    .from('actas-evidencia')
    .createSignedUrl(row.foto_storage_path, 60 * 60);
  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error(`No se pudo obtener la evidencia del acta ${row.id}.`);
  }

  return {
    id: row.id,
    mesaJrvId: row.mesa_id,
    dignidad: row.dignidad,
    estado: row.estado_sync,
    fotoUri: data.signedUrl,
    fotoStoragePath: row.foto_storage_path,
    ubicacion: {
      latitud: row.latitud,
      longitud: row.longitud,
      precisionMetros: row.precision_gps_m,
      capturadaEn: row.capturada_offline_at,
    },
    alertaUbicacion: row.alerta_ubicacion,
    totalSufragantes: row.total_sufragantes,
    votosBlancos: row.votos_blancos,
    votosNulos: row.votos_nulos,
    votosCandidatos: row.acta_votos_candidatos.map((voto) => ({
      candidatoId: voto.candidato_id,
      votos: voto.votos,
    })),
    creadoPor: row.registrado_por,
    actualizadoPor: row.actualizado_por ?? row.registrado_por,
    creadoEn: row.created_at,
    actualizadoEn: row.updated_at,
  };
}

export class SupabaseActaDataSource implements IActaRemoteDataSource {
  async listarSincronizadas(): Promise<Acta[]> {
    const { data, error } = await supabase
      .from('actas')
      .select(ACTA_SELECT)
      .eq('estado_sync', 'SYNCED')
      .order('updated_at', { ascending: false });
    const rows = exigirFilas(data, error);
    return Promise.all(rows.map(mapearActa));
  }

  async obtenerPorId(actaId: string): Promise<Acta | null> {
    const { data, error } = await supabase
      .from('actas')
      .select(ACTA_SELECT)
      .eq('id', actaId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapearActa(data) : null;
  }

  async guardarActa(
    acta: Acta,
    auditoria?: DatosAuditoriaCorreccion,
  ): Promise<string> {
    let fotoStoragePath =
      acta.fotoStoragePath ?? `${acta.mesaJrvId}/${acta.id}.jpg`;

    if (!acta.fotoUri.startsWith('http')) {
      if (acta.fotoStoragePath) {
        fotoStoragePath = `${acta.mesaJrvId}/${acta.id}-${Date.now()}.jpg`;
      }
      const foto = new File(acta.fotoUri);
      if (!foto.exists) {
        throw new Error('No se encontró el archivo local de evidencia del acta.');
      }
      const { error: uploadError } = await supabase.storage
        .from('actas-evidencia')
        .upload(fotoStoragePath, await foto.bytes(), {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;
    } else if (!acta.fotoStoragePath) {
      throw new Error('No se puede sincronizar una URL sin ruta de almacenamiento.');
    }

    if (!acta.ubicacion) {
      throw new Error('El acta no tiene coordenadas para sincronizar.');
    }

    const datosActa = {
      id: acta.id,
      mesa_id: acta.mesaJrvId,
      dignidad: acta.dignidad,
      registrado_por: acta.creadoPor,
      actualizado_por: acta.actualizadoPor,
      total_sufragantes: acta.totalSufragantes,
      votos_validos: acta.votosCandidatos.reduce(
        (total, voto) => total + (voto.votos ?? 0),
        0,
      ),
      votos_blancos: acta.votosBlancos,
      votos_nulos: acta.votosNulos,
      foto_storage_path: fotoStoragePath,
      latitud: acta.ubicacion.latitud,
      longitud: acta.ubicacion.longitud,
      precision_gps_m: acta.ubicacion.precisionMetros,
      alerta_ubicacion: acta.alertaUbicacion,
      estado_sync: 'SYNCED',
      capturada_offline_at: acta.ubicacion.capturadaEn,
    };

    const correction = auditoria
      ? {
          motivo: auditoria.motivo,
        }
      : null;
    const { error } = await supabase.rpc('guardar_acta_verificada', {
      p_acta: datosActa,
      p_votos: acta.votosCandidatos.map((voto) => ({
        candidato_id: voto.candidatoId,
        votos: voto.votos,
      })),
      p_correccion: correction,
    });
    if (error) throw error;

    return fotoStoragePath;
  }
}
