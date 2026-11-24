import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  ActualizarPersonalDTO,
  CrearPersonalDTO,
  IPersonalTerritorialRepository,
} from '@/domain/ports/IPersonalTerritorialRepository';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';

interface PersonalThunkExtra {
  personalRepository: IPersonalTerritorialRepository;
}

interface PersonalState {
  subordinados: PersonalTerritorial[];
  cargando: boolean;
  error: string | null;
  creando: boolean;
  actualizando: string | null; // ID del personal siendo actualizado
  eliminando: string | null; // ID del personal siendo eliminado
  ultimoCreado: PersonalTerritorial | null;
}

const initialState: PersonalState = {
  subordinados: [],
  cargando: false,
  error: null,
  creando: false,
  actualizando: null,
  eliminando: null,
  ultimoCreado: null,
};

const createPersonalThunk = createAsyncThunk.withTypes<{
  extra: PersonalThunkExtra;
  rejectValue: string;
}>();

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado. Intente nuevamente.';
}

export const cargarSubordinados = createPersonalThunk<PersonalTerritorial[]>(
  'personal/cargarSubordinados',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.personalRepository.obtenerSubordinados();
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const crearPersonal = createPersonalThunk<PersonalTerritorial, CrearPersonalDTO>(
  'personal/crear',
  async (datos, { extra, rejectWithValue }) => {
    try {
      return await extra.personalRepository.crear(datos);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const actualizarPersonal = createPersonalThunk<PersonalTerritorial, ActualizarPersonalDTO>(
  'personal/actualizar',
  async (datos, { extra, rejectWithValue }) => {
    try {
      return await extra.personalRepository.actualizar(datos);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const eliminarPersonal = createPersonalThunk<void, string>(
  'personal/eliminar',
  async (id, { extra, rejectWithValue }) => {
    try {
      await extra.personalRepository.eliminar(id);
    } catch (error) {
      return rejectWithValue(mensajeDeError(error));
    }
  },
);

export const personalSlice = createSlice({
  name: 'personal',
  initialState,
  reducers: {
    clearPersonalError: (state) => {
      state.error = null;
    },
    clearUltimoCreado: (state) => {
      state.ultimoCreado = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Cargar subordinados
      .addCase(cargarSubordinados.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(cargarSubordinados.fulfilled, (state, action) => {
        state.cargando = false;
        state.subordinados = action.payload;
      })
      .addCase(cargarSubordinados.rejected, (state, action) => {
        state.cargando = false;
        state.error = action.payload || 'Error al cargar subordinados';
      })

      // Crear personal
      .addCase(crearPersonal.pending, (state) => {
        state.creando = true;
        state.error = null;
      })
      .addCase(crearPersonal.fulfilled, (state, action) => {
        state.creando = false;
        state.ultimoCreado = action.payload;
        state.subordinados.push(action.payload);
      })
      .addCase(crearPersonal.rejected, (state, action) => {
        state.creando = false;
        state.error = action.payload || 'Error al crear personal';
      })

      // Actualizar personal
      .addCase(actualizarPersonal.pending, (state, action) => {
        state.actualizando = action.meta.arg.id;
        state.error = null;
      })
      .addCase(actualizarPersonal.fulfilled, (state, action) => {
        state.actualizando = null;
        const indice = state.subordinados.findIndex((p) => p.id === action.payload.id);
        if (indice !== -1) {
          state.subordinados[indice] = action.payload;
        }
      })
      .addCase(actualizarPersonal.rejected, (state, action) => {
        state.actualizando = null;
        state.error = action.payload || 'Error al actualizar personal';
      })

      // Eliminar personal
      .addCase(eliminarPersonal.pending, (state, action) => {
        state.eliminando = action.meta.arg;
        state.error = null;
      })
      .addCase(eliminarPersonal.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.eliminando = null;
        state.subordinados = state.subordinados.filter((p) => p.id !== id);
      })
      .addCase(eliminarPersonal.rejected, (state, action) => {
        state.eliminando = null;
        state.error = action.payload || 'Error al eliminar personal';
      });
  },
});

export const { clearPersonalError, clearUltimoCreado } = personalSlice.actions;
export default personalSlice.reducer;
