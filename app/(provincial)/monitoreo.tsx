import { monitoreoProvincial } from '../services';
import { MonitoreoProvincialScreen } from '@/presentation/screens/provincial/MonitoreoProvincialScreen';

export default function MonitoreoRoute() {
  return <MonitoreoProvincialScreen monitoreo={monitoreoProvincial} />;
}
