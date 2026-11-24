-- ============================================================================
-- ESQUEMA DE BASE DE DATOS: EXAMENI - CONTROL ELECTORAL (SUPABASE / POSTGRESQL)
-- ============================================================================

-- 1. EXTENSIONES Y TIPOS ENUM
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.rol_usuario AS ENUM (
    'COORDINADOR_PROVINCIAL',
    'COORDINADOR_RECINTO',
    'VEEDOR'
);

CREATE TYPE public.dignidad_tipo AS ENUM (
    'ALCALDE',
    'PREFECTO'
);

CREATE TYPE public.estado_sync_acta AS ENUM (
    'PENDING_OCR',
    'PROCESSING_OCR',
    'NEEDS_CONFIRMATION',
    'PENDING_SYNC',
    'SYNCED'
);

-- ============================================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================================

-- 2.1 Perfiles de usuario (vinculado a auth.users)
CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula VARCHAR(10) NOT NULL UNIQUE,
    nombres_completos TEXT NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol public.rol_usuario NOT NULL,
    provincia TEXT NOT NULL,
    creado_por UUID REFERENCES public.perfiles(id),
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Recintos electorales del cantón-provincia
CREATE TABLE public.recintos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cne VARCHAR(30) UNIQUE,
    nombre TEXT NOT NULL,
    provincia TEXT NOT NULL,
    canton TEXT NOT NULL,
    parroquia TEXT NOT NULL,
    direccion TEXT,
    latitud_referencia DOUBLE PRECISION,
    longitud_referencia DOUBLE PRECISION,
    coordinador_recinto_id UUID UNIQUE REFERENCES public.perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Mesas / Juntas Receptoras del Voto (JRV)
CREATE TABLE public.mesas_jrv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recinto_id UUID NOT NULL REFERENCES public.recintos(id) ON DELETE CASCADE,
    numero_mesa INTEGER NOT NULL,
    genero VARCHAR(15) NOT NULL DEFAULT 'MIXTA', -- 'MASCULINO', 'FEMENINO', 'MIXTA'
    total_electores_padron INTEGER NOT NULL DEFAULT 350,
    veedor_asignado_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (recinto_id, numero_mesa, genero)
);

-- 2.4 Organizaciones Políticas (5 listas precargadas)
CREATE TABLE public.organizaciones_politicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_numero VARCHAR(10) NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    siglas VARCHAR(20) NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#1B365D'
);

-- 2.5 Candidatos (Alcaldía y Prefectura por organización)
CREATE TABLE public.candidatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL REFERENCES public.organizaciones_politicas(id) ON DELETE CASCADE,
    dignidad public.dignidad_tipo NOT NULL,
    nombre_completo TEXT NOT NULL,
    orden_papeleta INTEGER NOT NULL,
    UNIQUE (organizacion_id, dignidad)
);

-- 2.6 Actas Electorales (2 por mesa: 1 ALCALDE + 1 PREFECTO)
CREATE TABLE public.actas (
    id UUID PRIMARY KEY, -- UUID v4 generado localmente en el dispositivo para idempotencia offline
    mesa_id UUID NOT NULL REFERENCES public.mesas_jrv(id) ON DELETE CASCADE,
    dignidad public.dignidad_tipo NOT NULL,
    registrado_por UUID NOT NULL REFERENCES public.perfiles(id),
    actualizado_por UUID REFERENCES public.perfiles(id),
    
    -- Totales del acta
    total_sufragantes INTEGER NOT NULL CHECK (total_sufragantes >= 0),
    votos_validos INTEGER NOT NULL CHECK (votos_validos >= 0),
    votos_blancos INTEGER NOT NULL CHECK (votos_blancos >= 0),
    votos_nulos INTEGER NOT NULL CHECK (votos_nulos >= 0),
    
    -- Evidencia fotográfica y nitidez
    foto_storage_path TEXT NOT NULL,
    score_nitidez DOUBLE PRECISION,
    
    -- Geolocalización y auditoría territorial (RF-08, RF-13, S-02)
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    precision_gps_m DOUBLE PRECISION,
    distancia_centroide_m DOUBLE PRECISION DEFAULT 0,
    alerta_ubicacion BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE si > 300m (activa indicador '!')
    
    -- Estado y auditoría de conflictos (S-03)
    estado_sync public.estado_sync_acta NOT NULL DEFAULT 'SYNCED',
    capturada_offline_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (mesa_id, dignidad)
);

