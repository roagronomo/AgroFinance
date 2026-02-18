import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Iniciando verificação de lembretes...');

    // Buscar todos os lembretes ativos
    const lembretes = await base44.asServiceRole.entities.Lembrete.filter({ ativo: true }, 'data_evento');

    // Horário de Brasília (UTC-3)
    const agora = new Date();
    const offsetBrasilia = -3 * 60; // UTC-3 em minutos
    const offsetAtual = agora.getTimezoneOffset(); // offset do servidor em minutos
    const diferencaMinutos = offsetBrasilia - offsetAtual;
    const agoraBrasilia = new Date(agora.getTime() + diferencaMinutos * 60 * 1000);
    
    const hoje = new Date(agoraBrasilia);
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const lembrete of lembretes) {
      try {
        const dataEvento = new Date(lembrete.data_evento + 'T00:00:00');
        dataEvento.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataEvento - hoje) / (1000 * 60 * 60 * 24));

        // Verificar se deve enviar o lembrete antecipado (somente entre 11h00 e 11h06)
        let deveEnviarAntecipado = false;
        if (diasRestantes === lembrete.dias_antes_avisar && !lembrete.lembrete_antecipado_enviado) {
          const horaAtual = agoraBrasilia.getHours();
          const minutoAtual = agoraBrasilia.getMinutes();
          // Enviar apenas entre 11h00 e 11h06 (janela de 6 minutos para capturar)
          if (horaAtual === 11 && minutoAtual <= 6) {
            deveEnviarAntecipado = true;
          }
        }



        // Verificar se deve enviar 10 minutos antes (FIXO)
        let deveEnviar10MinAntes = false;
        if (lembrete.hora_evento && diasRestantes === 0 && !lembrete.lembrete_10min_enviado) {
          const [horas, minutos] = lembrete.hora_evento.split(':').map(Number);
          const horarioEvento = new Date(dataEvento);
          horarioEvento.setHours(horas, minutos, 0, 0);
          
          const horario10MinAntes = new Date(horarioEvento.getTime() - 10 * 60 * 1000);
          const janelaEnvio = 6 * 60 * 1000; // Janela de 6 minutos para capturar o envio (considera que roda a cada 5min)
          
          // Enviar apenas se estiver dentro da janela de 6 minutos após o horário planejado
          if (agoraBrasilia >= horario10MinAntes && (agoraBrasilia - horario10MinAntes) <= janelaEnvio) {
            deveEnviar10MinAntes = true;
          }
        }

        // Verificar se deve enviar aviso extra (30min ou 1h antes)
        let deveEnviarExtra = false;
        if (lembrete.hora_evento && lembrete.aviso_extra_minutos && diasRestantes === 0 && !lembrete.lembrete_extra_enviado) {
          const [horas, minutos] = lembrete.hora_evento.split(':').map(Number);
          const horarioEvento = new Date(dataEvento);
          horarioEvento.setHours(horas, minutos, 0, 0);
          
          const horarioExtra = new Date(horarioEvento.getTime() - lembrete.aviso_extra_minutos * 60 * 1000);
          const janelaEnvio = 6 * 60 * 1000; // Janela de 6 minutos para capturar o envio (considera que roda a cada 5min)
          
          // Enviar apenas se estiver dentro da janela de 6 minutos após o horário planejado
          if (agoraBrasilia >= horarioExtra && (agoraBrasilia - horarioExtra) <= janelaEnvio) {
            deveEnviarExtra = true;
          }
        }

        if (!deveEnviarAntecipado && !deveEnviar10MinAntes && !deveEnviarExtra) {
          continue;
        }

        const dataFormatada = dataEvento.toLocaleDateString('pt-BR');
        const valorTexto = lembrete.valor 
          ? `💰 *Valor:* R$ ${lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` 
          : '';

        let mensagem;
        if (deveEnviar10MinAntes) {
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

        // Enviar WhatsApp - SEMPRE enviar para telefone individual primeiro
        // Se também tiver grupo configurado, enviar para o grupo depois
        
        let enviouComSucesso = false;
        
        // 1. Enviar para telefone individual (obrigatório)
        if (lembrete.telefone_contato) {
          const responseTelefone = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
            numero: lembrete.telefone_contato,
            mensagem: mensagem
          });

          if (!responseTelefone.success) {
            erros.push({
              lembrete: lembrete.descricao,
              erro: `Telefone: ${responseTelefone.error || 'Erro desconhecido'}`
            });
            console.error(`Erro ao enviar para telefone ${lembrete.descricao}:`, responseTelefone.error);
          } else {
            console.log(`Lembrete enviado para telefone: ${lembrete.descricao}`);
            lembretesEnviados++;
            enviouComSucesso = true;
          }

          // Aguardar 1 segundo antes de enviar para o grupo
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 2. Enviar para grupo (se configurado)
        if (lembrete.grupo_whatsapp_id && lembrete.grupo_whatsapp_id.trim() !== '') {
          const responseGrupo = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
            numero: lembrete.grupo_whatsapp_id,
            mensagem: mensagem
          });

          if (!responseGrupo.success) {
            erros.push({
              lembrete: lembrete.descricao,
              erro: `Grupo: ${responseGrupo.error || 'Erro desconhecido'}`
            });
            console.error(`Erro ao enviar para grupo ${lembrete.descricao}:`, responseGrupo.error);
          } else {
            console.log(`Lembrete enviado para grupo: ${lembrete.descricao}`);
            enviouComSucesso = true;
          }
        }

        // Marcar como enviado se PELO MENOS um destino teve sucesso
        if (enviouComSucesso) {
          // Atualizar o status do lembrete
          const updateData = {};
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