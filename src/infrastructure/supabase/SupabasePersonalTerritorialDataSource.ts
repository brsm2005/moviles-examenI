import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CrearPersonalDTO,
  IPersonalTerritorialDataSource,
} from '@/domain/ports/IPersonalTerritorialRepository';
import type { PersonalTerritorialDTO } from '@/domain/dtos/PersonalTerritorialDTO';
import { supabase } from './client';

export class SupabasePersonalTerritorialDataSource implements IPersonalTerritorialDataSource {
  constructor(private supabaseClient: SupabaseClient = supabase) {}

  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
      error,
    } = await this.supabaseClient.auth.getUser();

    if (error || !user) {
      throw new Error('No se pudo obtener el usuario actual');
    }

    return user.id;
  }

  async obtenerSubordinados(): Promise<PersonalTerritorialDTO[]> {
    try {
      const currentUserId = await this.getCurrentUserId();

      // Primero obtenemos el perfil actual del usuario
      const { data: perfilActual, error: errorPerfil } = await this.supabaseClient
        .from('personal_territorial')
        .select('id, rol, recinto_id, provincia_id')
        .eq('id', currentUserId)
        .single();

      if (errorPerfil || !perfilActual) {
        throw new Error('No se pudo obtener el perfil del usuario actual');
      }

      // Según el rol, filtramos subordinados
      let query = this.supabaseClient
        .from('personal_territorial')
        .select('*')
        .eq('activo', true);

      if (perfilActual.rol === 'COORDINADOR_PROVINCIAL') {
        // Obtiene todos los Coordinadores de Recinto de su provincia
        query = query
          .eq('rol', 'COORDINADOR_RECINTO')
          .eq('provincia_id', perfilActual.provincia_id);
      } else if (perfilActual.rol === 'COORDINADOR_RECINTO') {
        // Obtiene todos los Veedores de su recinto
        query = query
          .eq('rol', 'VEEDOR')
          .eq('recinto_id', perfilActual.recinto_id);
      } else {
        // VEEDOR no tiene subordinados
        return [];
      }

      const { data, error } = await query.order('nombres_completos', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error obtenerSubordinados:', error);
      throw error;
    }
  }

  async obtenerPorId(id: string): Promise<PersonalTerritorialDTO | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('personal_territorial')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 es "no rows returned"
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error obtenerPorId:', error);
      throw error;
    }
  }

  async crear(datos: CrearPersonalDTO): Promise<PersonalTerritorialDTO> {
    try {
      // Invocamos la Edge Function que valida roles jerárquicos
      const { data, error } = await this.supabaseClient.functions.invoke(
        'crear-usuario-subordinado',
        {
          body: {
            cedula: datos.cedula,
            nombres_completos: datos.nombresCompletos,
            telefono: datos.telefono,
            email: datos.email,
            password: datos.password,
            rol: datos.rol,
            recinto_id: datos.recintoId || null,
          },
        },
      );

      if (error) {
        throw new Error(error.message || 'Error al crear usuario en Edge Function');
      }

      return data as PersonalTerritorialDTO;
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error crear:', error);
      throw error;
    }
  }

  async actualizar(
    id: string,
    datos: Partial<CrearPersonalDTO>,
  ): Promise<PersonalTerritorialDTO> {
    try {
      // Validar que solo se actualicen los campos permitidos
      const actualizacion: Record<string, any> = {};

      if (datos.nombresCompletos !== undefined) {
        actualizacion.nombres_completos = datos.nombresCompletos;
      }

      if (datos.telefono !== undefined) {
        actualizacion.telefono = datos.telefono;
      }

      actualizacion.updated_at = new Date().toISOString();

      const { data, error } = await this.supabaseClient
        .from('personal_territorial')
        .update(actualizacion)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data || ({ id } as PersonalTerritorialDTO);
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error actualizar:', error);
      throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      // No eliminamos, solo marcamos como inactivo (soft delete)
      const { error } = await this.supabaseClient
        .from('personal_territorial')
        .update({
          activo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error eliminar:', error);
      throw error;
    }
  }

  async puedeGestionar(usuarioId: string): Promise<boolean> {
    try {
      // Verificar que el usuario actual puede gestionar al usuario especificado
      // (que sea su superior jerárquico directo)

      const currentUserId = await this.getCurrentUserId();

      const { data: usuario, error: errorUsuario } = await this.supabaseClient
        .from('personal_territorial')
        .select('id, rol, recinto_id, provincia_id')
        .eq('id', usuarioId)
        .single();

      if (errorUsuario || !usuario) {
        return false;
      }

      const { data: actual, error: errorActual } = await this.supabaseClient
        .from('personal_territorial')
        .select('id, rol, recinto_id, provincia_id')
        .eq('id', currentUserId)
        .single();

      if (errorActual || !actual) {
        return false;
      }

      // COORDINADOR_PROVINCIAL gestiona COORDINADOR_RECINTO de su provincia
      if (actual.rol === 'COORDINADOR_PROVINCIAL' && usuario.rol === 'COORDINADOR_RECINTO') {
        return usuario.provincia_id === actual.provincia_id;
      }

      // COORDINADOR_RECINTO gestiona VEEDOR de su recinto
      if (actual.rol === 'COORDINADOR_RECINTO' && usuario.rol === 'VEEDOR') {
        return usuario.recinto_id === actual.recinto_id;
      }

      // Nadie más puede gestionar
      return false;
    } catch (error) {
      console.error('[SupabasePersonalTerritorialDataSource] Error puedeGestionar:', error);
      return false;
    }
  }
}
