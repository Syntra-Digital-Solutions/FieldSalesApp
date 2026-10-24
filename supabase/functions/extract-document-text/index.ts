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
    const { document_id, image_url } = await req.json()
    const apiKey = Deno.env.get('OCR_SPACE_API_KEY')

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': apiKey ?? '' },
      body: new URLSearchParams({ url: image_url, isOverlayRequired: 'false', OCREngine: '2' }),
    })
    const ocrData = await ocrResponse.json()

    if (ocrData.IsErroredOnProcessing) {
      return new Response(JSON.stringify({ error: 'OCR failed: ' + (ocrData.ErrorMessage?.[0] || 'unknown') }), { status: 400, headers: corsHeaders })
    }

    const extractedText = ocrData.ParsedResults?.[0]?.ParsedText?.trim() || '(No readable text found)'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError, data: updateData } = await supabaseAdmin
      .from('document_captures')
      .update({ extracted_text: extractedText })
      .eq('id', document_id)
      .select()

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Database update failed: ' + updateError.message }), { status: 400, headers: corsHeaders })
    }
    if (!updateData || updateData.length === 0) {
      return new Response(JSON.stringify({ error: 'No document found with that ID — nothing was updated.' }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, text: extractedText }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
