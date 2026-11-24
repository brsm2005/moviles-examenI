import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Symbols } from 'expo-symbols';

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
      <Text className="text-sm font-semibold text-slate-700" selectable>
        {label}
      </Text>
      <View className="relative">
        <TextInput
          {...inputProps}
          secureTextEntry={secureTextEntry}
          className={`min-h-12 rounded-xl border bg-white px-4 text-base text-texto ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${shouldShowToggle ? 'pr-14' : ''} ${className ?? ''}`}
          placeholderTextColor="#64748B"
        />
        {shouldShowToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-0 h-12 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Symbols
              name={isPasswordVisible ? 'eye.fill' : 'eye.slash.fill'}
              size={18}
              color="#64748B"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-sm text-red-700" selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
