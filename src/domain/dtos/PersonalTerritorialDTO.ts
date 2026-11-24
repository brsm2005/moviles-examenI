/**
 * DTO de transfer entre Supabase y dominio.
 * Ubicado en dominio para que infraestructura pueda acceder sin violar boundaries.
 */
export interface PersonalTerritorialDTO {
  id: string;
  nombres_completos: string;
  cedula: string;
  email: string;
  telefono: string;
  rol: 'COORDINADOR_PROVINCIAL' | 'COORDINADOR_RECINTO' | 'VEEDOR';
  recinto_id: string | null;
  provincia_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
