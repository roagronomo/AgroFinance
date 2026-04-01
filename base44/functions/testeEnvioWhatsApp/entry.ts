import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const GRUPO_ID = "120363424659062662@g.us";
    const NUMERO_TESTE = "556498147208"; // (64) 98147-2081

    const agora = new Date();
    const horaBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaStr = horaBrasilia.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const mensagem = `✅ *TESTE - AgroFinance*\n\nEnvio de WhatsApp funcionando corretamente!\n\n🕐 Horário: ${horaStr}\n🔧 Instância: ${EVOLUTION_INSTANCE_NAME}\n\n_Mensagem de teste enviada pelo sistema._`;

    console.log(`[TESTE] URL: ${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`);
    console.log(`[TESTE] Grupo: ${GRUPO_ID}`);
    console.log(`[TESTE] API Key presente: ${!!EVOLUTION_API_KEY}`);

    const bodyEnvio = { number: NUMERO_TESTE, text: mensagem };
    console.log(`[TESTE] Body:`, JSON.stringify(bodyEnvio));

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify(bodyEnvio)
    });

    const rawText = await response.text();
    let resultado;
    try { resultado = JSON.parse(rawText); } catch { resultado = rawText; }

    if (!response.ok) {
      return Response.json({ success: false, error: resultado, rawText, status: response.status, instancia: EVOLUTION_INSTANCE_NAME, grupo: GRUPO_ID });
    }

    return Response.json({ 
      success: true, 
      mensagem: 'Mensagem enviada para o grupo!',
      grupo: GRUPO_ID,
      instancia: EVOLUTION_INSTANCE_NAME,
      resultado 
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});