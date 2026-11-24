import type { PersonalTerritorial } from '../entities/PersonalTerritorial';

export interface CrearPersonalDTO {
  cedula: string;
  nombresCompletos: string;
  telefono: string;
  email: string;
  password: string;
  rol: Exclude<'COORDINADOR_PROVINCIAL' | 'COORDINADOR_RECINTO' | 'VEEDOR', 'COORDINADOR_PROVINCIAL'>;
  recintoId?: string;
}

export interface ActualizarPersonalDTO {
  id: string;
  nombresCompletos?: string;
  telefono?: string;
}

/**
 * Puerto para acceso de datos de personal territorial.
 * Implementado por SupabasePersonalTerritorialDataSource en infraestructura.
 */
export interface IPersonalTerritorialDataSource {
  obtenerSubordinados(): Promise<any[]>;
  obtenerPorId(id: string): Promise<any | null>;
  crear(datos: CrearPersonalDTO): Promise<any>;
  actualizar(id: string, datos: Partial<CrearPersonalDTO>): Promise<any>;
  eliminar(id: string): Promise<void>;
  puedeGestionar(usuarioId: string): Promise<boolean>;
}

export interface IPersonalTerritorialRepository {
  /**
   * Obtiene el personal jerárquico subordinado según el rol del usuario actual.
   * - COORDINADOR_PROVINCIAL: obtiene todos sus Coordinadores de Recinto
   * - COORDINADOR_RECINTO: obtiene todos sus Veedores
   * - VEEDOR: retorna lista vacía (no tiene subordinados)
   */
  obtenerSubordinados(): Promise<PersonalTerritorial[]>;

  /**
   * Obtiene un personal específico por ID
   */
  obtenerPorId(id: string): Promise<PersonalTerritorial | null>;

  /**
   * Crea un nuevo usuario subordinado.
   * Invoca la Edge Function 'crear-usuario-subordinado' para seguridad.
   */
  crear(datos: CrearPersonalDTO): Promise<PersonalTerritorial>;

  /**
   * Actualiza el nombre y/o teléfono de un usuario.
   * Solo permite autoedición (mismo usuario) o editado por superior jerárquico.
   */
  actualizar(datos: ActualizarPersonalDTO): Promise<PersonalTerritorial>;

  /**
   * Elimina (desactiva) un usuario subordinado
   */
  eliminar(id: string): Promise<void>;

  /**
   * Verifica si el usuario actual puede gestionar otro usuario
   * (solo si es su superior jerárquico directo)
   */
  puedeGestionar(usuarioId: string): Promise<boolean>;
}
