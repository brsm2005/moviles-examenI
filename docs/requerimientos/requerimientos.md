# Requerimientos y Supuestos Consolidados (`ExamenI`)
**Proyecto:** Control Electoral para Organización Política  
**Examen I - Desarrollo de Aplicaciones Móviles**

---

## 1. Requerimientos Funcionales (RF-01 a RF-13)

| Código | Requerimiento | Necesidad que lo origina |
| :--- | :--- | :--- |
| **RF-01** | Validación de identidad, impedir el autoregistro público, únicamente el coordinador provincial crea cuentas para coordinadores de recinto y estos crean cuentas para los veedores. | Sección acceso a los usuarios 3.1 |
| **RF-02** | Validar campos como la cédula, nombres, teléfono, correo electrónico, exigiendo confirmar la cuenta a través del SMTP de Supabase en cada usuario creado. | Sección acceso a los usuarios 3.1 |
| **RF-03** | Cambio obligatorio de clave inicial y recuperación de esta. Obligar al usuario en su primer inicio de sesión a cambiar la contraseña temporal asignada por el superior y permitir restablecer las contraseñas si se han olvidado mediante correo electrónico. | Sección acceso a los usuarios 3.1 |
| **RF-04** | Gestión de territorio y precarga electoral de los recintos del cantón-provincia elegidos junto con las 5 organizaciones políticas y sus candidatos tanto de alcaldía y prefectura, permitiendo al coordinador provincial consultar y agregar nuevos recintos en su jurisdicción. | Organización del territorio y del personal sección 3.2 |
| **RF-05** | Permitir al coordinador provincial la gestión de coordinadores de recinto (1 por recinto), al igual que cada coordinador de recinto gestiona a 1 o varios veedores de mesas sin límite. | Organización del territorio y del personal sección 3.2 |
| **RF-06** | Permitir al coordinador de recinto el reemplazo de los veedores ausentes durante el proceso electoral, permitiendo reasignar veedores. | Organización del territorio y del personal sección 3.2 |
| **RF-07** | Permitir a cada veedor capturar 2 actas por cada mesa asignada (1 de alcaldía y 1 de prefectura), con el número de votos totales, válidos, nulos y en blanco. | Registro de los resultados sección 3.3 |
| **RF-08** | Captura fotográfica (No se permite de galería) con control local de nitidez y geolocalización, analizando su nitidez localmente antes de aceptarla, para bloquear imágenes borrosas y capturar automáticamente las coordenadas de GPS en el momento de la toma. | Registro de los resultados sección 3.3 |
| **RF-09** | Extracción de datos asistida por IA, tras procesar y aceptar la nitidez de la imagen, esta se enviará a un agente de IA por OCR (Optical Character Recognition) o Reconocimiento Óptico de Caracteres, para extraer los votos en formato JSON, asignando `null` a datos ilegibles, rellenando los campos del formulario que luego con verificación, edición humana y validación aritmética en cada acta, se procederá a enviar. | Registro de los resultados sección 3.3 |
| **RF-10** | Historial de actas y cola diferida, proveer una vista de historial con pestañas diferenciadas pendientes y enviadas que permita gestionar actas capturadas sin señal y procesar automáticamente el OCR al recuperar la conexión, notificando al veedor para su revisión y envío manual. | Registro de los resultados sección 3.3 |
| **RF-11** | Corrección de actas por veedor y coordinador, permitir al veedor editar los resultados o fotografías de sus mesas asignadas y que el coordinador de recinto pueda corregir cualquier acta perteneciente a las mesas de su recinto. Añadiendo seguimiento a las acciones de usuario con notificaciones o alertas. | Registro de los resultados sección 3.3 |
| **RF-12** | Control de acceso y visibilidad por rol, restringir la visualización y modificación de información para que cada veedor acceda solo a sus mesas asignadas, cada coordinador de recintos únicamente a su recinto y el coordinador provincial a toda su jurisdicción. | Confidencialidad de Información sección 3.4 |
| **RF-13** | Monitoreo del avance, auditoría geográfica y Exit Poll en tiempo real, mostrando al coordinador provincial el progreso de mesas reportadas vs faltantes por recinto, el detalle auditado de cada acta con la foto y ubicación en el mapa y un indicador visual de advertencias (`!`) si las coordenadas GPS difieren significativamente de las demás, junto con el conteo acumulado en vivo por candidato tanto por recinto y total cantonal. | Seguimiento de Escrutinio sección 3.5 |

---

## 2. Requerimientos No Funcionales (RNF-01 a RNF-04)

| Código | Requerimiento | Necesidad que lo origina |
| :--- | :--- | :--- |
| **RNF-01** | Operación Offline-First y sincronización: permitir capturar y validar nitidez, georreferenciar y almacenar actas localmente sin internet, ejecutando colas automáticas del procesamiento de OCR y sincronización en segundo plano al recuperar la red. | Conectividad el día de la elección sección 3.6 |
| **RNF-02** | Aislamiento de seguridad a nivel de datos: aplicar políticas de seguridad estrictas en el servidor y almacenamiento para impedir filtraciones de actas o fotografías entre distintos recintos o mesas electorales. | Confidencialidad de la información sección 3.4 |
| **RNF-03** | Observabilidad y reporte de fallos offline: capturar automáticamente cierres inesperados y errores funcionales como fallo al subir foto o fallo en el agente de IA (OCR) con el modelo del dispositivo, versión de Android y pantalla activa almacenando localmente tareas pendientes para que se suban cuando tenga conexión. | Estabilidad de la aplicación sección 3.7 |
| **RNF-04** | Desarrollar la aplicación en React Native bajo la organización de código Clean Architecture y generar el APK instalable para Android. | Restricciones técnicas y rúbrica del proyecto |

