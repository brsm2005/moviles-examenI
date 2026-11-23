import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthTextField({
  label,
  error,
  className,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700" selectable>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        className={`min-h-12 rounded-xl border bg-white px-4 text-base text-texto ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className ?? ''}`}
        placeholderTextColor="#64748B"
      />
      {error ? (
        <Text className="text-sm text-red-700" selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
