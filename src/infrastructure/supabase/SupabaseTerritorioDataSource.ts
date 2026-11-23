import type {
  CatalogoTerritorial,
  ITerritorioRemoteDataSource,
} from '@/domain/ports/ITerritorioDataSources';
import {
  mapearCandidato,
  mapearMesaJrv,
  mapearOrganizacionPolitica,
  mapearPersonalTerritorial,
  mapearRecinto,
} from './territorioMapper';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import type { Recinto } from '@/domain/entities/Recinto';
import type { NuevoRecinto } from '@/domain/ports/ITerritorioRepository';
import { supabase } from './client';

const RECINTO_COLUMNS =
  'id, codigo_cne, nombre, provincia, canton, parroquia, direccion, latitud_referencia, longitud_referencia, coordinador_recinto_id';
const MESA_COLUMNS =
  'id, recinto_id, numero_mesa, genero, total_electores_padron, veedor_asignado_id';
async function obtenerUsuarioActualId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) throw new Error('No hay una sesión autenticada.');
  return data.session.user.id;
}

function requireRows(
  data: unknown[] | null,
  error: { message: string } | null,
  tableName: string,
): unknown[] {
  if (error) throw error;
  if (!data) throw new Error(`Supabase no devolvió filas de ${tableName}.`);
  return data;
}

function requireOne<T>(
  data: T | null,
  error: { message: string } | null,
  message: string,
): T {
  if (error) throw error;
  if (!data) throw new Error(message);
  return data;
}

export class SupabaseTerritorioDataSource
  implements ITerritorioRemoteDataSource
{
  obtenerUsuarioActualId(): Promise<string> {
    return obtenerUsuarioActualId();
  }

  async descargarCatalogo(): Promise<CatalogoTerritorial> {
    const usuarioId = await obtenerUsuarioActualId();
    const [recintosResult, mesasResult, organizacionesResult, candidatosResult] =
      await Promise.all([
        supabase.from('recintos').select(RECINTO_COLUMNS).order('nombre'),
        supabase.from('mesas_jrv').select(MESA_COLUMNS).order('numero_mesa'),
        supabase
          .from('organizaciones_politicas')
          .select('id, lista_numero, nombre, siglas, color_hex')
          .order('lista_numero'),
        supabase
          .from('candidatos')
          .select('id, organizacion_id, dignidad, nombre_completo, orden_papeleta')
          .order('orden_papeleta'),
      ]);

    return {
      usuarioId,
      recintos: requireRows(
        recintosResult.data,
        recintosResult.error,
        'recintos',
      ).map(mapearRecinto),
      mesas: requireRows(mesasResult.data, mesasResult.error, 'mesas JRV').map(
        mapearMesaJrv,
      ),
      organizaciones: requireRows(
        organizacionesResult.data,
        organizacionesResult.error,
        'organizaciones políticas',
      ).map(mapearOrganizacionPolitica),
      candidatos: requireRows(
        candidatosResult.data,
        candidatosResult.error,
        'candidatos',
      ).map(mapearCandidato),
    };
  }

  async obtenerProvinciaActual(): Promise<string> {
    const userId = await obtenerUsuarioActualId();
    const { data, error } = await supabase
      .from('perfiles')
      .select('provincia')
      .eq('id', userId)
      .single();
    const profile = requireOne(
      data,
      error,
      'No se encontró la jurisdicción del coordinador provincial.',
    );

    if (typeof profile.provincia !== 'string' || !profile.provincia.trim()) {
      throw new Error(
        'El perfil provincial no tiene una provincia configurada. Solicite su configuración antes de gestionar recintos.',
      );
    }

    return profile.provincia;
  }

  async crearRecinto(
    datos: NuevoRecinto,
    provincia: string,
  ): Promise<Recinto> {
    const { data, error } = await supabase
      .from('recintos')
      .insert({
        nombre: datos.nombre.trim(),
        provincia,
        canton: datos.canton.trim(),
        parroquia: datos.parroquia.trim(),
        direccion: datos.direccion.trim() || null,
      })
      .select(RECINTO_COLUMNS)
      .single();

    return mapearRecinto(
      requireOne(data, error, 'No se pudo crear el recinto en Supabase.'),
    );
  }

  async listarCoordinadoresRecinto(): Promise<PersonalTerritorial[]> {
    const userId = await obtenerUsuarioActualId();
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombres_completos, cedula, email')
      .eq('rol', 'COORDINADOR_RECINTO')
      .eq('creado_por', userId)
      .eq('activo', true)
      .order('nombres_completos');

    return requireRows(data, error, 'perfiles').map(mapearPersonalTerritorial);
  }

  async asignarCoordinadorRecinto(
    recintoId: string,
    coordinadorId: string,
  ): Promise<Recinto> {
    const { data, error } = await supabase
      .from('recintos')
      .update({ coordinador_recinto_id: coordinadorId })
      .eq('id', recintoId)
      .is('coordinador_recinto_id', null)
      .select(RECINTO_COLUMNS)
      .maybeSingle();

    return mapearRecinto(
      requireOne(
        data,
        error,
        'El recinto ya tiene coordinador o no pertenece a su jurisdicción.',
      ),
    );
  }

  async listarVeedoresDisponibles(): Promise<PersonalTerritorial[]> {
    const userId = await obtenerUsuarioActualId();
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombres_completos, cedula, email')
      .eq('rol', 'VEEDOR')
      .eq('creado_por', userId)
      .eq('activo', true)
      .order('nombres_completos');

    return requireRows(data, error, 'perfiles').map(mapearPersonalTerritorial);
  }

  async asignarVeedorMesas(
    recintoId: string,
    mesaIds: string[],
    veedorId: string,
  ) {
    const { data, error } = await supabase
      .from('mesas_jrv')
      .update({ veedor_asignado_id: veedorId })
      .eq('recinto_id', recintoId)
      .in('id', mesaIds)
      .is('veedor_asignado_id', null)
      .select(MESA_COLUMNS);
    const rows = requireRows(data, error, 'mesas JRV');

    if (rows.length !== mesaIds.length) {
      throw new Error(
        'No se actualizaron todas las mesas seleccionadas. Verifique que pertenezcan a su recinto.',
      );
    }

    return rows.map(mapearMesaJrv);
  }

  async reemplazarVeedorMesas(
    recintoId: string,
    veedorSalienteId: string,
    veedorEntranteId: string,
  ): Promise<number> {
    const { data, error } = await supabase.rpc('reemplazar_veedor_mesas', {
      p_recinto_id: recintoId,
      p_veedor_saliente_id: veedorSalienteId,
      p_veedor_entrante_id: veedorEntranteId,
    });
    const cantidad = requireOne(
      data,
      error,
      'Supabase no confirmó el reemplazo del veedor.',
    );
    if (typeof cantidad !== 'number' || !Number.isInteger(cantidad)) {
      throw new Error('El RPC de reemplazo devolvió un resultado inválido.');
    }

    return cantidad;
  }
}
