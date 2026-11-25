import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { colors, fontFamilies, radius } from '@theme/tokens';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';
import { useAppDispatch } from '@/presentation/store';
import { processAuthCallback } from '@/presentation/store/slices/authSlice';

export function AuthCallbackScreen() {
  const dispatch = useAppDispatch();
  const {
    code,
    flow,
    access_token: accessToken,
    refresh_token: refreshToken,
  } = useLocalSearchParams<{
    code?: string;
    flow?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const url = useURL();
  const processed = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  const link = useMemo(() => {
    const parsedUrl = url ? new URL(url) : null;
    const hashParams = new URLSearchParams(
      parsedUrl?.hash.replace(/^#/, '') ?? '',
    );
    const getParam = (
      routeValue: string | undefined,
      key: string,
    ): string | undefined =>
      routeValue ?? parsedUrl?.searchParams.get(key) ?? hashParams.get(key) ?? undefined;

    return {
      code: getParam(code, 'code'),
      accessToken: getParam(accessToken, 'access_token'),
      refreshToken: getParam(refreshToken, 'refresh_token'),
      flow: getParam(flow, 'flow') ?? hashParams.get('type') ?? undefined,
    };
  }, [accessToken, code, flow, refreshToken, url]);
  const hasCredentials =
    Boolean(link.code) || Boolean(link.accessToken && link.refreshToken);
  const signupConfirmedWithoutSession =
    link.flow === 'signup' && !hasCredentials;
  const invalidLink = !hasCredentials && !signupConfirmedWithoutSession;
  const [feedback, setFeedback] = useState<FeedbackContent | null>(() =>
    invalidLink
      ? {
          title: 'Enlace no válido',
          message: 'El enlace no contiene credenciales de verificación válidas.',
          tone: 'error',
        }
      : null,
  );

  useEffect(() => {
    if (processed.current) return;
    if (!hasCredentials || signupConfirmedWithoutSession) {
      return;
    }
    processed.current = true;

    dispatch(
      processAuthCallback({
        code: link.code,
        accessToken: link.accessToken,
        refreshToken: link.refreshToken,
      }),
    )
      .unwrap()
      .then(() => {
        if (link.flow === 'recovery') {
          router.replace('/(auth)/change-password?flow=recovery');
          return;
        }
        router.replace('/');
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo verificar el enlace. Solicite uno nuevo.';
        setFailure(message);
        setFeedback({
          title: 'Enlace no válido',
          message,
          tone: 'error',
        });
      });
  }, [dispatch, hasCredentials, link, signupConfirmedWithoutSession]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.malvaPalido }}>
      <InstitutionalHeader />
      <View className="flex-1 items-center justify-center px-6">
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: colors.blancoPuro,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.bordeLavanda,
            padding: 24,
            alignItems: 'center',
            gap: 14,
          }}
        >
          {failure || invalidLink || signupConfirmedWithoutSession ? (
            <>
              <Text
                style={{
                  textAlign: 'center',
                  fontFamily: fontFamilies.display,
                  fontSize: 28,
                  letterSpacing: 0.7,
                  color: colors.moradoPrincipal,
                  textTransform: 'uppercase',
                }}
                selectable
              >
                {signupConfirmedWithoutSession
                  ? 'Correo confirmado'
                  : 'No se pudo completar la verificación'}
              </Text>
              <Text
                style={{
                  textAlign: 'center',
                  fontFamily: fontFamilies.bodyMedium,
                  fontSize: 15,
                  lineHeight: 22,
                  color: colors.grisCarbon,
                }}
                selectable
              >
                {signupConfirmedWithoutSession
                  ? 'Ya puede iniciar sesión con las credenciales que le entregó su coordinador.'
                  : failure ?? 'Solicite un enlace nuevo o vuelva al inicio de sesión.'}
              </Text>
              <AnimatedButton
                title="Ir al inicio de sesión"
                variant="primaryAccent"
                style={{ width: '100%', marginTop: 4 }}
                onPress={() => router.replace('/(auth)/login')}
              />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.moradoPrincipal} />
              <Text
                style={{
                  textAlign: 'center',
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 15,
                  color: colors.grisCarbon,
                }}
                selectable
              >
                Verificando su correo de forma segura…
              </Text>
            </>
          )}
        </View>
      </View>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </View>
  );
}
