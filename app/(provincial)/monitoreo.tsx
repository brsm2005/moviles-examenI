import { MonitoreoProvincialScreen } from "@/presentation/screens/provincial/MonitoreoProvincialScreen";
import { monitoreoProvincial } from "../../src/infrastructure/services";

export default function MonitoreoRoute() {
  return <MonitoreoProvincialScreen monitoreo={monitoreoProvincial} />;
}