-- 2.7 Desglose de votos por candidato en cada acta
CREATE TABLE public.acta_votos_candidatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id UUID NOT NULL REFERENCES public.actas(id) ON DELETE CASCADE,
    candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE RESTRICT,
    votos INTEGER NOT NULL CHECK (votos >= 0),
    UNIQUE (acta_id, candidato_id)
);

-- 2.8 Bitácora de auditoría de correcciones (RF-11, S-03)
CREATE TABLE public.historial_correcciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id UUID NOT NULL REFERENCES public.actas(id) ON DELETE CASCADE,
    editado_por UUID NOT NULL REFERENCES public.perfiles(id),
    rol_editor public.rol_usuario NOT NULL,
    motivo TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. FUNCIONES, RPCs Y TRIGGERS DE NEGOCIO
-- ============================================================================

-- 3.1 Trigger para crear perfil automáticamente desde Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'cedula' IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.perfiles (
        id, cedula, nombres_completos, telefono, email, rol, provincia, creado_por,
        must_change_password
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'cedula',
        NEW.raw_user_meta_data->>'nombres_completos',
        NEW.raw_user_meta_data->>'telefono',
        NEW.email,
        (NEW.raw_user_meta_data->>'rol')::public.rol_usuario,
        NEW.raw_user_meta_data->>'provincia',
        NULLIF(NEW.raw_user_meta_data->>'creado_por', '')::UUID,
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, TRUE)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3.2 RPC: Marcar cambio de contraseña inicial completado (RF-03)
CREATE OR REPLACE FUNCTION public.marcar_password_cambiado()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.perfiles
    SET must_change_password = FALSE, updated_at = NOW()
    WHERE id = auth.uid();
END;
$$;

