import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Envia mensagem via WhatsApp usando Evolution API
 * 
 * Payload esperado:
 * {
 *   numero: "5562999999999", // Número com DDI e DDD, sem símbolos
 *   mensagem: "Texto da mensagem"
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = await req.json();
    const { numero, mensagem } = payload;

    if (!numero || !mensagem) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: numero, mensagem' 
      }, { status: 400 });
    }

    // Obter credenciais da Evolution API
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      return Response.json({ 
        error: 'Credenciais da Evolution API não configuradas (URL, API_KEY, INSTANCE_NAME)' 
      }, { status: 500 });
    }

    // Formatar número para WhatsApp (remover caracteres especiais)
    const numeroLimpo = numero.replace(/\D/g, '');
    
    // Garantir que tem DDI (adicionar 55 se não tiver)
    const numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;

    console.log(`📱 Enviando WhatsApp para: ${numeroFormatado}`);
    console.log(`📍 Endpoint: ${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`);

    // Enviar mensagem via Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: numeroFormatado,
        text: mensagem
      })
    });

    const resultado = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar WhatsApp:', resultado);
      return Response.json({ 
        success: false, 
        error: resultado.message || 'Erro ao enviar mensagem',
        detalhes: resultado
      }, { status: response.status });
    }

    console.log('✅ WhatsApp enviado com sucesso');

    return Response.json({ 
      success: true,
      numero: numeroFormatado,
      message_id: resultado.key?.id || resultado.messageId
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});