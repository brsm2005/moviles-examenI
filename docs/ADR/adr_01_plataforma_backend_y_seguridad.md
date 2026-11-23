# ADR-01: Plataforma Backend, Autenticación y Seguridad de Datos

## Requerimientos Relacionados
* **Funcionales:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-11, RF-12, RF-13
* **No Funcionales:** RNF-02
* **Supuestos:** S-03, S-04, S-05

## Contexto
La organización necesita gestión estricta de usuarios sin autoregistro, verificación de correo electrónico, cambio obligatorio de clave inicial, recuperación autónoma de contraseña y aislamiento estricto de datos por rol, almacenamiento de fotografías de actas y actualización en tiempo real de Exit Poll.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Supabase (PostgreSQL, Auth, Storage, Realtime) + Expo-secure-store** | Bryan Rodrigo Salvador Martínez | Base de datos relacional ideal para jerarquías (Provincia → Recinto → Mesa → Acta), políticas de seguridad nativas (RLS) para aislar datos por rol, verificación de correo y recuperación de clave integradas mediante SMTP, Realtime para datos de Exit Poll y `expo-secure-store` para la persistencia del JWT offline. | Requiere un diseño cuidadoso para políticas RLS y Edge Functions para la creación de usuarios sin cerrar la sesión del coordinador activo. |
| **Appwrite** | Edwin Efraín Chusín Enríquez | De código abierto y autohospedable, además acelera el desarrollo de aplicaciones web y móviles. | Menor ecosistema, documentación y comunidad; requiere mayor configuración manual para políticas granulares y envío SMTP. |
| *[Alternativa 3]* | Emily Juliet Pazmiño Mora | | |

## Decisión
**Supabase con funcionalidades nativas de la misma** (PostgreSQL, Auth con confirmación SMTP, Storage privado `actas-evidencia`, Realtime y Edge Function `crear-usuario-subordinado`) + **`expo-secure-store`** para persistencia cifrada del token JWT.

## Consecuencias
* Ganamos tiempo de desarrollo debido a un correcto manejo del ecosistema y facilidad para integrar el SMTP de correo junto con almacenamiento y API REST/Realtime.
* Si no se utiliza un SMTP propio/configurado no se pueden enviar demasiados correos por hora en el plan gratuito, pudiendo limitar pruebas masivas si no se configura Gmail SMTP.
* Obliga a configurar estrictamente las Políticas RLS para las tablas, bucket de Storage y Edge Functions.