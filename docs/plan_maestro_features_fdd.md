# Plan Maestro FDD — ExamenI

## Fase 1: Modelo global del dominio

- **Perfil** representa la identidad, datos de contacto y rol jerárquico: `COORDINADOR_PROVINCIAL`, `COORDINADOR_RECINTO` o `VEEDOR`.
- **Recinto** contiene mesas JRV; una mesa puede tener uno o más veedores asignados, y el reemplazo de un veedor no cambia la autoría histórica de las actas.
- **OrganizacionPolitica** agrupa candidatos por dignidad (`ALCALDE` o `PREFECTO`).
- **Acta** pertenece a una mesa y dignidad. Conserva su UUID, evidencia fotográfica, coordenadas, alerta `!`, conteos, autoría y estado offline.
- **VotoCandidato** relaciona un candidato con un conteo que puede ser `null` durante la extracción OCR.
- La cola de actas sigue `PENDING_OCR` → `PROCESSING_OCR` → `NEEDS_CONFIRMATION` → `PENDING_SYNC` → `SYNCED`. Los datos OCR nunca se sincronizan antes de la revisión y confirmación humana.

## Fases 2 y 3: Features priorizadas y planificación

El orden prioriza identidad y territorio antes de captura, y captura antes de revisión y monitoreo.

### Bloque 1 — Acceso y seguridad jerárquica

1. **F-1.1 Autenticar la sesión de un usuario** y persistir su JWT de forma segura.
2. **F-1.2 Cambiar la contraseña inicial de un usuario** y permitir la recuperación por correo.
3. **F-1.3 Aprovisionar cuentas subordinadas de un usuario autorizado** mediante la Edge Function y con confirmación SMTP.

**Plan:** implementar el perfil y las reglas de validación; luego el repositorio de autenticación con Supabase y almacenamiento seguro de sesión. El cliente no ofrece autoregistro.

### Bloque 2 — Territorio y asignación de personal

1. **F-2.1 Consultar y registrar recintos de una jurisdicción** provincial.
2. **F-2.2 Asignar un coordinador de recinto a un recinto**.
3. **F-2.3 Asignar veedores a mesas JRV** de un recinto.
4. **F-2.4 Reemplazar veedores ausentes en mesas JRV** sin alterar la autoría de actas previas.

**Plan:** definir y precargar catálogos territoriales y electorales; después implementar asignaciones y sustituciones respetando la jerarquía y las políticas RLS.

### Bloque 3 — Captura, nitidez, geolocalización y OCR

1. **F-3.1 Capturar evidencia fotográfica y geolocalizar un acta** usando exclusivamente la cámara.
2. **F-3.2 Verificar la nitidez de la evidencia de un acta** localmente antes de guardarla.
3. **F-3.3 Extraer los resultados de votación de un acta** con OCR estructurado y campos ilegibles `null`.
4. **F-3.4 Encolar el procesamiento OCR de un acta** cuando no haya conexión y reanudarlo al reconectar.

**Plan:** completar primero los puertos de cámara/calidad/ubicación/OCR y la persistencia SQLite; luego el worker de OCR transiciona a `NEEDS_CONFIRMATION`, nunca a sincronización directa.

### Bloque 4 — Historial, revisión humana y sincronización

1. **F-4.1 Consultar el historial de actas pendientes y enviadas**.
2. **F-4.2 Validar el cuadre aritmético de un acta** y que ningún candidato supere el total de sufragantes.
3. **F-4.3 Confirmar y sincronizar un acta revisada** mediante UUID e `upsert` idempotente.
4. **F-4.4 Corregir los resultados de un acta con trazabilidad** para el veedor asignado o el coordinador del recinto.

**Plan:** implementar esquemas Zod para OCR parcial y confirmación completa; conectar el formulario a la cola; habilitar el envío manual solamente desde `NEEDS_CONFIRMATION` y mantener trazabilidad de ediciones.

### Bloque 5 — Monitoreo, auditoría y observabilidad

1. **F-5.1 Consultar el avance de mesas reportadas y faltantes por recinto**.
2. **F-5.2 Consultar el Exit Poll acumulado por candidato en tiempo real**.
3. **F-5.3 Auditar la evidencia y ubicación geográfica de un acta** mostrando `!` cuando corresponda, sin bloquear su envío.
4. **F-5.4 Reportar fallos operativos de forma diferida** mediante Crashlytics.

**Plan:** integrar vistas y Realtime de Supabase; después el detalle geográfico con Leaflet/OSM y el reporte de errores no fatales con contexto de operación, pantalla y acta.
