import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Envia mensagem via WhatsApp usando Evolution API
 * 
 * Payload esperado:
 * {
 *   numero: "5562999999999" ou "556481472080-1616761032@g.us", // Número individual ou ID de grupo
 *   mensagem: "Texto da mensagem",
 *   imagem_url: "https://..." // Opcional: URL da imagem para enviar
 * }
 * 
 * Suporta:
 * - Números individuais: 5562999999999 (com DDI/DDD)
 * - Grupos WhatsApp: 556481472080-1616761032@g.us
 * - Envio de texto e/ou imagem
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
    const { numero, mensagem, imagem_url } = payload;

    if (!numero) {
      return Response.json({ 
        error: 'Parâmetro obrigatório: numero' 
      }, { status: 400 });
    }

    if (!mensagem && !imagem_url) {
      return Response.json({ 
        error: 'É necessário fornecer mensagem ou imagem_url' 
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

    // Detectar se é grupo (contém @g.us) ou número individual
    const isGrupo = numero.includes('@g.us');
    
    let numeroFormatado;
    if (isGrupo) {
      // Para grupos, usar o ID completo sem modificações
      numeroFormatado = numero;
      console.log(`👥 Enviando WhatsApp para GRUPO: ${numeroFormatado}`);
    } else {
      // Para números individuais, formatar normalmente
      const numeroLimpo = numero.replace(/\D/g, '');
      numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;
      console.log(`📱 Enviando WhatsApp para número: ${numeroFormatado}`);
    }
    
    // Se tiver imagem, enviar imagem (com ou sem legenda)
    if (imagem_url) {
      console.log(`📍 Endpoint: ${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`);
      console.log(`🖼️ Enviando imagem: ${imagem_url}`);

      const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: numeroFormatado,
          mediatype: 'image',
          media: imagem_url,
          caption: mensagem || '' // Legenda opcional (pode ser vazio)
        })
      });

      const resultado = await response.json();

      if (!response.ok) {
        console.error('❌ Erro ao enviar imagem:', resultado);
        return Response.json({ 
          success: false, 
          error: resultado.message || 'Erro ao enviar imagem',
          detalhes: resultado
        }, { status: response.status });
      }

      console.log('✅ Imagem enviada com sucesso');

      return Response.json({ 
        success: true,
        numero: numeroFormatado,
        message_id: resultado.key?.id || resultado.messageId,
        tipo: 'imagem'
      });
    }

    // Caso contrário, enviar apenas texto
    console.log(`📍 Endpoint: ${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`);

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
      message_id: resultado.key?.id || resultado.messageId,
      tipo: 'texto'
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});