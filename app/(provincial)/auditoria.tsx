import { AuditoriaActaScreen } from "@/presentation/screens/provincial/AuditoriaActaScreen";
import { monitoreoProvincial } from "../../src/infrastructure/services";

export default function AuditoriaRoute() {
  return <AuditoriaActaScreen monitoreo={monitoreoProvincial} />;
}
