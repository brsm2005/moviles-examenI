import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  DatosCrearUsuario,
  DatosEditarUsuario,
  FiltrosUsuarios,
  GestorUsuarios,
  ResultadoListaUsuarios,
} from '@/domain/entities/GestorUsuarios';
import type { IUsuariosRepository } from '@/domain/ports/IUsuariosRepository';

interface UsuariosThunkExtra {
  usuariosRepository: IUsuariosRepository;
}

interface UsuariosState {
  usuarios: GestorUsuarios[];
  usuarioActual: GestorUsuarios | null;
  total: number;
  pagina: number;
  porPagina: number;
  cargando: boolean;
  error: string | null;
}

const initialState: UsuariosState = {
  usuarios: [],
  usuarioActual: null,
  total: 0,
  pagina: 1,
  porPagina: 10,
  cargando: false,
  error: null,
};

const createUsuariosThunk = createAsyncThunk.withTypes<{
  extra: UsuariosThunkExtra;
  rejectValue: string;
}>();

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado. Intente nuevamente.';
}

export const obtenerUsuarios = createUsuariosThunk<
  ResultadoListaUsuarios,
  { filtros: FiltrosUsuarios; pagina?: number; porPagina?: number }
>('usuarios/obtenerUsuarios', async ({ filtros, pagina = 1, porPagina = 10 }, { extra, rejectWithValue }) => {
  try {
    return await extra.usuariosRepository.obtenerUsuarios(filtros, pagina, porPagina);
  } catch (error) {
    return rejectWithValue(mensajeDeError(error));
  }
});

export const crearUsuario = createUsuariosThunk<
  GestorUsuarios,
  { datos: DatosCrearUsuario; recintoIdDelCreador?: string }
>('usuarios/crearUsuario', async ({ datos, recintoIdDelCreador }, { extra, rejectWithValue }) => {
  try {
    return await extra.usuariosRepository.crearUsuario(datos, recintoIdDelCreador);
  } catch (error) {
    return rejectWithValue(mensajeDeError(error));
  }
});

export const obtenerUsuarioPorId = createUsuariosThunk<GestorUsuarios | null, string>(
  'usuarios/obtenerUsuarioPorId',
  async (id, { extra, rejectWithValue }) => {
    try {
      return await extra.usuariosRepository.obtenerUsuarioPorId(id);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  }
);

export const editarUsuario = createUsuariosThunk<
  GestorUsuarios,
  { id: string; datos: DatosEditarUsuario }
>('usuarios/editarUsuario', async ({ id, datos }, { extra, rejectWithValue }) => {
  try {
    return await extra.usuariosRepository.editarUsuario(id, datos);
  } catch (error) {
    return rejectWithValue(mensajeDeError(error));
  }
});

export const desactivarUsuario = createUsuariosThunk<void, string>(
  'usuarios/desactivarUsuario',
  async (id, { extra, rejectWithValue }) => {
    try {
      await extra.usuariosRepository.desactivarUsuario(id);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  }
);

export const activarUsuario = createUsuariosThunk<void, string>(
  'usuarios/activarUsuario',
  async (id, { extra, rejectWithValue }) => {
    try {
      await extra.usuariosRepository.activarUsuario(id);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  }
);

export const editarNombrePropio = createUsuariosThunk<GestorUsuarios, { id: string; nuevoNombre: string }>(
  'usuarios/editarNombrePropio',
  async ({ id, nuevoNombre }, { extra, rejectWithValue }) => {
    try {
      return await extra.usuariosRepository.editarNombrePropio(id, nuevoNombre);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  }
);

const usuariosSlice = createSlice({
  name: 'usuarios',
  initialState,
  reducers: {
    clearUsuariosError: (state) => {
      state.error = null;
    },
    limpiarUsuarios: (state) => {
      state.usuarios = [];
      state.usuarioActual = null;
      state.total = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(obtenerUsuarios.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(obtenerUsuarios.fulfilled, (state, action) => {
        state.cargando = false;
        state.usuarios = action.payload.usuarios;
        state.total = action.payload.total;
        state.pagina = action.payload.pagina;
        state.porPagina = action.payload.porPagina;
      })
      .addCase(obtenerUsuarios.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al obtener usuarios';
      })

      .addCase(crearUsuario.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(crearUsuario.fulfilled, (state, action) => {
        state.cargando = false;
        state.usuarioActual = action.payload;
        state.usuarios.push(action.payload);
      })
      .addCase(crearUsuario.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al crear usuario';
      })

      .addCase(obtenerUsuarioPorId.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(obtenerUsuarioPorId.fulfilled, (state, action) => {
        state.cargando = false;
        state.usuarioActual = action.payload;
      })
      .addCase(obtenerUsuarioPorId.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al obtener usuario';
      })

      .addCase(editarUsuario.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(editarUsuario.fulfilled, (state, action) => {
        state.cargando = false;
        const indice = state.usuarios.findIndex((u) => u.id === action.payload.id);
        if (indice !== -1) {
          state.usuarios[indice] = action.payload;
        }
        if (state.usuarioActual?.id === action.payload.id) {
          state.usuarioActual = action.payload;
        }
      })
      .addCase(editarUsuario.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al editar usuario';
      })

      .addCase(desactivarUsuario.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(desactivarUsuario.fulfilled, (state) => {
        state.cargando = false;
      })
      .addCase(desactivarUsuario.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al desactivar usuario';
      })

      .addCase(activarUsuario.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(activarUsuario.fulfilled, (state) => {
        state.cargando = false;
      })
      .addCase(activarUsuario.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al activar usuario';
      })

      .addCase(editarNombrePropio.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(editarNombrePropio.fulfilled, (state, action) => {
        state.cargando = false;
        if (state.usuarioActual?.id === action.payload.id) {
          state.usuarioActual = action.payload;
        }
      })
      .addCase(editarNombrePropio.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al actualizar nombre';
      });
  },
});

export const { clearUsuariosError, limpiarUsuarios } = usuariosSlice.actions;
export default usuariosSlice.reducer;
