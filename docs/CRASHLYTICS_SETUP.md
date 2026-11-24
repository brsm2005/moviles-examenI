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

En **Perfil y ajustes**, pulse **Simular crash fatal**. La aplicación se cerrará
intencionadamente. Ábrala de nuevo con conexión a Internet para que Crashlytics
pueda enviar el informe guardado. En Firebase Console, seleccione el proyecto y
la aplicación Android correspondientes y busque el evento entre los errores
fatales; su aparición puede tardar varios minutos.

Los errores operativos registrados con `recordError` aparecen como eventos no
fatales. Solicitar su registro no confirma la entrega al servidor.

Si aparece un error de disponibilidad, compruebe que usa una compilación nativa,
que la recolección está habilitada y que está consultando el proyecto correcto.
Para más detalles, revise los registros de Android con
`adb logcat -s FirebaseCrashlytics RNFBCrashlyticsInit`. Si no llega el informe,
verifique también que Crashlytics esté habilitado en Firebase Console y que la
versión instalada se haya recompilado después de cambiar la configuración.
