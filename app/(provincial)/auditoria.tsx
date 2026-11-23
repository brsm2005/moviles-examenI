import { monitoreoProvincial } from '../services';
import { AuditoriaActaScreen } from '@/presentation/screens/provincial/AuditoriaActaScreen';

export default function AuditoriaRoute() {
  return <AuditoriaActaScreen monitoreo={monitoreoProvincial} />;
}
