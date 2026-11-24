import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  CredencialesAcceso,
  DatosNuevoPerfil,
  EnlaceAutenticacion,
  IAuthRepository,
} from '@/domain/ports/IAuthRepository';
import type { Perfil } from '@/domain/entities/Perfil';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';

interface AuthThunkExtra {
  authRepository: IAuthRepository;
  crashReportingService: ICrashReportingService;
}

interface AuthState {
  perfil: Perfil | null;
  ultimoSubordinadoCreado: Perfil | null;
  inicializando: boolean;
  cargando: boolean;
  error: string | null;
}

const initialState: AuthState = {
  perfil: null,
  ultimoSubordinadoCreado: null,
  inicializando: true,
  cargando: false,
  error: null,
};

const createAuthThunk = createAsyncThunk.withTypes<{
  extra: AuthThunkExtra;
  rejectValue: string;
}>();

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado. Intente nuevamente.';
}

export const hydrateSession = createAuthThunk<Perfil | null>(
  'auth/hydrateSession',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.obtenerPerfilActual();
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const signIn = createAuthThunk<Perfil, CredencialesAcceso>(
  'auth/signIn',
  async (credenciales, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.iniciarSesion(credenciales);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const actualizarNombrePropio = createAuthThunk<Perfil, string>(
  'auth/actualizarNombrePropio',
  async (nuevoNombre, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.actualizarNombrePropio(nuevoNombre);
    } catch (error) {
      await extra.crashReportingService.registrarError(
        error instanceof Error ? error : new Error(mensajeDeError(error)),
        { operacion: 'actualizar_nombre_propio', pantalla: 'ajustes' },
      );
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const registerSubordinate = createAuthThunk<Perfil, DatosNuevoPerfil>(
  'auth/registerSubordinate',
  async (datos, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.crearUsuarioSubordinado(datos);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const changeInitialPassword = createAuthThunk<
  Perfil,
  string
>(
  'auth/changeInitialPassword',
  async (nuevaContrasena, { extra, rejectWithValue }) => {
    try {
      await extra.authRepository.cambiarContrasenaInicial(nuevaContrasena);
      const perfil = await extra.authRepository.obtenerPerfilActual();
      if (!perfil) {
        throw new Error('No se pudo recuperar el perfil después del cambio.');
      }
      return perfil;
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const requestPasswordReset = createAuthThunk<void, string>(
  'auth/requestPasswordReset',
  async (email, { extra, rejectWithValue }) => {
    try {
      await extra.authRepository.solicitarRecuperacionContrasena(email);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const processAuthCallback = createAuthThunk<
  Perfil,
  EnlaceAutenticacion
>(
  'auth/processAuthCallback',
  async (enlace, { extra, rejectWithValue }) => {
    try {
      await extra.authRepository.procesarEnlaceAutenticacion(enlace);
      const perfil = await extra.authRepository.obtenerPerfilActual();
      if (!perfil) {
        throw new Error('No se encontró el perfil asociado al enlace.');
      }
      return perfil;
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const signOut = createAuthThunk<void>(
  'auth/signOut',
  async (_, { extra, rejectWithValue }) => {
    try {
      await extra.authRepository.cerrarSesion();
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    clearCreatedSubordinate(state) {
      state.ultimoSubordinadoCreado = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(hydrateSession.pending, (state) => {
        state.inicializando = true;
        state.error = null;
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.inicializando = false;
        state.perfil = action.payload;
      })
      .addCase(hydrateSession.rejected, (state, action) => {
        state.inicializando = false;
        state.perfil = null;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(signIn.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.cargando = false;
        state.perfil = action.payload;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(actualizarNombrePropio.fulfilled, (state, action) => {
        if (state.perfil?.id === action.payload.id) {
          state.perfil = action.payload;
        }
      })
      .addCase(registerSubordinate.pending, (state) => {
        state.cargando = true;
        state.error = null;
        state.ultimoSubordinadoCreado = null;
      })
      .addCase(registerSubordinate.fulfilled, (state, action) => {
        state.cargando = false;
        state.ultimoSubordinadoCreado = action.payload;
      })
      .addCase(registerSubordinate.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(changeInitialPassword.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(changeInitialPassword.fulfilled, (state, action) => {
        state.cargando = false;
        state.perfil = action.payload;
      })
      .addCase(changeInitialPassword.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.cargando = false;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(processAuthCallback.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(processAuthCallback.fulfilled, (state, action) => {
        state.cargando = false;
        state.perfil = action.payload;
      })
      .addCase(processAuthCallback.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(signOut.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.cargando = false;
        state.perfil = null;
        state.ultimoSubordinadoCreado = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload ?? action.error.message ?? null;
      });
  },
});

export const { clearAuthError, clearCreatedSubordinate } = authSlice.actions;
export const authReducer = authSlice.reducer;
