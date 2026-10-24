import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // Only proceed if transcription is completed
    if (payload.status === 'completed' && payload.text) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '', 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Find the voice note by the AssemblyAI transcript ID (you'll need to store this ID in your DB to link it, 
      // but for now we'll assume the audio_url is the unique identifier)
      // We need to pass the voice_note_id in the webhook URL to be safe.
      
      // Wait, actually, let's use the audio_url to find the note.
      const audioUrl = payload.audio_url;
      
      // Find the note with this audio URL
      const { data: note } = await supabaseAdmin
        .from('voice_notes')
        .select('id')
        .eq('audio_url', audioUrl)
        .single();

      if (note) {
        await supabaseAdmin
          .from('voice_notes')
          .update({ transcript: payload.text })
          .eq('id', note.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})