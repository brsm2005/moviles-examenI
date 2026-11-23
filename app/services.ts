import { ActaRepository } from '@/data/repositories/ActaRepository';
import { TerritorioRepository } from '@/data/repositories/TerritorioRepository';
import { ExpoImageQualityService } from '@/infrastructure/device/nitidez';
import { NetInfoConnectivityService } from '@/infrastructure/device/NetInfoConnectivityService';
import { ExpoLocationService } from '@/infrastructure/device/ExpoLocationService';
import { expoPhotoStorageService } from '@/infrastructure/device/ExpoPhotoStorageService';
import { GeminiActaOcrService } from '@/infrastructure/ai/GeminiActaOcrService';
import { FirebaseCrashReportingService } from '@/infrastructure/monitoring/FirebaseCrashReportingService';
import { SQLiteActaDataSource } from '@/infrastructure/storage/SQLiteActaDataSource';
import { SQLiteTerritorioDataSource } from '@/infrastructure/storage/SQLiteTerritorioDataSource';
import { SupabaseAuthRepository } from '@/infrastructure/supabase/SupabaseAuthRepository';
import { SupabaseTerritorioDataSource } from '@/infrastructure/supabase/SupabaseTerritorioDataSource';
import { SyncWorker } from '@/infrastructure/sync/SyncWorker';
import { createAppStore } from '@/presentation/store';

export const crashReportingService = new FirebaseCrashReportingService();
export const connectivityService = new NetInfoConnectivityService();
export const territorioRepository = new TerritorioRepository(
  new SupabaseTerritorioDataSource(),
  new SQLiteTerritorioDataSource(),
  connectivityService,
);
export const actaRepository = new ActaRepository(
  new SQLiteActaDataSource(),
);
export const photoStorageService = expoPhotoStorageService;
export const imageQualityService = new ExpoImageQualityService();
export const locationService = new ExpoLocationService();
export const syncWorker = new SyncWorker(
  actaRepository,
  new GeminiActaOcrService(),
  territorioRepository,
  connectivityService,
  crashReportingService,
);
export const store = createAppStore(
  new SupabaseAuthRepository(),
  territorioRepository,
  crashReportingService,
);
