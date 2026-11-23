import { VerificacionActaScreen } from "@/presentation/screens/actas/VerificacionActaScreen";
import {
    actaRepository,
    crashReportingService,
    imageQualityService,
    photoStorageService,
    territorioRepository,
} from "../../src/infrastructure/services";

export default function VerificacionActaRoute() {
  return (
    <VerificacionActaScreen
      actaRepository={actaRepository}
      territorioRepository={territorioRepository}
      photoStorageService={photoStorageService}
      imageQualityService={imageQualityService}
      crashReportingService={crashReportingService}
    />
  );
}
