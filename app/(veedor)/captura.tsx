import { CapturaActaScreen } from "@/presentation/screens/veedor/CapturaActaScreen";
import {
    actaRepository,
    crashReportingService,
    imageQualityService,
    locationService,
    photoStorageService,
    syncWorker,
    territorioRepository,
} from "../../src/infrastructure/services";

export default function CapturaActaRoute() {
  return (
    <CapturaActaScreen
      actaRepository={actaRepository}
      territorioRepository={territorioRepository}
      photoStorageService={photoStorageService}
      imageQualityService={imageQualityService}
      locationService={locationService}
      processingService={syncWorker}
      crashReportingService={crashReportingService}
    />
  );
}
