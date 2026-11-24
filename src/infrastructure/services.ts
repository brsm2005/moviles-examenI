import { ActaRepository } from '@/data/repositories/ActaRepository';
import { TerritorioRepository } from '@/data/repositories/TerritorioRepository';
import { PersonalTerritorialRepository } from '@/data/repositories/PersonalTerritorialRepository';
import { ExpoImageQualityService } from '@/infrastructure/device/nitidez';
import { NetInfoConnectivityService } from '@/infrastructure/device/NetInfoConnectivityService';
import { ExpoLocationService } from '@/infrastructure/device/ExpoLocationService';
import { expoPhotoStorageService } from '@/infrastructure/device/ExpoPhotoStorageService';
import { GeminiActaOcrService } from '@/infrastructure/ai/GeminiActaOcrService';
import { FirebaseCrashlyticsService } from '@/infrastructure/monitoring/crashlytics';
import { SupabaseMonitoreoProvincial } from '@/infrastructure/supabase/SupabaseMonitoreoProvincial';
import { SupabasePersonalTerritorialDataSource } from '@/infrastructure/supabase/SupabasePersonalTerritorialDataSource';
import { SQLiteActaDataSource } from '@/infrastructure/storage/SQLiteActaDataSource';
import { SupabaseActaDataSource } from '@/infrastructure/supabase/SupabaseActaDataSource';
import { SQLiteTerritorioDataSource } from '@/infrastructure/storage/SQLiteTerritorioDataSource';
import { SupabaseAuthRepository } from '@/infrastructure/supabase/SupabaseAuthRepository';
import { SupabaseTerritorioDataSource } from '@/infrastructure/supabase/SupabaseTerritorioDataSource';
import { SyncWorker } from '@/infrastructure/sync/SyncWorker';
import { createAppStore } from '@/presentation/store';
import { supabase } from '@/infrastructure/supabase/client';

export const crashReportingService = new FirebaseCrashlyticsService();
export const monitoreoProvincial = new SupabaseMonitoreoProvincial();
export const connectivityService = new NetInfoConnectivityService();
export const territorioRepository = new TerritorioRepository(
  new SupabaseTerritorioDataSource(),
  new SQLiteTerritorioDataSource(),
  connectivityService,
);
export const actaRepository = new ActaRepository(
  new SQLiteActaDataSource(),
  new SupabaseActaDataSource(crashReportingService),
  connectivityService,
);
export const personalRepository = new PersonalTerritorialRepository(
  new SupabasePersonalTerritorialDataSource(supabase),
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
  actaRepository,
  monitoreoProvincial,
  personalRepository,
);
