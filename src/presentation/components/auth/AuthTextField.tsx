import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SymbolView } from 'expo-symbols';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export function AuthTextField({
  label,
  error,
  className,
  showPasswordToggle = false,
  secureTextEntry: initialSecureTextEntry = false,
  ...inputProps
}: AuthTextFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldShowToggle = showPasswordToggle && initialSecureTextEntry;
  const secureTextEntry = shouldShowToggle ? !isPasswordVisible : initialSecureTextEntry;

  return (
    <View className="gap-2">
      <Text className="font-body-semibold text-sm text-texto" selectable>
        {label}
      </Text>
      <View className="relative">
        <TextInput
          {...inputProps}
          secureTextEntry={secureTextEntry}
          className={`min-h-12 rounded-xl border-[1.5px] bg-white px-4 font-body text-base text-texto focus:border-primario ${
            error ? 'border-alerta bg-red-50' : 'border-borde-lavanda'
          } ${shouldShowToggle ? 'pr-14' : ''} ${className ?? ''}`}
          placeholderTextColor="#52465B"
          selectionColor="#6F2C91"
        />
        {shouldShowToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute right-2 top-0 h-12 w-12 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <SymbolView
              name={{
                ios: isPasswordVisible ? 'eye.fill' : 'eye.slash.fill',
                android: isPasswordVisible ? 'visibility' : 'visibility_off',
                web: isPasswordVisible ? 'visibility' : 'visibility_off',
              }}
              size={20}
              tintColor="#6F2C91"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="font-body-semibold text-xs text-alerta" selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
