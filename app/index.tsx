import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppSelector } from '@/presentation/store';
import { routeForRole } from '@/presentation/navigation/roleRoutes';

export default function IndexRoute() {
  const { inicializando, perfil } = useAppSelector((state) => state.auth);

  if (inicializando) {
    return (
      <View className="flex-1 items-center justify-center bg-fondo">
        <ActivityIndicator size="large" color="#1B365D" />
      </View>
    );
  }

  if (!perfil) {
    return <Redirect href="/(auth)/login" />;
  }

  if (perfil.mustChangePassword) {
    return <Redirect href="/(auth)/change-password" />;
  }

  return <Redirect href={routeForRole(perfil.rol)} />;
}
