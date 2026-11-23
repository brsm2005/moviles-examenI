# AGENTS.md — Línea Base Arquitectónica y Reglas del Proyecto (`ExamenI`)

Este archivo es la **fuente única de verdad** para todos los agentes de desarrollo (`ARCHITECT` y `BUILDER`) del proyecto **Control Electoral para Organización Política (`ExamenI`)**.

---

## 1. Stack Tecnológico Oficial (Consenso del Equipo)

* **Framework Móvil:** React Native + Expo (`scheme: "exameni"`), compilado a APK nativo Android.
* **Arquitectura:** **Clean Architecture** estricta (`src/domain`, `src/data`, `src/infrastructure`, `src/presentation`), validada automáticamente con `eslint-plugin-boundaries` y `no-restricted-imports`.
* **Backend as a Service (ADR-01):** **Supabase** (PostgreSQL, Auth con confirmación obligatoria por SMTP, Storage privado `actas-evidencia`, Realtime y Edge Functions). Persistencia local de sesión JWT mediante `expo-secure-store`.
* **Estrategia Offline-First (ADR-02):** **SQLite + Worker de 2 fases** (`expo-sqlite`, `expo-file-system`, `@react-native-community/netinfo`) con máquina de estados: `PENDING_OCR` $\rightarrow$ `PROCESSING_OCR` $\rightarrow$ `NEEDS_CONFIRMATION` $\rightarrow$ `PENDING_SYNC` $\rightarrow$ `SYNCED`.
* **Estado Global y Formularios (ADR-03):** **Redux Toolkit** (`@reduxjs/toolkit` + `react-redux`) para estado global predecible (`authSlice`, `territorioSlice`, `historialSlice`) + **React Hook Form** + **Zod** (esquemas compartidos en `src/domain/schemas/`).
* **Captura, Nitidez y OCR con IA (ADR-04):** `expo-camera` (exclusivo, prohibida galería) + `expo-image-manipulator` + `jpeg-js` (Varianza del Laplaciano en `src/infrastructure/device/nitidez.ts`) + **Gemini Flash** (`@google/generative-ai` con `gemini-2.5-flash` y `responseSchema` JSON con campos `nullable: true`).
* **Geolocalización y Auditoría Territorial (ADR-05):** `expo-location` (`Accuracy.High`) + cálculo de dispersión geográfica (Haversine > 300 m marca `alerta_ubicacion = TRUE` con indicador **`!`**) + mapa interactivo embebido mediante `react-native-webview` (Leaflet + OpenStreetMap).
* **Observabilidad y Fallos Offline (ADR-06):** **Firebase Crashlytics** (`@react-native-firebase/app` + `@react-native-firebase/crashlytics`) con captura automática de *crashes* y reporte manual de errores no fatales (`crashlytics().recordError(...)` con atributos `operacion`, `pantalla`, `acta_id`) almacenados localmente sin red.
* **UI, Navegación y Retroalimentación (ADR-07):** **React Navigation**, **Uniwind + Tailwind CSS v4** (`className`), **`@gorhom/bottom-sheet`**, **`lottie-react-native`** y **`react-native-reanimated`**.

---

## 2. Reglas de Seguridad, Base de Datos y Negocio Innegociables

1. **Aprovisionamiento Jerárquico sin Autoregistro (RF-01, RF-02):**
   * Prohibido usar `supabase.auth.signUp()` en el cliente móvil.
   * Para crear cuentas de `COORDINADOR_RECINTO` (por el Provincial) o `VEEDOR` (por el Coordinador de Recinto), invocar siempre la Edge Function:
     `supabase.functions.invoke('crear-usuario-subordinado', { body: { email, password, cedula, nombres_completos, telefono, rol } })`.
   * Exigir confirmación de correo vía SMTP de Supabase y obligar cambio de clave en el primer inicio (`must_change_password === true` $\rightarrow$ RPC `marcar_password_cambiado`).
2. **Validación Aritmética Estricta (RF-09, S-01):**
   * En toda acta (Alcalde y Prefecto), ningún candidato puede superar `total_sufragantes` y debe cumplirse exactamente:
     `total_sufragantes === suma(votos_5_candidatos) + votos_blancos + votos_nulos`.
3. **Supervisión Humana Post-OCR (RF-09, RF-10, S-06):**
   * Nunca subir un acta a Supabase directamente tras recibir la respuesta de Gemini. Toda extracción pasa primero a estado `NEEDS_CONFIRMATION` para que el veedor complete valores `null`, verifique el cuadre y autorice el envío manual.
4. **Cero Modales Genéricos (ADR-07):**
   * Prohibido usar `Alert.alert()`. Toda confirmación, advertencia de cuadre matemático o detalle de auditoría debe presentarse con `@gorhom/bottom-sheet` y animaciones `Lottie`.
5. **Idempotencia Offline (RNF-01):**
   * Toda acta nueva genera su `id` (`UUID v4`) en el cliente antes de guardarse en `expo-sqlite` y sincroniza mediante `upsert` idempotente.