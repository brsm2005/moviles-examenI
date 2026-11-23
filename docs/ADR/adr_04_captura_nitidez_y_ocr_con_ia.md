# ADR-04: Captura Fotográfica, Detección Local de Nitidez y Extracción OCR con IA

## Requerimientos Relacionados
* **Funcionales:** RF-07, RF-08, RF-09, RF-10, RF-11
* **No Funcionales:** RNF-01, RNF-04
* **Supuestos:** S-01, S-06

## Contexto
En elecciones pasadas había actas que resultaron borrosas o ilegibles y muchos veedores son adultos mayores con poca experiencia digital. La app debe bloquear la galería, orientar la foto en vertical, validar localmente que la foto sea nítida (incluso offline) y luego extraer los campos numéricos del acta mediante IA en formato JSON estructurado, permitiendo `null` en campos poco claros para autocompletar el formulario y facilitar la revisión humana.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-camera, expo-image-manipulator, jpeg-js + Gemini OCR (`@google/generative-ai`)** | Bryan Rodrigo Salvador Martínez | Invalida si la nitidez no es suficiente de forma 100% offline (Varianza del Laplaciano en `nitidez.ts`) antes de guardarla; envía la imagen optimizada en Base64 a Gemini (`gemini-2.5-flash`), que responde con un JSON tipado con `nullable: true`. | Requiere conexión a internet para ejecutar la extracción de Gemini (resuelto mediante la cola diferida `PENDING_OCR`). |
| *[Alternativa 2]* | Edwin Efraín Chusín Enríquez | | |
| **Google ML Kit OCR + validación de calidad** | Emily Juliet Pazmiño Mora | Permite extraer números y texto de la fotografía directamente en el dispositivo. | Gran complejidad para implementarlo en Expo y baja precisión al mapear tablas complejas de actas del CNE a campos JSON estructurados. |

## Decisión
**`expo-camera` (exclusivo), `expo-image-manipulator`, `jpeg-js` (detector local de nitidez) y `@google/generative-ai` (Gemini Flash con esquema JSON `nullable: true`).**

## Consecuencias
* Se ahorra tiempo de digitación al usar OCR estructurado con IA y se garantiza calidad visual al bloquear fotos borrosas desde el dispositivo antes de guardarlas.
* Obliga a manejar el procesamiento diferido cuando no haya conexión a internet y exigir revisión humana antes del envío definitivo.

## Implementación
* La pantalla del veedor usa exclusivamente `expo-camera`, presenta una guía vertical y controla `enableTorch`. La imagen se normaliza a JPEG vertical y se analiza reducida a 512 px mediante la varianza del Laplaciano; el umbral inicial de aceptación es 100.
* La ubicación de alta precisión se obtiene al mismo tiempo que la toma. Una captura sin permiso o sin coordenadas no se persiste.
* `GeminiActaOcrService` usa `gemini-2.5-flash` con JSON estructurado y campos numéricos anulables. Configure `EXPO_PUBLIC_GEMINI_API_KEY` en el entorno de Expo y restrinja esa clave a la API y aplicación correspondientes, porque las variables `EXPO_PUBLIC_*` forman parte del cliente móvil.
* La extracción conserva sus resultados en `NEEDS_CONFIRMATION`, incluso si las cifras no cuadran; la validación aritmética estricta se aplica al confirmar manualmente.