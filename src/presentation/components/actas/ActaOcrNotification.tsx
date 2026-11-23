import { useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { descartarAvisoActa } from '@/presentation/store/slices/actaSlice';

const successAnimation = require('../../../../assets/animations/status-success.json');

export function ActaOcrNotification() {
  const modalRef = useRef<BottomSheetModal>(null);
  const dispatch = useAppDispatch();
  const actaId = useAppSelector(
    (state) => state.actas.actasListasParaConfirmar[0] ?? null,
  );

  useEffect(() => {
    if (actaId) requestAnimationFrame(() => modalRef.current?.present());
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
      snapPoints={['45%']}
      enablePanDownToClose={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="none"
        />
      )}
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1' }}
    >
      <BottomSheetView className="flex-1 items-center justify-center gap-3 px-7 pb-8">
        <LottieView
          source={successAnimation}
          autoPlay
          style={{ width: 92, height: 92 }}
        />
        <Text className="text-center text-xl font-bold text-texto" selectable>
          Acta lista para revisión
        </Text>
        <Text className="text-center text-base leading-6 text-slate-600" selectable>
          El OCR terminó. Revise las cifras y confirme manualmente antes de sincronizar.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-2 min-h-11 items-center justify-center rounded-xl bg-primario px-6"
          onPress={abrirConfirmacion}
        >
          <Text className="font-semibold text-white" selectable>
            Revisar acta
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
