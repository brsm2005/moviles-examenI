import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Acta } from '@/domain/entities/Acta';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import { signOut } from './authSlice';

interface HistorialThunkExtra {
  actaRepository: IActaRepository;
  crashReportingService: ICrashReportingService;
}

interface HistorialState {
  actas: Acta[];
  cargando: boolean;
  cargado: boolean;
  error: string | null;
}

const initialState: HistorialState = {
  actas: [],
  cargando: false,
  cargado: false,
  error: null,
};

const createHistorialThunk = createAsyncThunk.withTypes<{
  extra: HistorialThunkExtra;
  rejectValue: string;
}>();

export const cargarHistorialActas = createHistorialThunk<Acta[], string>(
  'historial/cargarActas',
  async (usuarioId, { extra, rejectWithValue }) => {
    try {
      return await extra.actaRepository.listarPorEstado(
        [
          'PENDING_OCR',
          'PROCESSING_OCR',
          'NEEDS_CONFIRMATION',
          'PENDING_SYNC',
          'SYNCED',
        ],
        usuarioId,
      );
    } catch (error) {
      const fallo =
        error instanceof Error
          ? error
          : new Error('No se pudo cargar el historial de actas.');
      await extra.crashReportingService.registrarError(fallo, {
        operacion: 'consultar_historial_actas',
        pantalla: 'historial_actas',
      });
      return rejectWithValue(fallo.message);
    }
  },
);

const historialSlice = createSlice({
  name: 'historial',
  initialState,
  reducers: {
    limpiarErrorHistorial(state) {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(cargarHistorialActas.pending, (state) => {
        state.cargando = true;
        state.error = null;
      })
      .addCase(cargarHistorialActas.fulfilled, (state, action) => {
        state.cargando = false;
        state.cargado = true;
        state.actas = action.payload;
      })
      .addCase(cargarHistorialActas.rejected, (state, action) => {
        state.cargando = false;
        state.cargado = true;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(signOut.fulfilled, () => initialState);
  },
});

export const { limpiarErrorHistorial } = historialSlice.actions;
export const historialReducer = historialSlice.reducer;