---

## 3. Supuestos Adoptados (S-01 a S-06)

| Código | Ambigüedad que resuelve | Supuesto adoptado y justificación |
| :--- | :--- | :--- |
| **S-01** | El enunciado exige detectar sumas que no cuadran en el acta, pero en las actas físicas del CNE puede haber ligeros descuadres. | **Validación aritmética estricta:** Se asume que el total de sufragantes debe ser igual a la suma de votos de los 5 candidatos, más votos blancos y votos nulos, y ningún candidato puede superar el total de sufragantes. *Justificación:* Garantiza al Exit Poll en tiempo real como fuente confiable y evita errores de digitación. |
| **S-02** | El documento pide saber desde dónde se registró cada acta para auditarla, pero no especifica si debe bloquearse el envío si el GPS está lejos del recinto. | **Registro pasivo GPS con indicador de advertencia (`!`):** Se obtiene la ubicación GPS en el instante exacto en que se toma la foto (aun sin internet) y se visualiza en el detalle del acta sin bloquear la subida; si la ubicación difiere significativamente (> 300 m) respecto al centroide de las demás actas del recinto, queda marcada con un signo de advertencia (`!`) para auditoría. *Justificación:* Muchos recintos rurales carecen de polígono GPS exacto y los veedores pueden salir del aula a buscar señal. |
| **S-03** | Tanto el veedor como el coordinador del recinto pueden corregir la misma acta lo que puede generar conflictos si se editan sin conexión. | **Resolución de conflictos *Last-Write-Wins* con trazabilidad:** Si un veedor y un coordinador modifican un acta offline y sincronizan posteriormente, prevalece la modificación más reciente (`updated_at`), conservando el ID de usuario que realizó el cambio (`actualizado_por`). *Justificación:* Simplifica la sincronización manteniendo trazabilidad de quién autorizó el dato final. |
| **S-04** | Al reemplazar a un veedor ausente a mitad de la jornada no se detalla qué pasa con las actas que el veedor saliente ya registró. | **Persistencia de actas vinculadas a la JRV:** Las actas conservan su autor original; al reasignar la mesa a un nuevo veedor, este hereda el acceso para registrar las actas pendientes y corregir las existentes. *Justificación:* Evita pérdida de información ya levantada y asegura continuidad operativa en el recinto. |
| **S-05** | Se exige verificar el correo electrónico y cambio de clave inicial pero en recintos rurales no hay conexión el día de la elección. | **Aprovisionamiento y activación previa a la jornada:** La creación de usuarios, validación de correo por SMTP y cambio obligatorio de clave inicial se realizan antes del día electoral con conectividad; una vez iniciada sesión, el token JWT permanece cacheado localmente con `expo-secure-store` para operar offline. *Justificación:* Permite cumplir los controles de seguridad sin bloquear el acceso en zonas sin red. |
| **S-06** | Al procesar las actas pendientes mediante IA cuando regresa la conexión podría interpretarse que el acta se sube automáticamente al servidor sin pasar por el veedor. | **Supervisión humana obligatoria (*Human-in-the-Loop*):** Ningún resultado extraído por IA se envía directamente al Exit Poll; al completarse el OCR en segundo plano, el acta pasa al estado *Lista para verificar* (`NEEDS_CONFIRMATION`) para que el veedor revise los campos, complete los valores en `null`, valide el cuadre y autorice el envío. *Justificación:* Evita que lecturas imprecisas de dígitos manuscritos alteren resultados sin control humano. |

---

## 4. Matriz de Trazabilidad ADR $\leftrightarrow$ Requerimientos

* **ADR-01 (Supabase + Auth + SMTP + RLS + Realtime):** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`, `RF-06`, `RF-11`, `RF-12`, `RF-13`, `RNF-02`, `S-03`, `S-04`, `S-05`
* **ADR-02 (Offline-First SQLite + Worker 2 fases + Historial):** `RF-07`, `RF-08`, `RF-10`, `RF-11`, `RNF-01`, `S-03`, `S-04`, `S-06`
* **ADR-03 (Clean Architecture + Redux Toolkit + React Hook Form + Zod):** `RF-02`, `RF-07`, `RF-09`, `RF-10`, `RF-11`, `RF-12`, `RNF-04`, `S-01`
* **ADR-04 (Expo Camera + Manipulator + jpeg-js Nitidez + Gemini OCR):** `RF-07`, `RF-08`, `RF-09`, `RF-10`, `RF-11`, `RNF-01`, `S-01`, `S-06`
* **ADR-05 (Expo Location + Haversine `!` + React Native WebView Leaflet):** `RF-08`, `RF-13`, `RNF-01`, `S-02`
* **ADR-06 (Firebase Crashlytics):** `RNF-03` (Transversal a `RF-01` – `RF-13`)
* **ADR-07 (React Navigation + BottomSheet + Lottie + Reanimated + Uniwind):** `RF-01` – `RF-13`, `RNF-04`