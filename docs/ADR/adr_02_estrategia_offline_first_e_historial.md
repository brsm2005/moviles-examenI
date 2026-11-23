# ADR-02: Estrategia Offline-First, Cola Diferida, Historial y Estados

## Requerimientos Relacionados
* **Funcionales:** RF-07, RF-08, RF-10, RF-11
* **No Funcionales:** RNF-01
* **Supuestos:** S-03, S-04, S-06

## Contexto
En recintos rurales los veedores no tienen internet al cerrar el escrutinio; además, en elecciones anteriores la falta de feedback visual provocó envíos duplicados al reintentar. La app debe permitir guardar actas con foto nítida y GPS sin señal, mostrando su estado en un historial (*Pendiente* vs. *Enviado*), ejecutando automáticamente la extracción OCR cuando vuelva la red y esperando la confirmación humana antes de subir el acta definitiva.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-sqlite, expo-file-system, NetInfo y Máquina de Estados** | Bryan Rodrigo Salvador Martínez | Almacenamiento relacional transaccional (ACID) permitiendo gestionar estados visibles en el historial (`PENDING_OCR` → `NEEDS_CONFIRMATION` → `PENDING_SYNC` → `SYNCED`), guarda las fotos como archivos físicos sin saturar la RAM y garantiza idempotencia con `UUID v4`. | Requiere implementar el worker de sincronización en dos fases: primero OCR al reconectar y luego la subida a Supabase tras revisión humana. |
| **SQLite + TanStack Query** | Edwin Efraín Chusín Enríquez | Facilita caché de consultas remotas y reintentos automáticos en red. | No resuelve por sí solo el procesamiento diferido de archivos binarios/OCR ni estados intermedios complejos en disco sin una cola SQLite explícita. |
| **SQLite** | Emily Juliet Pazmiño Mora | Es ligero y sostenible, permitiendo que sea sencillo de implementar en React Native y mantener los datos guardados cuando no se tenga conexión activa para recuperarlos al reconectar. | Requiere diseñar aparte el mecanismo de sincronización y manejo de imágenes en disco. |

## Decisión
**Usar SQLite con estados locales y sincronización por medio de un Worker de 2 fases (`expo-sqlite`, `expo-file-system`, `@react-native-community/netinfo` y máquina de estados).**

## Consecuencias
* Asegura cero pérdida de datos en recintos rurales sin cobertura y evita duplicados al reintentar envíos.
* El flujo requiere participación activa del veedor: el OCR es automático al haber conexión, pero la validación aritmética y confirmación final siempre son manuales (`S-06`).
* Obliga a implementar y probar la sincronización en 2 fases de forma estricta.