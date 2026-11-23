import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { DatosMonitoreo, IMonitoreoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import { signOut } from './authSlice';

interface MonitoreoState {
  datos: DatosMonitoreo | null;
  cargando: boolean;
  error: string | null;
  solicitud: string | null;
}

const initialState: MonitoreoState = {
  datos: null, cargando: false, error: null, solicitud: null,
};

export const cargarMonitoreo = createAsyncThunk<
  DatosMonitoreo, void, { extra: { monitoreoProvincial: IMonitoreoProvincial }; rejectValue: string }
>('monitoreo/cargar', async (_, { extra, rejectWithValue }) => {
  try {
    return await extra.monitoreoProvincial.consultar();
  } catch (error) {
    const mensaje = error instanceof Error ? error.message :
      typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message : 'No se pudo cargar el monitoreo.';
    return rejectWithValue(mensaje);
  }
});

const slice = createSlice({
  name: 'monitoreo',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(cargarMonitoreo.pending, (state, action) => {
        state.cargando = true;
        state.error = null;
        state.solicitud = action.meta.requestId;
      })
      .addCase(cargarMonitoreo.fulfilled, (state, action) => {
        if (state.solicitud !== action.meta.requestId) return;
        state.datos = action.payload;
        state.cargando = false;
        state.solicitud = null;
      })
      .addCase(cargarMonitoreo.rejected, (state, action) => {
        if (state.solicitud !== action.meta.requestId) return;
        state.cargando = false;
        state.solicitud = null;
        state.error = action.payload ?? action.error.message ?? 'No se pudo cargar el monitoreo.';
      })
      .addCase(signOut.fulfilled, () => initialState);
  },
});

export const monitoreoReducer = slice.reducer;
