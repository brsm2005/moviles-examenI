import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors, fontFamilies } from '@theme/tokens';
import { routeForRole } from '@/presentation/navigation/roleRoutes';
import { useAppSelector } from '@/presentation/store';

const logoRedondo = require('../assets/images/logo-redondo.jpg');

export default function IndexRoute() {
  const { inicializando, perfil } = useAppSelector((state) => state.auth);

  if (inicializando) {
    return (
      <View
        className="flex-1 items-center justify-center gap-5 px-6"
        style={{ backgroundColor: colors.moradoPrincipal }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 9999,
            overflow: 'hidden',
            borderWidth: 3,
            borderColor: colors.amarilloPrincipal,
          }}
        >
          <Image
            source={logoRedondo}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
            accessibilityLabel="Logo institucional"
          />
        </View>
        <ActivityIndicator size="large" color={colors.amarilloPrincipal} />
        <Text
          style={{
            fontFamily: fontFamilies.display,
            fontSize: 24,
            letterSpacing: 1.2,
            color: colors.blancoPuro,
            textTransform: 'uppercase',
          }}
        >
          Control Electoral
        </Text>
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
