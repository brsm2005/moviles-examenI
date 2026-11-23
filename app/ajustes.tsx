import { AjustesScreen } from "@/presentation/screens/AjustesScreen";
import { crashReportingService } from "../src/infrastructure/services";

export default function AjustesRoute() {
  return <AjustesScreen crashReporting={crashReportingService} />;
}
