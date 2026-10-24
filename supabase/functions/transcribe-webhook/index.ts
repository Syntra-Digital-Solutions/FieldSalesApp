import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { voice_note_id, audio_url, word_boost } = await req.json()
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    const webhookUrl = Deno.env.get('ASSEMBLYAI_WEBHOOK_URL')

    console.log(`🎙️ Starting transcription for note: ${voice_note_id}`)

    const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { 'authorization': apiKey ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ 
        audio_url,
        word_boost: word_boost || [],
        boost_param: "high",
        language_code: "en",
        webhook_url: webhookUrl 
      }),
    })
    const submitData = await submitRes.json()
    
    if (!submitData.id) {
      console.error('❌ AssemblyAI Submit Error:', submitData)
      return new Response(JSON.stringify({ error: 'Could not start transcription: ' + (submitData.error || 'unknown') }), { status: 400, headers: corsHeaders })
    }

    console.log(`✅ AssemblyAI accepted job. ID: ${submitData.id}`)

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { error: dbError } = await supabaseAdmin
      .from('voice_notes')
      .update({ assemblyai_id: submitData.id })
      .eq('id', voice_note_id)

    if (dbError) {
      console.error('❌ Database Save Error:', dbError.message)
      return new Response(JSON.stringify({ error: 'DB Error: ' + dbError.message }), { status: 500, headers: corsHeaders })
    } else {
      console.log('💾 Successfully saved assemblyai_id to database!')
    }

    return new Response(JSON.stringify({ success: true, queued: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('❌ Fatal Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})