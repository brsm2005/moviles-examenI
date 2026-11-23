import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
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
    <View className="flex-1 items-center justify-center gap-4 bg-fondo px-8">
      {failure || invalidLink || signupConfirmedWithoutSession ? (
        <>
          <Text className="text-center text-xl font-bold text-texto" selectable>
            {signupConfirmedWithoutSession
              ? 'Correo confirmado'
              : 'No se pudo completar la verificación'}
          </Text>
          <Text className="text-center leading-6 text-slate-600" selectable>
            {signupConfirmedWithoutSession
              ? 'Ya puede iniciar sesión con las credenciales que le entregó su coordinador.'
              : failure ?? 'Solicite un enlace nuevo o vuelva al inicio de sesión.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-6"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text className="font-bold text-white" selectable>
              Ir al inicio de sesión
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#1B365D" />
          <Text className="text-center text-base font-semibold text-texto" selectable>
            Verificando su correo de forma segura…
          </Text>
        </>
      )}
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </View>
  );
}
