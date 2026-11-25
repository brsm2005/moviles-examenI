import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { colors, fontFamilies, radius } from '@theme/tokens';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { descartarAvisoActa } from '@/presentation/store/slices/actaSlice';
import { hapticSuccess } from '@/presentation/utils/haptics';

const successAnimation = require('../../../../assets/animations/status-success.json');

export function ActaOcrNotification() {
  const modalRef = useRef<BottomSheetModal>(null);
  const dispatch = useAppDispatch();
  const actaId = useAppSelector(
    (state) => state.actas.actasListasParaConfirmar[0] ?? null,
  );

  useEffect(() => {
    if (actaId) {
      hapticSuccess();
      requestAnimationFrame(() => modalRef.current?.present());
    }
  }, [actaId]);

  if (!actaId) return null;

  const abrirConfirmacion = () => {
    modalRef.current?.dismiss();
    router.push({
      pathname: '/(actas)/verificacion',
      params: { actaId },
    });
    dispatch(descartarAvisoActa(actaId));
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['48%']}
      enablePanDownToClose={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="none"
        />
      )}
      backgroundStyle={{ backgroundColor: colors.blancoPuro, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.bordeLavanda, width: 44 }}
    >
      <BottomSheetView className="flex-1 items-center justify-center gap-3 px-7 pb-8">
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.full,
            backgroundColor: colors.cremaLimon,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LottieView
            source={successAnimation}
            autoPlay
            style={{ width: 84, height: 84 }}
          />
        </View>
        <Text
          style={{
            textAlign: 'center',
            fontFamily: fontFamilies.display,
            fontSize: 28,
            lineHeight: 32,
            letterSpacing: 0.7,
            color: colors.moradoPrincipal,
            textTransform: 'uppercase',
          }}
          selectable
        >
          Acta lista para revisión
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
          El OCR terminó. Revise las cifras y confirme manualmente antes de sincronizar.
        </Text>
        <AnimatedButton
          title="Revisar acta ahora"
          variant="yellowAction"
          haptic="medium"
          style={{ width: '100%', marginTop: 8 }}
          onPress={abrirConfirmacion}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