-- Actualizar únicamente el nombre del perfil autenticado.
CREATE OR REPLACE FUNCTION public.actualizar_nombre_propio(p_perfil_id UUID, p_nombres_completos TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    nombre TEXT := pg_catalog.btrim(p_nombres_completos);
    nombre_guardado TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No hay una sesión autenticada.';
    END IF;
    IF nombre IS NULL OR pg_catalog.char_length(nombre) < 3 OR pg_catalog.char_length(nombre) > 150 THEN
        RAISE EXCEPTION 'El nombre debe tener entre 3 y 150 caracteres.';
    END IF;
    UPDATE public.perfiles
    SET nombres_completos = nombre, updated_at = pg_catalog.now()
    WHERE id = auth.uid() AND id = p_perfil_id AND activo = TRUE
    RETURNING nombres_completos INTO nombre_guardado;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró un perfil activo para esta sesión.';
    END IF;
    RETURN nombre_guardado;
END;
$$;
REVOKE ALL ON FUNCTION public.actualizar_nombre_propio(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_nombre_propio(UUID, TEXT) TO authenticated;

-- 3.3 RPC: Reemplazo inmediato de veedor ausente en mesas del recinto (RF-06, S-04)
CREATE OR REPLACE FUNCTION public.reemplazar_veedor_mesas(
    p_recinto_id UUID,
    p_veedor_saliente_id UUID,
    p_veedor_entrante_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mesas_actualizadas INTEGER;
BEGIN
    -- Validar que quien ejecuta es el coordinador de ese recinto o provincial
    IF NOT EXISTS (
        SELECT 1 FROM public.recintos r
        JOIN public.perfiles p ON p.id = auth.uid()
        WHERE r.id = p_recinto_id
          AND (
              r.coordinador_recinto_id = auth.uid()
              OR (
                  p.rol = 'COORDINADOR_PROVINCIAL'
                  AND p.provincia = r.provincia
              )
          )
    ) THEN
        RAISE EXCEPTION 'No autorizado para reasignar veedores en este recinto.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.perfiles entrante
        JOIN public.recintos r ON r.id = p_recinto_id
        WHERE entrante.id = p_veedor_entrante_id
          AND entrante.rol = 'VEEDOR'
          AND entrante.activo
          AND entrante.provincia = r.provincia
          AND (
              entrante.creado_por = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.perfiles provincial
                  WHERE provincial.id = auth.uid()
                    AND provincial.rol = 'COORDINADOR_PROVINCIAL'
                    AND provincial.provincia = r.provincia
              )
          )
    ) THEN
        RAISE EXCEPTION 'El veedor entrante no está activo o no pertenece a la provincia del recinto.';
    END IF;

    UPDATE public.mesas_jrv
    SET veedor_asignado_id = p_veedor_entrante_id
    WHERE recinto_id = p_recinto_id
      AND veedor_asignado_id = p_veedor_saliente_id;

    GET DIAGNOSTICS v_mesas_actualizadas = ROW_COUNT;

    IF v_mesas_actualizadas = 0 THEN
        RAISE EXCEPTION 'El veedor saliente no tiene mesas asignadas en este recinto.';
    END IF;

    UPDATE public.perfiles
    SET activo = FALSE, updated_at = NOW()
    WHERE id = p_veedor_saliente_id;

    RETURN v_mesas_actualizadas;
END;
$$;

-- 3.4 Trigger: Validación aritmética estricta (RF-07, RF-09, S-01)
CREATE OR REPLACE FUNCTION public.validar_cuadre_acta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW.votos_validos + NEW.votos_blancos + NEW.votos_nulos) <> NEW.total_sufragantes THEN
        RAISE EXCEPTION 'Descuadre matemático (S-01): válidos (%) + blancos (%) + nulos (%) != total sufragantes (%)',
            NEW.votos_validos, NEW.votos_blancos, NEW.votos_nulos, NEW.total_sufragantes;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_cuadre_acta
    BEFORE INSERT OR UPDATE ON public.actas
    FOR EACH ROW EXECUTE FUNCTION public.validar_cuadre_acta();

-- 3.5 Trigger: Cálculo Haversine y bandera alerta_ubicacion '!' (> 300m, RF-13, S-02)
CREATE OR REPLACE FUNCTION public.evaluar_dispersion_gps_acta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_recinto_id UUID;
    v_ref_lat DOUBLE PRECISION;
    v_ref_lon DOUBLE PRECISION;
    v_distancia_m DOUBLE PRECISION := 0;
BEGIN
    SELECT m.recinto_id INTO v_recinto_id FROM public.mesas_jrv m WHERE m.id = NEW.mesa_id;

    -- Calcular centroide con actas previas del mismo recinto; si es la primera, usar referencia del recinto
    SELECT AVG(a.latitud), AVG(a.longitud)
    INTO v_ref_lat, v_ref_lon
    FROM public.actas a
    JOIN public.mesas_jrv m ON m.id = a.mesa_id
    WHERE m.recinto_id = v_recinto_id AND a.id <> NEW.id;

    IF v_ref_lat IS NULL THEN
        SELECT r.latitud_referencia, r.longitud_referencia
        INTO v_ref_lat, v_ref_lon
        FROM public.recintos r WHERE r.id = v_recinto_id;
    END IF;

    IF v_ref_lat IS NOT NULL AND v_ref_lon IS NOT NULL THEN
        -- Fórmula de Haversine en metros
        v_distancia_m := 6371000 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(NEW.latitud - v_ref_lat) / 2), 2) +
            COS(RADIANS(v_ref_lat)) * COS(RADIANS(NEW.latitud)) *
            POWER(SIN(RADIANS(NEW.longitud - v_ref_lon) / 2), 2)
        ));
    END IF;

    NEW.distancia_centroide_m := ROUND(v_distancia_m::NUMERIC, 2);
    NEW.alerta_ubicacion := (v_distancia_m > 300);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluar_ubicacion_acta
    BEFORE INSERT OR UPDATE OF latitud, longitud ON public.actas
    FOR EACH ROW EXECUTE FUNCTION public.evaluar_dispersion_gps_acta();

