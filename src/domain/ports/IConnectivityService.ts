export interface IConnectivityService {
  estaConectado(): Promise<boolean>;
}
