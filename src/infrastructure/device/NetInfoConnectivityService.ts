import NetInfo from '@react-native-community/netinfo';
import type { IConnectivityService } from '@/domain/ports/IConnectivityService';

export class NetInfoConnectivityService implements IConnectivityService {
  async estaConectado(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  }
}
