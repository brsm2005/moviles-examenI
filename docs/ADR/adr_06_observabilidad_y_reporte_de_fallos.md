# ADR-06: Observabilidad, Detección de Fallos y Reporte Offline

## Requerimientos Relacionados
* **Funcionales:** Transversal a RF-01 – RF-13
* **No Funcionales:** RNF-03
* **Supuestos:** Ninguno

## Contexto
En procesos anteriores la aplicación se cerraba sola sin dejar rastro del dispositivo ni de la pantalla donde ocurría el error. Ahora la captura de errores críticos y no fatales —como fallos al subir fotos o errores de extracción en el agente de IA (OCR)— debe registrar el modelo del dispositivo, la versión de Android, la pantalla activa y enviar el reporte automáticamente cuando haya conexión.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **`@sentry/react-native`** | Bryan Rodrigo Salvador Martínez | Captura automática de excepciones JavaScript y nativas, incluye caché offline nativa en disco para enviar reportes automáticamente al reconectarse registrando modelo de celular y versión de Android. | Requiere configurar el plugin de Sentry en `app.json` y el DSN del proyecto para compilar el APK. |
| **Sentry (SDK para React Native)** | Edwin Efraín Chusín Enríquez | Captura caídas de JavaScript y cierres inesperados nativos en Android; los errores no fatales se reportan manualmente con etiquetas: operación, pantalla, ID del acta. | Requiere dependencia de plataforma externa adicional a Firebase. |
| **Firebase Crashlytics (`@react-native-firebase/crashlytics`)** | Emily Juliet Pazmiño Mora | Ecosistema estándar de Google/Android, captura automática de *crashes* nativos y JS, soporte para errores no fatales (`recordError`) con atributos personalizados y almacenamiento local offline hasta recuperar red. | Requiere archivo nativo `google-services.json` de Firebase Console y compilación nativa (APK / Development Build, no Expo Go). |

## Decisión
**Firebase Crashlytics (`@react-native-firebase/app` + `@react-native-firebase/crashlytics`).**

## Consecuencias
* Los errores funcionales (fallo en OCR, fallo de subida a Storage) se registran como excepciones no fatales (`crashlytics().recordError(...)`) con atributos personalizados (`operacion`, `pantalla`, `acta_id`), mostrando el *stack trace* exacto en la consola de Firebase al recuperar conexión.
* Obliga a integrar `google-services.json` en `app.json` y probar la telemetría directamente sobre el APK compilado.