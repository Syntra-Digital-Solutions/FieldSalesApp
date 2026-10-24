import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is missing')
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret' }), { status: 500, headers: corsHeaders })
    }

    console.log('Fetching data from Supabase...')
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    
    const { data: sales, error: salesError } = await supabaseAdmin.from('sales').select('*').order('created_at', { ascending: false }).limit(50)
    if (salesError) console.error('Sales fetch error:', salesError.message)
    
    const { data: agents, error: agentsError } = await supabaseAdmin.from('profiles').select('full_name, status').eq('role', 'agent')
    if (agentsError) console.error('Agents fetch error:', agentsError.message)

    console.log(`Got ${sales?.length || 0} sales and ${agents?.length || 0} agents`)

    const context = `
      You are a helpful Field Sales Manager Assistant. Answer the manager's question accurately based on this data.
      Here are the agents: ${JSON.stringify(agents)}
      Here are the recent sales: ${JSON.stringify(sales)}
      Manager asks: "${prompt}"
    `

    console.log('Calling Gemini API...')
const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: context }] }]
      }),
    })
    
    console.log('Gemini response status:', aiRes.status)
    
    const aiData = await aiRes.json()
    
    if (!aiRes.ok) {
      console.error('❌ Gemini API Error:', JSON.stringify(aiData))
      return new Response(JSON.stringify({ error: 'Gemini Error: ' + (aiData.error?.message || 'Unknown') }), { status: 500, headers: corsHeaders })
    }

    const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response."
    console.log('✅ Gemini reply received')

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})