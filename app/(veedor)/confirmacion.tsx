import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ConfirmacionActaRoute() {
  const params = useLocalSearchParams<{ actaId?: string | string[] }>();
  const actaId = Array.isArray(params.actaId) ? params.actaId[0] : params.actaId;
  return <Redirect href={{ pathname: '/(actas)/verificacion', params: { actaId } }} />;
}
