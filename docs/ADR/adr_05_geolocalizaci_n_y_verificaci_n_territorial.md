# ADR-05: Geolocalización y Verificación Territorial de Actas

## Requerimientos Relacionados
* **Funcionales:** RF-08, RF-13
* **No Funcionales:** RNF-01
* **Supuestos:** S-02

## Contexto
La organización necesita saber dónde se registró cada acta y que el coordinador provincial pueda consultarlo directamente al revisarla, funcionando también cuando el registro inicial se realiza sin conexión. De la misma manera, si la geolocalización difiere significativamente de otras actas registradas en el mismo recinto, se marcará con un indicador visual de advertencia (`!`) para poder auditarla posteriormente sin bloquear el envío en campo.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **expo-location + Cálculo de dispersión geográfica (Haversine) con alerta `!` + Mapa interactivo con `react-native-webview` (Leaflet/OSM)** | Bryan Rodrigo Salvador Martínez | Obtiene coordenadas GPS satelitales sin necesidad de internet y muestra el pin exacto de ubicación al coordinador provincial sin requerir claves de facturación ni API keys de Google Maps. | Cuando el coordinador revise el mapa requiere conexión para cargar los mosaicos (*tiles*) de OpenStreetMap. |
| **react-native-geolocation-service** | Edwin Efraín Chusín Enríquez | Buena precisión nativa en Android. | Requiere configuración nativa adicional frente a `expo-location` que ya está integrado en el ecosistema Expo. |
| **GPS (`expo-location`) y Geofencing** | Emily Juliet Pazmiño Mora | Permite determinar un radio de ubicación registrada para restringir el registro dentro de ese perímetro. | La precisión varía en zonas rurales y bloquearía envíos legítimos si el recinto carece de polígono GPS exacto (`S-02`). |

## Decisión
**`expo-location` (`Accuracy.High`), cálculo de dispersión geográfica (Haversine > 300 m con alerta `!`) y `react-native-webview` (Leaflet + OpenStreetMap).**

## Consecuencias
* Mayor uso momentáneo de batería al solicitar alta precisión satelital (`Accuracy.High`) durante la captura del acta.
* Permite trazabilidad territorial offline y detección visual inmediata de anomalías (`!`) para el Coordinador Provincial sin bloquear la operación rural.