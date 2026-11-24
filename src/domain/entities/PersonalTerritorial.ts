export interface PersonalTerritorial {
  id: string;
  nombresCompletos: string;
  cedula: string;
  email: string;
  telefono: string;
  rol: 'COORDINADOR_PROVINCIAL' | 'COORDINADOR_RECINTO' | 'VEEDOR';
  recintoId: string | null;
  provinciaId: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}