-- ============================================================================
-- 4. VISTAS PARA MONITOREO EN TIEMPO REAL Y EXIT POLL (RF-13)
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_avance_recintos WITH (security_invoker = true) AS
SELECT
    r.id AS recinto_id,
    r.nombre AS recinto_nombre,
    r.parroquia,
    COUNT(DISTINCT m.id) AS total_mesas,
    COUNT(DISTINCT m.id) * 2 AS total_actas_esperadas,
    COUNT(DISTINCT a.id) AS actas_reportadas,
    (COUNT(DISTINCT m.id) * 2) - COUNT(DISTINCT a.id) AS actas_faltantes,
    COUNT(DISTINCT CASE WHEN a.alerta_ubicacion THEN a.id END) AS actas_con_alerta_gps,
    r.canton,
    COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN m.id END) AS mesas_reportadas,
    COUNT(DISTINCT m.id) - COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN m.id END) AS mesas_faltantes
FROM public.recintos r
LEFT JOIN public.mesas_jrv m ON m.recinto_id = r.id
LEFT JOIN public.actas a ON a.mesa_id = m.id
GROUP BY r.id, r.nombre, r.parroquia, r.canton;

CREATE OR REPLACE VIEW public.vw_exit_poll_resultados WITH (security_invoker = true) AS
SELECT
    r.id AS recinto_id,
    r.nombre AS recinto_nombre,
    c.dignidad,
    c.id AS candidato_id,
    c.nombre_completo AS candidato_nombre,
    op.lista_numero,
    op.siglas AS organizacion_siglas,
    op.color_hex,
    COALESCE(SUM(av.votos), 0)::INTEGER AS total_votos
FROM public.recintos r
CROSS JOIN public.candidatos c
JOIN public.organizaciones_politicas op ON op.id = c.organizacion_id
LEFT JOIN public.mesas_jrv m ON m.recinto_id = r.id
LEFT JOIN public.actas a ON a.mesa_id = m.id AND a.dignidad = c.dignidad
LEFT JOIN public.acta_votos_candidatos av ON av.acta_id = a.id AND av.candidato_id = c.id
GROUP BY r.id, r.nombre, c.dignidad, c.id, c.nombre_completo, op.lista_numero, op.siglas, op.color_hex;

-- ============================================================================
-- 5. SEGURIDAD RLS Y REALTIME (RF-11, RF-12, RNF-02)
-- ============================================================================

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas_jrv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones_politicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acta_votos_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_correcciones ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener rol actual
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mi_provincia()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT provincia FROM public.perfiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mis_recintos()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.id
    FROM public.recintos r
    WHERE (
        public.mi_rol() = 'COORDINADOR_PROVINCIAL'
        AND r.provincia = public.mi_provincia()
    )
    OR r.coordinador_recinto_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.mesas_jrv m
        WHERE m.recinto_id = r.id
          AND m.veedor_asignado_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.mis_mesas()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.id
    FROM public.mesas_jrv m
    WHERE (
        (
            public.mi_rol() IN (
                'COORDINADOR_PROVINCIAL',
                'COORDINADOR_RECINTO'
            )
            AND m.recinto_id IN (SELECT public.mis_recintos())
        )
        OR m.veedor_asignado_id = auth.uid()
    );
$$;

