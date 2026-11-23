import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Candidato } from '@/domain/entities/Candidato';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import type { OrganizacionPolitica } from '@/domain/entities/OrganizacionPolitica';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import type { Recinto } from '@/domain/entities/Recinto';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type {
  ITerritorioRepository,
  NuevoRecinto,
} from '@/domain/ports/ITerritorioRepository';
import { signOut } from './authSlice';

interface TerritorioThunkExtra {
  territorioRepository: ITerritorioRepository;
  crashReportingService: ICrashReportingService;
}

interface TerritorioState {
  recintos: Recinto[];
  mesas: MesaJrv[];
  organizaciones: OrganizacionPolitica[];
  candidatos: Candidato[];
  coordinadoresRecinto: PersonalTerritorial[];
  veedoresDisponibles: PersonalTerritorial[];
  provincia: string | null;
  catalogoOffline: boolean;
  cargandoCatalogo: boolean;
  cargandoPersonal: boolean;
  guardando: boolean;
  error: string | null;
}

const initialState: TerritorioState = {
  recintos: [],
  mesas: [],
  organizaciones: [],
  candidatos: [],
  coordinadoresRecinto: [],
  veedoresDisponibles: [],
  provincia: null,
  catalogoOffline: false,
  cargandoCatalogo: false,
  cargandoPersonal: false,
  guardando: false,
  error: null,
};

const createTerritoryThunk = createAsyncThunk.withTypes<{
  extra: TerritorioThunkExtra;
  rejectValue: string;
}>();

async function reportarError(
  error: unknown,
  operacion: string,
  pantalla: string,
  reporter: ICrashReportingService,
): Promise<string> {
  const operationalError =
    error instanceof Error
      ? error
      : new Error('Ocurrió un error inesperado. Intente nuevamente.');
  await reporter.registrarError(operationalError, { operacion, pantalla });
  return operationalError.message;
}

export const cargarCatalogoTerritorial = createTerritoryThunk<
  { catalogoOffline: boolean; recintos: Recinto[]; organizaciones: OrganizacionPolitica[]; candidatos: Candidato[] },
  void
>(
  'territorio/cargarCatalogo',
  async (_, { extra, rejectWithValue }) => {
    try {
      const sincronizado =
        await extra.territorioRepository.sincronizarCatalogoTerritorial();
      const [recintos, organizaciones, candidatos] = await Promise.all([
        extra.territorioRepository.listarRecintos(),
        extra.territorioRepository.listarOrganizacionesPoliticas(),
        extra.territorioRepository.listarCandidatos(),
      ]);
      return {
        catalogoOffline: !sincronizado,
        recintos,
        organizaciones,
        candidatos,
      };
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'sincronizar_catalogo_territorial',
          'gestion_territorial',
          extra.crashReportingService,
        ),
      );
    }
  },
);

export const cargarProvinciaActual = createTerritoryThunk<string, void>(
  'territorio/cargarProvincia',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.territorioRepository.obtenerProvinciaActual();
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'consultar_jurisdiccion',
          'gestion_territorial',
          extra.crashReportingService,
        ),
      );
    }
  },
);

export const cargarMesasRecinto = createTerritoryThunk<
  MesaJrv[],
  string
>(
  'territorio/cargarMesas',
  async (recintoId, { extra, rejectWithValue }) => {
    try {
      return await extra.territorioRepository.listarMesasJrv(recintoId);
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'consultar_mesas_jrv',
          'gestion_recinto',
          extra.crashReportingService,
        ),
      );
    }
  },
);

export const cargarCoordinadoresRecinto = createTerritoryThunk<
  PersonalTerritorial[],
  void
>(
  'territorio/cargarCoordinadores',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.territorioRepository.listarCoordinadoresRecinto();
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'consultar_coordinadores_disponibles',
          'gestion_territorial',
          extra.crashReportingService,
        ),
      );
    }
  },
);

export const cargarVeedoresDisponibles = createTerritoryThunk<
  PersonalTerritorial[],
  void
>(
  'territorio/cargarVeedores',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.territorioRepository.listarVeedoresDisponibles();
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'consultar_veedores_disponibles',
          'gestion_recinto',
          extra.crashReportingService,
        ),
      );
    }
  },
);

export const crearRecinto = createTerritoryThunk<Recinto, NuevoRecinto>(
  'territorio/crearRecinto',
  async (datos, { extra, rejectWithValue }) => {
    try {
      return await extra.territorioRepository.crearRecinto(datos);
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'crear_recinto',
          'gestion_territorial',
          extra.crashReportingService,
        ),
      );
    }
  },
);

interface AsignacionCoordinador {
  recintoId: string;
  coordinadorId: string;
}

export const asignarCoordinadorRecinto = createTerritoryThunk<
  AsignacionCoordinador,
  AsignacionCoordinador
>(
  'territorio/asignarCoordinador',
  async (asignacion, { extra, rejectWithValue }) => {
    try {
      await extra.territorioRepository.asignarCoordinadorRecinto(
        asignacion.recintoId,
        asignacion.coordinadorId,
      );
      return asignacion;
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'asignar_coordinador_recinto',
          'gestion_territorial',
          extra.crashReportingService,
        ),
      );
    }
  },
);

interface AsignacionVeedores {
  recintoId: string;
  mesaIds: string[];
  veedorId: string;
}

export const asignarVeedorMesas = createTerritoryThunk<
  AsignacionVeedores,
  AsignacionVeedores
