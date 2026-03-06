import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function enviarWhatsApp(numero, mensagem, imagem_url) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

  const isGrupo = numero.includes('@g.us');
  let numeroFormatado;
  if (isGrupo) {
    numeroFormatado = numero;
  } else {
    const numeroLimpo = numero.replace(/\D/g, '');
    numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;
  }

  if (imagem_url) {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numeroFormatado, mediatype: 'image', media: imagem_url, caption: mensagem || '' })
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(`Evolution API error: ${JSON.stringify(resultado)}`);
    return resultado;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: numeroFormatado, text: mensagem })
  });
  const resultado = await response.json();
  if (!response.ok) throw new Error(`Evolution API error: ${JSON.stringify(resultado)}`);
  return resultado;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Iniciando verificação de lembretes...');

    // Buscar todos os lembretes ativos
    const lembretes = await base44.asServiceRole.entities.Lembrete.filter({ ativo: true }, 'data_evento');

    // Horário de Brasília (UTC-3)
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    console.log(`[DIAGNÓSTICO] UTC: ${agora.toISOString()} | BRT: ${String(agoraBrasilia.getHours()).padStart(2,'0')}:${String(agoraBrasilia.getMinutes()).padStart(2,'0')}`);

    const hoje = new Date(agoraBrasilia);
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const lembrete of lembretes) {
      try {
        const dataEvento = new Date(lembrete.data_evento + 'T00:00:00');
        dataEvento.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataEvento - hoje) / (1000 * 60 * 60 * 24));

        // === LEMBRETE NO DIA DO VENCIMENTO ===
        const deveEnviarNoDia = diasRestantes === 0 && !lembrete.lembrete_enviado;

        // === LEMBRETE ANTECIPADO (X dias antes) ===
        const deveEnviarAntecipado = diasRestantes > 0 && diasRestantes === lembrete.dias_antes_avisar && !lembrete.lembrete_antecipado_enviado;

        // === LEMBRETE 10 MINUTOS ANTES ===
        let deveEnviar10MinAntes = false;
        if (lembrete.hora_evento && diasRestantes === 0 && !lembrete.lembrete_10min_enviado) {
          const [horas, minutos] = lembrete.hora_evento.split(':').map(Number);
          const horarioEvento = new Date(dataEvento);
          horarioEvento.setHours(horas, minutos, 0, 0);
          
          const horario10MinAntes = new Date(horarioEvento.getTime() - 10 * 60 * 1000);
          const janelaEnvio = 6 * 60 * 1000;
          
          if (agoraBrasilia >= horario10MinAntes && (agoraBrasilia - horario10MinAntes) <= janelaEnvio) {
            deveEnviar10MinAntes = true;
          }
        }

        // === AVISO EXTRA (30min ou 1h antes) ===
        let deveEnviarExtra = false;
        if (lembrete.hora_evento && lembrete.aviso_extra_minutos && diasRestantes === 0 && !lembrete.lembrete_extra_enviado) {
          const [horas, minutos] = lembrete.hora_evento.split(':').map(Number);
          const horarioEvento = new Date(dataEvento);
          horarioEvento.setHours(horas, minutos, 0, 0);
          
          const horarioExtra = new Date(horarioEvento.getTime() - lembrete.aviso_extra_minutos * 60 * 1000);
          const janelaEnvio = 6 * 60 * 1000;
          
          if (agoraBrasilia >= horarioExtra && (agoraBrasilia - horarioExtra) <= janelaEnvio) {
            deveEnviarExtra = true;
          }
        }

        if (!deveEnviarNoDia && !deveEnviarAntecipado && !deveEnviar10MinAntes && !deveEnviarExtra) {
          continue;
        }

        const dataFormatada = dataEvento.toLocaleDateString('pt-BR');
        const valorTexto = lembrete.valor 
          ? `💰 *Valor:* R$ ${lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` 
          : '';

        let mensagem;
        if (deveEnviarNoDia) {
          mensagem = `🔔 *LEMBRETE - VENCE HOJE!*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada}
${lembrete.hora_evento ? `⏰ *Horário:* ${lembrete.hora_evento}\n` : ''}${valorTexto}
${lembrete.link_acesso ? `🔗 *Link:* ${lembrete.link_acesso}\n` : ''}${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
⚠️ *Este lembrete vence HOJE!*

_Lembrete automático - AgroFinance_`;
        } else if (deveEnviar10MinAntes) {
          mensagem = `🔔 *LEMBRETE - EVENTO COMEÇANDO EM 10 MINUTOS!*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada}
⏰ *Horário:* ${lembrete.hora_evento}
${valorTexto}
${lembrete.link_acesso ? `🔗 *Link de Acesso:*\n${lembrete.link_acesso}\n\n` : ''}${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
⚠️ O evento começa em 10 minutos!

_Lembrete automático - AgroFinance_`;
        } else if (deveEnviarExtra) {
          const textoTempo = lembrete.aviso_extra_minutos >= 60 ? '1 HORA' : `${lembrete.aviso_extra_minutos} MINUTOS`;
          mensagem = `🔔 *LEMBRETE - EVENTO COMEÇANDO EM ${textoTempo}!*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada}
⏰ *Horário:* ${lembrete.hora_evento}
${valorTexto}
${lembrete.link_acesso ? `🔗 *Link de Acesso:*\n${lembrete.link_acesso}\n\n` : ''}${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
⚠️ O evento começa em ${textoTempo.toLowerCase()}!

_Lembrete automático - AgroFinance_`;
        } else {
          mensagem = `🔔 *LEMBRETE - ${lembrete.dias_antes_avisar} DIAS*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada}
${lembrete.hora_evento ? `⏰ *Horário:* ${lembrete.hora_evento}\n` : ''}⏰ Faltam ${lembrete.dias_antes_avisar} dia(s)
${valorTexto}
${lembrete.link_acesso ? `🔗 *Link de Acesso:*\n${lembrete.link_acesso}\n\n` : ''}${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
_Lembrete automático - AgroFinance_`;
        }

        let enviouComSucesso = false;
        
        // 1. Enviar para telefone individual
        if (lembrete.telefone_contato) {
          try {
            await enviarWhatsApp(lembrete.telefone_contato, mensagem);
            console.log(`Lembrete enviado para telefone: ${lembrete.descricao} (tipo: ${deveEnviarNoDia ? 'DIA' : deveEnviar10MinAntes ? '10MIN' : deveEnviarExtra ? 'EXTRA' : 'ANTECIPADO'})`);
            lembretesEnviados++;
            enviouComSucesso = true;
          } catch (sendError) {
            erros.push({ lembrete: lembrete.descricao, erro: `Telefone: ${sendError.message}` });
            console.error(`Erro ao enviar para telefone ${lembrete.descricao}:`, sendError.message);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 2. Enviar para grupo (se configurado)
        if (lembrete.grupo_whatsapp_id && lembrete.grupo_whatsapp_id.trim() !== '') {
          try {
            await enviarWhatsApp(lembrete.grupo_whatsapp_id, mensagem);
            console.log(`Lembrete enviado para grupo: ${lembrete.descricao}`);
            enviouComSucesso = true;
          } catch (sendError) {
            erros.push({ lembrete: lembrete.descricao, erro: `Grupo: ${sendError.message}` });
            console.error(`Erro ao enviar para grupo ${lembrete.descricao}:`, sendError.message);
          }
        }

        // Marcar flags de envio
        if (enviouComSucesso) {
          const updateData = {};
          if (deveEnviarNoDia) {
            updateData.lembrete_enviado = true;
          }
          if (deveEnviarAntecipado) {
            updateData.lembrete_antecipado_enviado = true;
          }
          if (deveEnviar10MinAntes) {
            updateData.lembrete_10min_enviado = true;
          }
          if (deveEnviarExtra) {
            updateData.lembrete_extra_enviado = true;
          }

          await base44.asServiceRole.entities.Lembrete.update(lembrete.id, updateData);
          console.log(`Flags atualizadas para ${lembrete.descricao}:`, updateData);
        }

      } catch (error) {
        erros.push({
          lembrete: lembrete.descricao,
          erro: error.message
        });
        console.error(`Erro ao processar lembrete ${lembrete.descricao}:`, error);
      }
    }

    console.log(`Verificação concluída. ${lembretesEnviados} lembrete(s) enviado(s).`);

    return Response.json({
      success: true,
      lembretesEnviados,
      erros: erros.length > 0 ? erros : null
    });

  } catch (error) {
    console.error('Erro ao verificar lembretes:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});