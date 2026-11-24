import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow = 'CONTROL ELECTORAL',
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-fondo"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow justify-center px-6 py-10"
      >
      <View className="w-full max-w-xl self-center gap-8">
        <View className="gap-5">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primario">
            <Text className="text-xl font-black text-white" selectable>
              EI
            </Text>
          </View>
          <View className="gap-2">
            <Text className="text-xs font-bold tracking-[3px] text-secundario" selectable>
              {eyebrow}
            </Text>
            <Text className="text-3xl font-bold leading-9 text-texto" selectable>
              {title}
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              {description}
            </Text>
          </View>
        </View>

        <View className="gap-5 rounded-3xl border border-slate-200 bg-superficie p-5">
          {children}
        </View>

        <Text className="text-center text-xs leading-5 text-slate-500" selectable>
          Acceso seguro para personal acreditado de ExamenI
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
