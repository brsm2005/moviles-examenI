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

ALTER VIEW public.vw_exit_poll_resultados SET (security_invoker = true);
