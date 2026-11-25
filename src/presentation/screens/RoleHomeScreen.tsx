import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colors, fontFamilies, radius, shadows } from '@theme/tokens';
import type { RolPerfil } from '@/domain/entities/Perfil';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { RoleBadge } from '@/presentation/components/ui/RoleBadge';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { signOut } from '@/presentation/store/slices/authSlice';

const logoRedondo = require('../../../assets/images/logo-redondo.jpg');

interface RoleHomeScreenProps {
  role: RolPerfil;
  title: string;
  description: string;
}

export function RoleHomeScreen({
  role,
  title,
  description,
}: RoleHomeScreenProps) {
  const dispatch = useAppDispatch();
  const perfil = useAppSelector((state) => state.auth.perfil);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
      router.replace('/(auth)/login');
    } catch (error) {
      setFeedback({
        title: 'No se pudo cerrar la sesión',
        message:
          error instanceof Error ? error.message : 'Intente nuevamente.',
        tone: 'error',
      });
    }
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.malvaPalido }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
    >
      {/* Tarjeta institucional del perfil autenticado */}
      <View
        style={{
          backgroundColor: colors.moradoPrincipal,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          padding: 20,
          gap: 14,
          boxShadow: shadows.raised,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: radius.full,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: colors.amarilloPrincipal,
              flexShrink: 0,
            }}
          >
            <Image
              source={logoRedondo}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel="Emblema de perfil"
            />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text
              numberOfLines={2}
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 30,
                lineHeight: 32,
                letterSpacing: 0.7,
                color: colors.blancoPuro,
                textTransform: 'uppercase',
              }}
              selectable
            >
              {title}
            </Text>
            {perfil?.nombresCompletos ? (
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 14,
                  color: colors.amarilloPrincipal,
                }}
                selectable
              >
                {perfil.nombresCompletos}
              </Text>
            ) : null}
          </View>
        </View>

        <Text
          style={{
            fontFamily: fontFamilies.bodyMedium,
            fontSize: 14,
            lineHeight: 20,
            color: colors.malvaPalido,
          }}
          selectable
        >
          {description}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <RoleBadge role={role} />
          <View
            style={{
              backgroundColor: colors.moradoOscuro,
              borderRadius: radius.full,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilies.bodySemiBold,
                fontSize: 11,
                color: colors.blancoPuro,
              }}
            >
              Operación en campo
            </Text>
          </View>
        </View>
      </View>

      {/* Acciones principales en campo */}
      {role !== 'VEEDOR' ? (
        <AnimatedButton
          variant="yellowAction"
          haptic="medium"
          onPress={() => router.push('/(auth)/register-subordinate')}
        >
          <SymbolView
            name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
            size={20}
            tintColor={colors.moradoPrincipal}
          />
          <Text
            style={{
              fontFamily: fontFamilies.bodyBold,
              fontSize: 15,
              color: colors.moradoPrincipal,
            }}
            selectable
          >
            Registrar {role === 'COORDINADOR_PROVINCIAL' ? 'coordinador de recinto' : 'veedor'}
          </Text>
        </AnimatedButton>
      ) : (
        <View style={{ gap: 14 }}>
          <AnimatedButton
            variant="yellowAction"
            haptic="medium"
            onPress={() => router.push('/(veedor)/captura')}
            style={{ width: '100%' }}
          >
            <SymbolView
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              size={22}
              tintColor={colors.moradoPrincipal}
            />
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 24,
                letterSpacing: 0.8,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Subir y capturar acta
            </Text>
          </AnimatedButton>

          <View
            style={{
              backgroundColor: colors.lavandaSuave,
              borderColor: colors.bordeLavanda,
              borderWidth: 1,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              padding: 16,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 22,
                letterSpacing: 0.6,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
            >
              Seguimiento de actas
            </Text>
            <Text
              style={{
                fontFamily: fontFamilies.bodyMedium,
                fontSize: 13,
                lineHeight: 19,
                color: colors.grisCarbon,
              }}
            >
              Verifique resultados leídos por OCR, corrija cifras y revise el estado de sincronización offline.
            </Text>
            <AnimatedButton
              title="Abrir historial"
              variant="primary"
              onPress={() => router.push('/(actas)/historial')}
            />
          </View>
        </View>
      )}

      {/* Acciones secundarias de cuenta */}
      <View
        style={{
          backgroundColor: colors.blancoPuro,
          borderColor: colors.bordeNeutro,
          borderWidth: 1,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: 16,
          gap: 12,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.display,
            fontSize: 20,
            letterSpacing: 0.6,
            color: colors.moradoPrincipal,
            textTransform: 'uppercase',
          }}
        >
          Cuenta y seguridad
        </Text>
        <AnimatedButton
          title="Perfil y ajustes"
          variant="outline"
          onPress={() => router.push('/ajustes')}
        />
        <AnimatedButton
          title="Cerrar sesión"
          variant="neutral"
          onPress={handleSignOut}
        />
      </View>

      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </ScrollView>
  );
}