-- Políticas de lectura de catálogos electorales
CREATE POLICY "Catálogos visibles para usuarios autenticados"
    ON public.organizaciones_politicas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Candidatos visibles para usuarios autenticados"
    ON public.candidatos FOR SELECT TO authenticated USING (TRUE);

-- Políticas de Perfiles
-- La edición del nombre propio se realiza mediante actualizar_nombre_propio;
-- no se concede acceso directo de actualización sobre los demás campos.
CREATE POLICY "Ver propio perfil o subordinados según jerarquía"
    ON public.perfiles FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR (
            public.mi_rol() = 'COORDINADOR_PROVINCIAL'
            AND provincia = public.mi_provincia()
        )
        OR creado_por = auth.uid()
    );

-- Políticas de Recintos
CREATE POLICY "Recintos según rol"
    ON public.recintos FOR SELECT TO authenticated
    USING (id IN (SELECT public.mis_recintos()));

CREATE POLICY "Provincial gestiona recintos"
    ON public.recintos FOR ALL TO authenticated
    USING (
        public.mi_rol() = 'COORDINADOR_PROVINCIAL'
        AND provincia = public.mi_provincia()
    )
    WITH CHECK (
        public.mi_rol() = 'COORDINADOR_PROVINCIAL'
        AND provincia = public.mi_provincia()
        AND (
            coordinador_recinto_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.perfiles coordinador
                WHERE coordinador.id = recintos.coordinador_recinto_id
                  AND coordinador.rol = 'COORDINADOR_RECINTO'
                  AND coordinador.activo
                  AND coordinador.provincia = recintos.provincia
                  AND coordinador.creado_por = auth.uid()
            )
        )
    );

-- Políticas de Mesas JRV
CREATE POLICY "Mesas según rol"
    ON public.mesas_jrv FOR SELECT TO authenticated
    USING (id IN (SELECT public.mis_mesas()));

CREATE POLICY "Coordinador recinto gestiona mesas"
    ON public.mesas_jrv FOR UPDATE TO authenticated
    USING (
        (
            public.mi_rol() = 'COORDINADOR_PROVINCIAL'
            AND recinto_id IN (SELECT public.mis_recintos())
        )
        OR (
            public.mi_rol() = 'COORDINADOR_RECINTO'
            AND recinto_id IN (SELECT public.mis_recintos())
        )
    )
    WITH CHECK (
        (
            public.mi_rol() = 'COORDINADOR_PROVINCIAL'
            AND recinto_id IN (SELECT public.mis_recintos())
        )
        OR (
            public.mi_rol() = 'COORDINADOR_RECINTO'
            AND recinto_id IN (SELECT public.mis_recintos())
            AND (
                veedor_asignado_id IS NULL
                OR EXISTS (
                    SELECT 1 FROM public.perfiles veedor
                    JOIN public.recintos r ON r.id = recinto_id
                    WHERE veedor.id = mesas_jrv.veedor_asignado_id
                      AND veedor.rol = 'VEEDOR'
                      AND veedor.activo
                      AND veedor.provincia = r.provincia
                      AND veedor.creado_por = auth.uid()
                )
            )
        )
    );

-- Políticas de Actas (RF-11, RF-12)
CREATE POLICY "Lectura actas según rol"
    ON public.actas FOR SELECT TO authenticated
    USING (mesa_id IN (SELECT public.mis_mesas()));

CREATE POLICY "Inserción actas por veedor asignado o coordinador"
    ON public.actas FOR INSERT TO authenticated
    WITH CHECK (
        mesa_id IN (SELECT public.mis_mesas())
    );

CREATE POLICY "Edición actas por veedor de mesa o coordinador del recinto"
    ON public.actas FOR UPDATE TO authenticated
    USING (
        mesa_id IN (SELECT public.mis_mesas())
    );

-- Políticas de Votos por Candidato (heredan visibilidad del acta)
CREATE POLICY "Votos candidatos según acceso al acta"
    ON public.acta_votos_candidatos FOR ALL TO authenticated
    USING (
        acta_id IN (SELECT id FROM public.actas)
    )
    WITH CHECK (
        acta_id IN (SELECT id FROM public.actas)
    );

