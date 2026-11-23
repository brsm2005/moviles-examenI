import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar que quien llama está autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente con el token del coordinador que hace la petición (para validar su rol)
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: callerError } = await supabaseUserClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consultar el rol del creador en public.perfiles
    const { data: callerPerfil, error: callerPerfilError } = await supabaseUserClient
      .from('perfiles')
      .select('rol, activo')
      .eq('id', caller.id)
      .single();

    if (callerPerfilError || !callerPerfil || !callerPerfil.activo) {
      return new Response(JSON.stringify({ error: 'Perfil sin permisos de acceso.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { email, password, cedula, nombres_completos, telefono, rol } = body;

    // 2. Validar jerarquía estricta (RF-01):
    // Provincial crea COORDINADOR_RECINTO | Coordinador Recinto crea VEEDOR
    const puedeCrear =
      (callerPerfil.rol === 'COORDINADOR_PROVINCIAL' && rol === 'COORDINADOR_RECINTO') ||
      (callerPerfil.rol === 'COORDINADOR_RECINTO' && rol === 'VEEDOR');
    if (!puedeCrear) {
      return new Response(
        JSON.stringify({ error: 'No tienes jerarquía para crear este tipo de usuario.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cliente Admin con Secret Key (inyectada automáticamente por Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Crear usuario con contraseña temporal y disparar correo de confirmación SMTP
    // El trigger 'on_auth_user_created' insertará automáticamente en public.perfiles
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Obliga a confirmar el correo enviado por SMTP
      user_metadata: {
        cedula,
        nombres_completos,
        telefono,
        rol,
        creado_por: caller.id,
        must_change_password: true,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar el correo de verificación por el SMTP de Supabase
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: 'exameni://auth/callback?flow=signup',
      },
    });
    if (resendError) throw resendError;

    return new Response(JSON.stringify({ user: newUser.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});