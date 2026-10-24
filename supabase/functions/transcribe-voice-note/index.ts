import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
console.log('Function started!'); // <-- ADD THIS LINE

  try {
    const { voice_note_id, audio_url, word_boost } = await req.json()
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    // The URL AssemblyAI will call when done.
    const webhookUrl = `${supabaseUrl}/functions/v1/assemblyai-webhook`

    const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { 'authorization': apiKey ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ 
        audio_url,
        word_boost: word_boost || [],
        boost_param: "high",
        language_code: "en",
        webhook_url: webhookUrl,
        webhook_auth_header_name: "x-supabase-signature" // Optional but good practice for security later
      }),
    })
    
    const submitData = await submitRes.json()
    
    if (!submitData.id) {
      return new Response(JSON.stringify({ error: 'Could not start transcription: ' + (submitData.error || 'unknown') }), { status: 400, headers: corsHeaders })
    }

    // Return immediately! No waiting.
    return new Response(JSON.stringify({ success: true, message: 'Transcription started' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})