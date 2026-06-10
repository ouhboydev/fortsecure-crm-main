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
    const payload = await req.json()
    console.log('GoTo Webhook received:', JSON.stringify(payload))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // GoTo Call Events API payload format
    const eventType = payload?.eventType || payload?.message?.eventType
    const callData = payload?.message || payload

    // Só processa eventos de chamada encerrada
    if (!['callEnded', 'missedCall', 'voicemail'].includes(eventType)) {
      return new Response(JSON.stringify({ skipped: true, eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const callerNumber = callData?.callerNumber || callData?.fromNumber || 'Desconhecido'
    const calleeNumber = callData?.calleeNumber || callData?.toNumber || ''
    const durationSecs = callData?.duration || callData?.talkDuration || 0
    const callDirection = callData?.direction || 'inbound'
    const endTime = callData?.endTime || callData?.terminatedTime || new Date().toISOString()

    // Tenta encontrar um cliente pelo telefone
    const cleanNumber = callerNumber.replace(/\D/g, '').slice(-10)
    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('id, name')
      .ilike('phone', `%${cleanNumber}%`)
      .limit(1)

    const customerName = matchedCustomers?.[0]?.name || callerNumber

    // Formata duração
    const mins = Math.floor(durationSecs / 60)
    const secs = durationSecs % 60
    const durationStr = durationSecs > 0 ? `${mins}min ${secs}s` : 'N/A'

    // Identifica o dono (por ramal/extensão, se disponível)
    const extensionNumber = callData?.extensionNumber || callData?.dialedNumber || ''
    let ownerId = null
    if (extensionNumber) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, ramal')
        .eq('ramal', extensionNumber)
        .limit(1)
      ownerId = profiles?.[0]?.id || null
    }

    // Se não encontrou por ramal, busca o primeiro admin como fallback
    if (!ownerId) {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
      ownerId = admins?.[0]?.id || null
    }

    if (!ownerId) {
      throw new Error('Nenhum usuário encontrado para associar a chamada.')
    }

    const eventEmoji = eventType === 'missedCall' ? '📵' : eventType === 'voicemail' ? '📬' : '📞'
    const eventLabel = eventType === 'missedCall' ? 'Chamada Perdida' : eventType === 'voicemail' ? 'Recado de Voz' : 'Ligação'
    const directionLabel = callDirection === 'inbound' ? 'Recebida' : 'Efetuada'

    const { error } = await supabase.from('activities').insert({
      owner_id: ownerId,
      title: `${eventLabel}: ${customerName}`,
      type: 'ligacao',
      status: 'concluida',
      due_date: endTime,
      description: [
        `${eventEmoji} Chamada ${directionLabel} via GoTo Connect`,
        `📱 Número: ${callerNumber}`,
        durationSecs > 0 ? `⏱ Duração: ${durationStr}` : null,
        callData?.recordingUrl ? `🎙 Gravação disponível` : null,
      ].filter(Boolean).join('\n'),
      metadata: {
        source: 'goto_connect',
        event_type: eventType,
        direction: callDirection,
        caller_number: callerNumber,
        callee_number: calleeNumber,
        duration_seconds: durationSecs,
        recording_url: callData?.recordingUrl || null,
        goto_call_id: callData?.callId || callData?.id || null,
        customer_id: matchedCustomers?.[0]?.id || null,
      },
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, activity: eventLabel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('GoTo Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
