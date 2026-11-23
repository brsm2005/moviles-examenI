import { crashReportingService } from './services';
import { AjustesScreen } from '@/presentation/screens/AjustesScreen';

export default function AjustesRoute() {
  return <AjustesScreen crashReporting={crashReportingService} />;
}
