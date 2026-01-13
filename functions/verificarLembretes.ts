import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Iniciando verificação de lembretes...');

    // Buscar todos os lembretes ativos
    const lembretes = await base44.asServiceRole.entities.Lembrete.filter({ ativo: true }, 'data_evento');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const lembrete of lembretes) {
      try {
        const dataEvento = new Date(lembrete.data_evento + 'T00:00:00');
        dataEvento.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataEvento - hoje) / (1000 * 60 * 60 * 24));

        // Verificar se deve enviar o lembrete antecipado
        const deveEnviarAntecipado = 
          diasRestantes === lembrete.dias_antes_avisar && 
          !lembrete.lembrete_antecipado_enviado;

        // Verificar se deve enviar o lembrete no dia
        const deveEnviarNoDia = 
          diasRestantes === 0 && 
          !lembrete.lembrete_enviado;

        if (!deveEnviarAntecipado && !deveEnviarNoDia) {
          continue;
        }

        const dataFormatada = dataEvento.toLocaleDateString('pt-BR');
        const valorTexto = lembrete.valor 
          ? `💰 *Valor:* R$ ${lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` 
          : '';

        let mensagem;
        if (deveEnviarNoDia) {
          mensagem = `🔔 *LEMBRETE - HOJE!*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada} (HOJE)
${valorTexto}
${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
⚠️ O evento que você agendou é HOJE!

_Lembrete automático - AgroFinance_`;
        } else {
          mensagem = `🔔 *LEMBRETE - ${lembrete.dias_antes_avisar} DIAS*

📋 *${lembrete.descricao}*

📅 *Data:* ${dataFormatada}
⏰ Faltam ${lembrete.dias_antes_avisar} dia(s)
${valorTexto}
${lembrete.observacoes ? `📝 ${lembrete.observacoes}\n` : ''}
_Lembrete automático - AgroFinance_`;
        }

        // Enviar WhatsApp
        const response = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
          numero: lembrete.telefone_contato,
          mensagem: mensagem
        });

        if (response.success) {
          // Atualizar o status do lembrete
          const updateData = {};
          if (deveEnviarNoDia) {
            updateData.lembrete_enviado = true;
          }
          if (deveEnviarAntecipado) {
            updateData.lembrete_antecipado_enviado = true;
          }

          await base44.asServiceRole.entities.Lembrete.update(lembrete.id, updateData);
          lembretesEnviados++;
          console.log(`Lembrete enviado: ${lembrete.descricao}`);
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