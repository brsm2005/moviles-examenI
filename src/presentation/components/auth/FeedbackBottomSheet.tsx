import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import LottieView from 'lottie-react-native';
import { colors, fontFamilies, radius } from '@theme/tokens';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { hapticError, hapticSuccess } from '@/presentation/utils/haptics';

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
      if (content.tone === 'success') hapticSuccess();
      else if (content.tone === 'error') hapticError();
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

  const toneBg =
    content.tone === 'success'
      ? colors.exitoFondo
      : content.tone === 'error'
        ? colors.errorFondo
        : colors.lavandaSuave;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['48%']}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
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
            backgroundColor: toneBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LottieView
            source={animation}
            autoPlay
            loop={content.tone === 'loading'}
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
          {content.title}
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
          {content.message}
        </Text>
        <AnimatedButton
          accessibilityLabel="Cerrar aviso"
          title="Entendido"
          variant="primaryAccent"
          style={{ width: '100%', marginTop: 8 }}
          onPress={() => modalRef.current?.dismiss()}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
