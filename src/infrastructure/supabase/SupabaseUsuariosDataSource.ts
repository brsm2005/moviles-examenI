import { v4 as uuidv4 } from 'uuid';
import type {
  DatosCrearUsuario,
  DatosEditarUsuario,
  FiltrosUsuarios,
  GestorUsuarios,
  ResultadoListaUsuarios,
} from '@/domain/entities/GestorUsuarios';
import type { IUsuariosDataSource } from '@/domain/ports/IUsuariosDataSource';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseUsuariosDataSource implements IUsuariosDataSource {
  constructor(private supabase: SupabaseClient) {}

  async crearUsuario(datos: DatosCrearUsuario, recintoIdDelCreador?: string): Promise<GestorUsuarios> {
    const id = uuidv4();
    const ahora = new Date().toISOString();

    const { error } = await this.supabase.from('personal_territorial').insert({
      id,
      cedula: datos.cedula,
      nombres_completos: datos.nombresCompletos,
      email: datos.email,
      telefono: datos.telefono,
      rol: datos.rol,
      recinto_id: datos.recintoId || recintoIdDelCreador || null,
      activo: true,
      created_at: ahora,
      updated_at: ahora,
    });

    if (error) throw new Error(`No se pudo crear usuario: ${error.message}`);

    return {
      id,
      cedula: datos.cedula,
      nombresCompletos: datos.nombresCompletos,
      email: datos.email,
      telefono: datos.telefono,
      rol: datos.rol,
      recintoId: datos.recintoId || recintoIdDelCreador || null,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  async obtenerUsuarios(
    filtros: FiltrosUsuarios,
    pagina = 1,
    porPagina = 10
  ): Promise<ResultadoListaUsuarios> {
    let query = this.supabase.from('personal_territorial').select('*', { count: 'exact' });

    if (filtros.rol) query = query.eq('rol', filtros.rol);
    if (filtros.recintoId) query = query.eq('recinto_id', filtros.recintoId);
    if (filtros.activo !== undefined) query = query.eq('activo', filtros.activo);
    if (filtros.buscar) {
      query = query.or(
        `nombres_completos.ilike.%${filtros.buscar}%,email.ilike.%${filtros.buscar}%,cedula.ilike.%${filtros.buscar}%`
      );
    }

    const offset = (pagina - 1) * porPagina;
    const { data, error, count } = await query.range(offset, offset + porPagina - 1);

    if (error) throw new Error(`Error al obtener usuarios: ${error.message}`);

    return {
      usuarios: (data || []).map(this.mapearUsuario),
      total: count || 0,
      pagina,
      porPagina,
    };
  }

  async obtenerUsuarioPorId(id: string): Promise<GestorUsuarios | null> {
    const { data, error } = await this.supabase
      .from('personal_territorial')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }

    return data ? this.mapearUsuario(data) : null;
  }

  async obtenerUsuarioPorEmail(email: string): Promise<GestorUsuarios | null> {
    const { data, error } = await this.supabase
      .from('personal_territorial')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }

    return data ? this.mapearUsuario(data) : null;
  }

  async editarUsuario(id: string, datos: DatosEditarUsuario): Promise<GestorUsuarios> {
    const actualizacion: Record<string, any> = { updated_at: new Date().toISOString() };

    if (datos.cedula) actualizacion.cedula = datos.cedula;
    if (datos.nombresCompletos) actualizacion.nombres_completos = datos.nombresCompletos;
    if (datos.email) actualizacion.email = datos.email;
    if (datos.telefono) actualizacion.telefono = datos.telefono;
    if (datos.rol) actualizacion.rol = datos.rol;
    if (datos.recintoId !== undefined) actualizacion.recinto_id = datos.recintoId;

    const { data, error } = await this.supabase
      .from('personal_territorial')
      .update(actualizacion)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`Error al editar usuario: ${error.message}`);

    return this.mapearUsuario(data);
  }

  async desactivarUsuario(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('personal_territorial')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Error al desactivar usuario: ${error.message}`);
  }

  async activarUsuario(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('personal_territorial')
      .update({ activo: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Error al activar usuario: ${error.message}`);
  }

  async editarNombrePropio(id: string, nuevoNombre: string): Promise<GestorUsuarios> {
    const { data, error } = await this.supabase
      .from('personal_territorial')
      .update({ nombres_completos: nuevoNombre, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`Error al actualizar nombre: ${error.message}`);

    return this.mapearUsuario(data);
  }

  private mapearUsuario(raw: any): GestorUsuarios {
    return {
      id: raw.id,
      cedula: raw.cedula,
      nombresCompletos: raw.nombres_completos,
      email: raw.email,
      telefono: raw.telefono,
      rol: raw.rol,
      recintoId: raw.recinto_id,
      activo: raw.activo,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}
