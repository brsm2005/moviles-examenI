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
