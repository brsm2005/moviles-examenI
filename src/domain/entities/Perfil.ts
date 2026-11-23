export type RolPerfil =
  | 'COORDINADOR_PROVINCIAL'
  | 'COORDINADOR_RECINTO'
  | 'VEEDOR';

export interface Perfil {
  id: string;
  cedula: string;
  nombresCompletos: string;
  telefono: string;
  email: string;
  rol: RolPerfil;
  recintoId: string | null;
  mustChangePassword: boolean;
  correoConfirmado: boolean;
}
