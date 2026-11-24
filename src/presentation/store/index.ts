import { configureStore } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import type { IAuthRepository } from '@/domain/ports/IAuthRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { IMonitoreoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import type { IPersonalTerritorialRepository } from '@/domain/ports/IPersonalTerritorialRepository';
import { authReducer } from './slices/authSlice';
import { actaReducer } from './slices/actaSlice';
import { territorioReducer } from './slices/territorioSlice';
import { historialReducer } from './slices/historialSlice';
import { monitoreoReducer } from './slices/monitoreoSlice';
import { personalSlice } from './slices/personalSlice';

export function createAppStore(
  authRepository: IAuthRepository,
  territorioRepository: ITerritorioRepository,
  crashReportingService: ICrashReportingService,
  actaRepository: IActaRepository,
  monitoreoProvincial: IMonitoreoProvincial,
  personalRepository: IPersonalTerritorialRepository,
) {
  return configureStore({
    reducer: {
      auth: authReducer,
      actas: actaReducer,
      territorio: territorioReducer,
      historial: historialReducer,
      monitoreo: monitoreoReducer,
      personal: personalSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: {
            authRepository,
            territorioRepository,
            crashReportingService,
            actaRepository,
            monitoreoProvincial,
            personalRepository,
          },
        },
      }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