-- Bitácora de correcciones visible solo dentro del alcance del acta
CREATE POLICY "Lectura de correcciones según acceso al acta"
    ON public.historial_correcciones FOR SELECT TO authenticated
    USING (acta_id IN (SELECT id FROM public.actas));
CREATE POLICY "Registro de correcciones según acceso al acta"
    ON public.historial_correcciones FOR INSERT TO authenticated
    WITH CHECK (
        editado_por = auth.uid()
        AND acta_id IN (SELECT id FROM public.actas)
    );

-- Bucket privado de Storage para fotografías de actas (RNF-02)
INSERT INTO storage.buckets (id, name, public)
VALUES ('actas-evidencia', 'actas-evidencia', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Usuarios autenticados suben y leen evidencia de su jurisdicción"
    ON storage.objects;
CREATE POLICY "Usuarios autenticados suben y leen evidencia de su jurisdicción"
    ON storage.objects FOR ALL TO authenticated
    USING (
        bucket_id = 'actas-evidencia'
        AND (storage.foldername(name))[1]
            IN (SELECT id::TEXT FROM public.mis_mesas() AS mesas(id))
    )
    WITH CHECK (
        bucket_id = 'actas-evidencia'
        AND (storage.foldername(name))[1]
            IN (SELECT id::TEXT FROM public.mis_mesas() AS mesas(id))
    );

-- Escritura atómica de acta, desglose de votos y auditoría de correcciones.
CREATE OR REPLACE FUNCTION public.guardar_acta_verificada(
    p_acta JSONB,
    p_votos JSONB,
    p_correccion JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_acta_id UUID := (p_acta->>'id')::UUID;
    v_datos_anteriores JSONB;
    v_total_sufragantes INTEGER;
    v_votos_blancos INTEGER;
    v_votos_nulos INTEGER;
    v_votos_validos INTEGER;
BEGIN
    IF p_acta IS NULL
        OR p_acta->>'total_sufragantes' IS NULL
        OR p_acta->>'votos_blancos' IS NULL
        OR p_acta->>'votos_nulos' IS NULL THEN
        RAISE EXCEPTION 'El acta requiere todos los totales de votos.';
    END IF;

    IF p_votos IS NULL OR jsonb_typeof(p_votos) <> 'array' THEN
        RAISE EXCEPTION 'El acta requiere cinco votos de candidato.';
    END IF;

    IF jsonb_array_length(p_votos) <> 5 THEN
        RAISE EXCEPTION 'El acta requiere cinco votos de candidato y todos los totales.';
    END IF;

    v_total_sufragantes := (p_acta->>'total_sufragantes')::INTEGER;
    v_votos_blancos := (p_acta->>'votos_blancos')::INTEGER;
    v_votos_nulos := (p_acta->>'votos_nulos')::INTEGER;
    SELECT COALESCE(SUM((voto->>'votos')::INTEGER), 0)
    INTO v_votos_validos
    FROM jsonb_array_elements(p_votos) AS voto;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_votos) AS voto
        WHERE voto->>'candidato_id' IS NULL
            OR voto->>'votos' IS NULL
            OR (voto->>'votos')::INTEGER > v_total_sufragantes
    ) THEN
        RAISE EXCEPTION 'Cada candidato requiere un valor y no puede superar el total de sufragantes.';
    END IF;

    IF v_total_sufragantes <> v_votos_validos + v_votos_blancos + v_votos_nulos THEN
        RAISE EXCEPTION 'La suma de votos debe igualar el total de sufragantes.';
    END IF;

    IF p_correccion IS NOT NULL THEN
        SELECT jsonb_build_object(
            'totalSufragantes', a.total_sufragantes,
            'votosBlancos', a.votos_blancos,
            'votosNulos', a.votos_nulos,
            'votosCandidatos', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'candidatoId', voto.candidato_id,
                            'votos', voto.votos
                        )
                        ORDER BY voto.candidato_id
                    )
                    FROM public.acta_votos_candidatos voto
                    WHERE voto.acta_id = a.id
                ),
                '[]'::JSONB
            ),
            'fotoStoragePath', a.foto_storage_path
        )
        INTO v_datos_anteriores
        FROM public.actas a
        WHERE a.id = v_acta_id
        FOR UPDATE;

        IF v_datos_anteriores IS NULL THEN
            RAISE EXCEPTION 'No se encontró el acta enviada para auditar la corrección.';
        END IF;
    END IF;

    INSERT INTO public.actas (
        id, mesa_id, dignidad, registrado_por, actualizado_por,
        total_sufragantes, votos_validos, votos_blancos, votos_nulos,
        foto_storage_path, latitud, longitud, precision_gps_m,
        alerta_ubicacion, estado_sync, capturada_offline_at
    ) VALUES (
        v_acta_id, (p_acta->>'mesa_id')::UUID,
        (p_acta->>'dignidad')::public.dignidad_tipo,
        (p_acta->>'registrado_por')::UUID,
        (p_acta->>'actualizado_por')::UUID,
        v_total_sufragantes,
        v_votos_validos,
        v_votos_blancos,
        v_votos_nulos,
        p_acta->>'foto_storage_path',
        (p_acta->>'latitud')::DOUBLE PRECISION,
        (p_acta->>'longitud')::DOUBLE PRECISION,
        NULLIF(p_acta->>'precision_gps_m', '')::DOUBLE PRECISION,
        COALESCE((p_acta->>'alerta_ubicacion')::BOOLEAN, FALSE),
        'SYNCED',
        (p_acta->>'capturada_offline_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
        actualizado_por = EXCLUDED.actualizado_por,
        total_sufragantes = EXCLUDED.total_sufragantes,
        votos_validos = EXCLUDED.votos_validos,
        votos_blancos = EXCLUDED.votos_blancos,
        votos_nulos = EXCLUDED.votos_nulos,
        foto_storage_path = EXCLUDED.foto_storage_path,
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud,
        precision_gps_m = EXCLUDED.precision_gps_m,
        alerta_ubicacion = EXCLUDED.alerta_ubicacion,
        estado_sync = 'SYNCED',
        updated_at = NOW();

    DELETE FROM public.acta_votos_candidatos WHERE acta_id = v_acta_id;
    INSERT INTO public.acta_votos_candidatos (acta_id, candidato_id, votos)
    SELECT
        v_acta_id,
        (voto->>'candidato_id')::UUID,
        (voto->>'votos')::INTEGER
    FROM jsonb_array_elements(p_votos) AS voto;

    IF p_correccion IS NOT NULL THEN
        INSERT INTO public.historial_correcciones (
            acta_id, editado_por, rol_editor, motivo,
            datos_anteriores, datos_nuevos
        ) VALUES (
            v_acta_id,
            auth.uid(),
            public.mi_rol(),
            p_correccion->>'motivo',
            v_datos_anteriores,
            jsonb_build_object(
                'totalSufragantes', v_total_sufragantes,
                'votosBlancos', v_votos_blancos,
                'votosNulos', v_votos_nulos,
                'votosCandidatos', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'candidatoId', (voto->>'candidato_id')::UUID,
                                'votos', (voto->>'votos')::INTEGER
                            )
                            ORDER BY (voto->>'candidato_id')::UUID
                        )
                        FROM jsonb_array_elements(p_votos) AS voto
                    ),
                    '[]'::JSONB
                ),
                'fotoStoragePath', p_acta->>'foto_storage_path'
            )
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardar_acta_verificada(JSONB, JSONB, JSONB)
    TO authenticated;

-- Publicación Realtime para Exit Poll en vivo (RF-13)
ALTER PUBLICATION supabase_realtime ADD TABLE public.actas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.acta_votos_candidatos;