>(
  'territorio/asignarVeedores',
  async (asignacion, { extra, rejectWithValue }) => {
    try {
      await extra.territorioRepository.asignarVeedorMesas(
        asignacion.recintoId,
        asignacion.mesaIds,
        asignacion.veedorId,
      );
      return asignacion;
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'asignar_veedor_mesas',
          'gestion_recinto',
          extra.crashReportingService,
        ),
      );
    }
  },
);

interface ReemplazoVeedores {
  recintoId: string;
  veedorSalienteId: string;
  veedorEntranteId: string;
}

export const reemplazarVeedorMesas = createTerritoryThunk<
  ReemplazoVeedores & { cantidad: number },
  ReemplazoVeedores
>(
  'territorio/reemplazarVeedores',
  async (reemplazo, { extra, rejectWithValue }) => {
    try {
      const cantidad = await extra.territorioRepository.reemplazarVeedorMesas(
        reemplazo.recintoId,
        reemplazo.veedorSalienteId,
        reemplazo.veedorEntranteId,
      );
      return { ...reemplazo, cantidad };
    } catch (error) {
      return rejectWithValue(
        await reportarError(
          error,
          'reemplazar_veedor_mesas',
          'gestion_recinto',
          extra.crashReportingService,
        ),
      );
    }
  },
);

const territorioSlice = createSlice({
  name: 'territorio',
  initialState,
  reducers: {
    clearTerritorioError(state) {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(cargarCatalogoTerritorial.pending, (state) => {
        state.cargandoCatalogo = true;
        state.error = null;
      })
      .addCase(cargarCatalogoTerritorial.fulfilled, (state, action) => {
        state.cargandoCatalogo = false;
        state.catalogoOffline = action.payload.catalogoOffline;
        state.recintos = action.payload.recintos;
        state.organizaciones = action.payload.organizaciones;
        state.candidatos = action.payload.candidatos;
      })
      .addCase(cargarCatalogoTerritorial.rejected, (state, action) => {
        state.cargandoCatalogo = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(cargarProvinciaActual.fulfilled, (state, action) => {
        state.provincia = action.payload;
      })
      .addCase(cargarProvinciaActual.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(cargarMesasRecinto.pending, (state) => {
        state.cargandoCatalogo = true;
        state.error = null;
      })
      .addCase(cargarMesasRecinto.fulfilled, (state, action) => {
        state.cargandoCatalogo = false;
        state.mesas = action.payload;
      })
      .addCase(cargarMesasRecinto.rejected, (state, action) => {
        state.cargandoCatalogo = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(cargarCoordinadoresRecinto.pending, (state) => {
        state.cargandoPersonal = true;
        state.error = null;
      })
      .addCase(cargarCoordinadoresRecinto.fulfilled, (state, action) => {
        state.cargandoPersonal = false;
        state.coordinadoresRecinto = action.payload;
      })
      .addCase(cargarCoordinadoresRecinto.rejected, (state, action) => {
        state.cargandoPersonal = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(cargarVeedoresDisponibles.pending, (state) => {
        state.cargandoPersonal = true;
        state.error = null;
      })
      .addCase(cargarVeedoresDisponibles.fulfilled, (state, action) => {
        state.cargandoPersonal = false;
        state.veedoresDisponibles = action.payload;
      })
      .addCase(cargarVeedoresDisponibles.rejected, (state, action) => {
        state.cargandoPersonal = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(crearRecinto.pending, (state) => {
        state.guardando = true;
        state.error = null;
      })
      .addCase(crearRecinto.fulfilled, (state, action) => {
        state.guardando = false;
        state.recintos = [...state.recintos, action.payload].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        );
      })
      .addCase(crearRecinto.rejected, (state, action) => {
        state.guardando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(asignarCoordinadorRecinto.pending, (state) => {
        state.guardando = true;
        state.error = null;
      })
      .addCase(asignarCoordinadorRecinto.fulfilled, (state, action) => {
        state.guardando = false;
        state.recintos = state.recintos.map((recinto) =>
          recinto.id === action.payload.recintoId
            ? {
                ...recinto,
                coordinadorRecintoId: action.payload.coordinadorId,
              }
            : recinto,
        );
      })
      .addCase(asignarCoordinadorRecinto.rejected, (state, action) => {
        state.guardando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(asignarVeedorMesas.pending, (state) => {
        state.guardando = true;
        state.error = null;
      })
      .addCase(asignarVeedorMesas.fulfilled, (state, action) => {
        state.guardando = false;
        state.mesas = state.mesas.map((mesa) =>
          mesa.recintoId === action.payload.recintoId &&
          action.payload.mesaIds.includes(mesa.id)
            ? { ...mesa, veedorIds: [action.payload.veedorId] }
            : mesa,
        );
      })
      .addCase(asignarVeedorMesas.rejected, (state, action) => {
        state.guardando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(reemplazarVeedorMesas.pending, (state) => {
        state.guardando = true;
        state.error = null;
      })
      .addCase(reemplazarVeedorMesas.fulfilled, (state, action) => {
        state.guardando = false;
        state.mesas = state.mesas.map((mesa) =>
          mesa.recintoId === action.payload.recintoId &&
          mesa.veedorIds.includes(action.payload.veedorSalienteId)
            ? {
                ...mesa,
                veedorIds: [action.payload.veedorEntranteId],
              }
            : mesa,
        );
        state.veedoresDisponibles = state.veedoresDisponibles.filter(
          (veedor) => veedor.id !== action.payload.veedorSalienteId,
        );
      })
      .addCase(reemplazarVeedorMesas.rejected, (state, action) => {
        state.guardando = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(signOut.fulfilled, () => initialState);
  },
});

export const { clearTerritorioError } = territorioSlice.actions;
export const territorioReducer = territorioSlice.reducer;
