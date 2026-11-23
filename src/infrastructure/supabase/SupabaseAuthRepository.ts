import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import type {
  CredencialesAcceso,
  DatosNuevoPerfil,
  EnlaceAutenticacion,
  IAuthRepository,
} from '@/domain/ports/IAuthRepository';
import type { Perfil, RolPerfil } from '@/domain/entities/Perfil';
import { perfilAutenticadoSchema } from '@/domain/schemas/authSchemas';
import { supabase } from './client';

const PERFIL_CACHE_KEY = 'exameni-auth-profile';
const AUTH_REDIRECT_URL = 'exameni://auth/callback';

interface PerfilRow {
  id: string;
  cedula: string;
  nombres_completos: string;
  telefono: string;
  rol: string;
  must_change_password: boolean;
  activo: boolean;
}

interface UsuarioSubordinadoResponse {
  user: User;
}

const perfilRowSchema = z.object({
  id: z.uuid(),
  cedula: z.string(),
  nombres_completos: z.string(),
  telefono: z.string(),
  rol: z.string(),
  must_change_password: z.boolean(),
  activo: z.boolean(),
});

const esRolPerfil = (rol: string): rol is RolPerfil =>
  rol === 'COORDINADOR_PROVINCIAL' ||
  rol === 'COORDINADOR_RECINTO' ||
  rol === 'VEEDOR';

function convertirFilaPerfil(
  fila: PerfilRow,
  email: string,
  correoConfirmado: boolean,
  recintoId: string | null,
): Perfil {
  if (!esRolPerfil(fila.rol)) {
    throw new Error('El perfil no tiene un rol válido para ExamenI.');
  }
  if (!fila.activo) {
    throw new Error('La cuenta está desactivada. Contacte a su coordinador.');
  }

  return {
    id: fila.id,
    cedula: fila.cedula,
    nombresCompletos: fila.nombres_completos,
    telefono: fila.telefono,
    email,
    rol: fila.rol,
    recintoId,
    mustChangePassword: fila.must_change_password,
    correoConfirmado,
  };
}

function convertirUsuarioSubordinado(user: User, datos: DatosNuevoPerfil): Perfil {
  return {
    id: user.id,
    cedula: datos.cedula,
    nombresCompletos: datos.nombresCompletos,
    telefono: datos.telefono,
    email: datos.email,
    rol: datos.rol,
    recintoId: null,
    mustChangePassword: true,
    correoConfirmado: Boolean(user.email_confirmed_at),
  };
}

export class SupabaseAuthRepository implements IAuthRepository {
  async iniciarSesion(credenciales: CredencialesAcceso): Promise<Perfil> {
    const { error } = await supabase.auth.signInWithPassword(credenciales);
    if (error) throw error;

    const perfil = await this.obtenerPerfilActual();
    if (!perfil) {
      throw new Error('No se encontró un perfil asociado a esta cuenta.');
    }

    return perfil;
  }

  async obtenerPerfilActual(): Promise<Perfil | null> {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData.session?.user;
    if (!user) {
      await SecureStore.deleteItemAsync(PERFIL_CACHE_KEY);
      return null;
    }

    const connectivity = await NetInfo.fetch();
    if (connectivity.isConnected === false) {
      const cachedProfile = await SecureStore.getItemAsync(PERFIL_CACHE_KEY);
      if (cachedProfile) {
        return this.parseCachedProfile(cachedProfile);
      }

      throw new Error(
        'No hay conexión y todavía no existe un perfil guardado para esta cuenta.',
      );
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select(
        'id, cedula, nombres_completos, telefono, rol, must_change_password, activo',
      )
      .eq('id', user.id)
      .single();
    if (error) throw error;

    const parsedRow = perfilRowSchema.safeParse(data);
    if (!parsedRow.success) {
      throw new Error(`El perfil recibido no es válido: ${parsedRow.error.message}`);
    }

    const recintoId =
      parsedRow.data.rol === 'COORDINADOR_RECINTO'
        ? await this.obtenerRecintoAsignado(user.id)
        : null;
    const perfil = convertirFilaPerfil(
      parsedRow.data,
      user.email ?? '',
      Boolean(user.email_confirmed_at),
      recintoId,
    );
    await SecureStore.setItemAsync(PERFIL_CACHE_KEY, JSON.stringify(perfil));
    return perfil;
  }

  async crearUsuarioSubordinado(datos: DatosNuevoPerfil): Promise<Perfil> {
    const { data, error } =
      await supabase.functions.invoke<UsuarioSubordinadoResponse>(
        'crear-usuario-subordinado',
        {
          body: {
            email: datos.email,
            password: datos.password,
            cedula: datos.cedula,
            nombres_completos: datos.nombresCompletos,
            telefono: datos.telefono,
            rol: datos.rol,
          },
        },
      );

    if (error) throw error;
    if (!data?.user) {
      throw new Error(
        'La función de aprovisionamiento no devolvió el usuario creado.',
      );
    }

    return convertirUsuarioSubordinado(data.user, datos);
  }

  async cambiarContrasenaInicial(nuevaContrasena: string): Promise<void> {
    const { error: updateError } = await supabase.auth.updateUser({
      password: nuevaContrasena,
    });
    if (updateError) throw updateError;

    const { error: rpcError } = await supabase.rpc(
      'marcar_password_cambiado',
    );
    if (rpcError) throw rpcError;

    const profile = await SecureStore.getItemAsync(PERFIL_CACHE_KEY);
    if (!profile) return;

    const cachedProfile = this.parseCachedProfile(profile);
    await SecureStore.setItemAsync(
      PERFIL_CACHE_KEY,
      JSON.stringify({ ...cachedProfile, mustChangePassword: false }),
    );
  }

  async solicitarRecuperacionContrasena(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_REDIRECT_URL}?flow=recovery`,
    });
    if (error) throw error;
  }

  async procesarEnlaceAutenticacion(enlace: EnlaceAutenticacion): Promise<void> {
    if (enlace.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(enlace.code);
      if (error) throw error;
      return;
    }

    if (enlace.accessToken && enlace.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: enlace.accessToken,
        refresh_token: enlace.refreshToken,
      });
      if (error) throw error;
      return;
    }

    throw new Error('El enlace no contiene credenciales de autenticación válidas.');
  }

  async cerrarSesion(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    await SecureStore.deleteItemAsync(PERFIL_CACHE_KEY);
  }

  private parseCachedProfile(value: string): Perfil {
    let profile: unknown;
    try {
      profile = JSON.parse(value);
    } catch {
      throw new Error('El perfil guardado está dañado. Inicie sesión nuevamente.');
    }

    const parsedProfile = perfilAutenticadoSchema.safeParse(profile);
    if (!parsedProfile.success) {
      throw new Error(
        'El perfil guardado no es válido. Inicie sesión nuevamente.',
      );
    }

    return parsedProfile.data;
  }

  private async obtenerRecintoAsignado(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('recintos')
      .select('id')
      .eq('coordinador_recinto_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  }
}
