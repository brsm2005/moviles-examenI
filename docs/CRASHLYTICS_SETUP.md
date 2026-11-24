# Prueba de Firebase Crashlytics

Crashlytics requiere una compilación nativa; no funciona en Expo Go. El archivo
`google-services.json` debe corresponder al paquete Android y al proyecto Firebase.
Para habilitar la recolección en debug, `firebase.json` usa la clave
`react-native.crashlytics_debug_enabled`. Cambiarla requiere recompilar la app.

Con Android Studio y el SDK de Android configurados, compile e instale una
compilación local:

```powershell
npx expo prebuild
npx expo run:android
```

En **Perfil y ajustes**, pulse **Simular error para Crashlytics**. Es una prueba
no fatal y no debe cerrar la app. El mensaje de éxito solo confirma que se
solicitó el registro al SDK: `recordError` no confirma la entrega ni expone
todos los errores internos. Reinicie la aplicación con conexión y revise los
eventos no fatales en Firebase Console; el envío puede tardar varios minutos.

Si aparece un error de disponibilidad, compruebe que usa una compilación nativa,
que la recolección está habilitada y que está consultando el proyecto correcto.
Para más detalles, revise los registros de Android con `adb logcat`.
