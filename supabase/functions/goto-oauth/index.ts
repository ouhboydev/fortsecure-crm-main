// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    const clientId = Deno.env.get('GOTO_CLIENT_ID')
    const clientSecret = Deno.env.get('GOTO_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais GoTo não configuradas.')
    }

    // Troca o authorization code pelo access token
    const authString = btoa(`${clientId}:${clientSecret}`)
    const tokenRes = await fetch('https://authentication.logmeininc.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Falha ao obter token: ${err}`)
    }

    const tokenData = await tokenRes.json()

    // Salva o token no Supabase (tabela app_settings)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error } = await supabase.from('app_settings').upsert({
      key: 'goto_token',
      value: JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        account_key: tokenData.account_key,
        organizer_key: tokenData.organizer_key,
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, organizer_key: tokenData.organizer_key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
