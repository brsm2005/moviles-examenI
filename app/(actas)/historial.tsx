import { HistorialActasScreen } from '@/presentation/screens/actas/HistorialActasScreen';
import { crashReportingService, syncWorker } from '../../src/infrastructure/services';

export default function HistorialActasRoute() {
  return (
    <HistorialActasScreen
      processingService={syncWorker}
      crashReportingService={crashReportingService}
    />
  );
}
