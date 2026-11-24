import type { RolPerfil } from './Perfil';

export interface GestorUsuarios {
  id: string;
  cedula: string;
  nombresCompletos: string;
  email: string;
  telefono: string;
  rol: RolPerfil;
  recintoId: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatosCrearUsuario {
  cedula: string;
  nombresCompletos: string;
  email: string;
  telefono: string;
  rol: Exclude<RolPerfil, 'COORDINADOR_PROVINCIAL'>;
  recintoId?: string;
}

export interface DatosEditarUsuario {
  cedula?: string;
  nombresCompletos?: string;
  email?: string;
  telefono?: string;
  rol?: RolPerfil;
  recintoId?: string | null;
}

export interface FiltrosUsuarios {
  rol?: RolPerfil;
  recintoId?: string;
  activo?: boolean;
  buscar?: string;
}

export interface ResultadoListaUsuarios {
  usuarios: GestorUsuarios[];
  total: number;
  pagina: number;
  porPagina: number;
}
