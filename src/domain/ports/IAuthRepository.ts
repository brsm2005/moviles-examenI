import type { Perfil, RolPerfil } from '../entities/Perfil';

export interface CredencialesAcceso {
  email: string;
  password: string;
}

export interface DatosNuevoPerfil {
  email: string;
  password: string;
  cedula: string;
  nombresCompletos: string;
  telefono: string;
  rol: Exclude<RolPerfil, 'COORDINADOR_PROVINCIAL'>;
}

export interface IAuthRepository {
  iniciarSesion(credenciales: CredencialesAcceso): Promise<Perfil>;
  obtenerPerfilActual(): Promise<Perfil | null>;
  crearUsuarioSubordinado(datos: DatosNuevoPerfil): Promise<Perfil>;
  cambiarContrasenaInicial(nuevaContrasena: string): Promise<void>;
  solicitarRecuperacionContrasena(email: string): Promise<void>;
  cerrarSesion(): Promise<void>;
}
