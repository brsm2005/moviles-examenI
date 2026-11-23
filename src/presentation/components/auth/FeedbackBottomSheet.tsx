import { useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import LottieView from 'lottie-react-native';

const successAnimation = require('../../../../assets/animations/status-success.json');
const errorAnimation = require('../../../../assets/animations/status-error.json');
const loadingAnimation = require('../../../../assets/animations/loading-dots.json');

export interface FeedbackContent {
  title: string;
  message: string;
  tone: 'success' | 'error' | 'loading';
}

interface FeedbackBottomSheetProps {
  content: FeedbackContent | null;
  onDismiss: () => void;
}

export function FeedbackBottomSheet({
  content,
  onDismiss,
}: FeedbackBottomSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (content) {
      requestAnimationFrame(() => modalRef.current?.present());
    }
  }, [content]);

  if (!content) return null;

  const animation =
    content.tone === 'success'
      ? successAnimation
      : content.tone === 'error'
        ? errorAnimation
        : loadingAnimation;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['45%']}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      )}
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1' }}
    >
      <BottomSheetView className="flex-1 items-center justify-center gap-3 px-7 pb-8">
        <LottieView
          source={animation}
          autoPlay
          loop={content.tone === 'loading'}
          style={{ width: 92, height: 92 }}
        />
        <Text className="text-center text-xl font-bold text-texto" selectable>
          {content.title}
        </Text>
        <Text className="text-center text-base leading-6 text-slate-600" selectable>
          {content.message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          className="mt-2 min-h-11 items-center justify-center rounded-xl bg-primario px-6"
          onPress={() => modalRef.current?.dismiss()}
        >
          <Text className="font-semibold text-white" selectable>
            Entendido
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
