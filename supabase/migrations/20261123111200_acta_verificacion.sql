CREATE POLICY "Lectura de correcciones según acceso al acta"
    ON public.historial_correcciones FOR SELECT TO authenticated
    USING (acta_id IN (SELECT id FROM public.actas));

CREATE POLICY "Registro de correcciones según acceso al acta"
    ON public.historial_correcciones FOR INSERT TO authenticated
    WITH CHECK (
        editado_por = auth.uid()
        AND acta_id IN (SELECT id FROM public.actas)
    );

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
