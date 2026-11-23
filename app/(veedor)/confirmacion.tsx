import { ConfirmarActaScreen } from '@/presentation/screens/veedor/ConfirmarActaScreen';
import {
  actaRepository,
  crashReportingService,
  territorioRepository,
} from '../services';

export default function ConfirmacionActaRoute() {
  return (
    <ConfirmarActaScreen
      actaRepository={actaRepository}
      territorioRepository={territorioRepository}
      crashReportingService={crashReportingService}
    />
  );
}
