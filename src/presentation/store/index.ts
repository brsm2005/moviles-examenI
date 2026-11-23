import { configureStore } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import type { IAuthRepository } from '@/domain/ports/IAuthRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import { authReducer } from './slices/authSlice';
import { actaReducer } from './slices/actaSlice';
import { territorioReducer } from './slices/territorioSlice';

export function createAppStore(
  authRepository: IAuthRepository,
  territorioRepository: ITerritorioRepository,
  crashReportingService: ICrashReportingService,
) {
  return configureStore({
    reducer: {
      auth: authReducer,
      actas: actaReducer,
      territorio: territorioReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: {
            authRepository,
            territorioRepository,
            crashReportingService,
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
