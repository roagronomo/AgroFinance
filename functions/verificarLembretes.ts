import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Iniciando verificação de lembretes...');

    // Buscar todos os lembretes ativos
    const lembretes = await base44.asServiceRole.entities.Lembrete.filter({ ativo: true }, 'data_evento');

    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const lembrete of lembretes) {
      try {
        const dataEvento = new Date(lembrete.data_evento + 'T00:00:00');
        dataEvento.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataEvento - hoje) / (1000 * 60 * 60 * 24));

        // Verificar se deve enviar o lembrete antecipado (sempre às 11h da manhã)
        let deveEnviarAntecipado = false;
        if (diasRestantes === lembrete.dias_antes_avisar && !lembrete.lembrete_antecipado_enviado) {
          const horaAtual = agora.getHours();
          // Enviar apenas se já passou das 11h (para evitar múltiplos envios no mesmo dia)
          if (horaAtual >= 11) {
            deveEnviarAntecipado = true;
          }
        }

        // Verificar se deve enviar o lembrete no dia
        const deveEnviarNoDia = 
          diasRestantes === 0 && 
          !lembrete.lembrete_enviado;

        // Verificar se deve enviar 10 minutos antes (FIXO)
        let deveEnviar10MinAntes = false;
        if (lembrete.hora_evento && diasRestantes === 0 && !lembrete.lembrete_10min_enviado) {
          const [horas, minutos] = lembrete.hora_evento.split(':').map(Number);
          const horarioEvento = new Date(dataEvento);
          horarioEvento.setHours(horas, minutos, 0, 0);
          
          const horario10MinAntes = new Date(horarioEvento.getTime() - 10 * 60 * 1000);
          const tolerancia = 120 * 60 * 1000; // 2 horas de tolerância após o horário planejado
          
          // Enviar se passou do horário mas ainda está dentro da tolerância
          if (agora >= horario10MinAntes && (agora - horario10MinAntes) < tolerancia) {
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
          const tolerancia = 120 * 60 * 1000; // 2 horas de tolerância após o horário planejado
          
          // Enviar se passou do horário mas ainda está dentro da tolerância
          if (agora >= horarioExtra && (agora - horarioExtra) < tolerancia) {
            deveEnviarExtra = true;
          }
        }

        if (!deveEnviarAntecipado && !deveEnviarNoDia && !deveEnviar10MinAntes && !deveEnviarExtra) {
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
        } else if (deveEnviarNoDia) {
          mensagem = `🔔 *LEMBRETE - HOJE!*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada} (HOJE)
${lembrete.hora_evento ? `⏰ *Horário:* ${lembrete.hora_evento}\n` : ''}${valorTexto}
${lembrete.link_acesso ? `🔗 *Link de Acesso:*\n${lembrete.link_acesso}\n\n` : ''}${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
⚠️ O evento que você agendou é HOJE!

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
        } else {
          erros.push({
            lembrete: lembrete.descricao,
            erro: response.error || 'Erro desconhecido'
          });
          console.error(`Erro ao enviar lembrete ${lembrete.descricao}:`, response.error);
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