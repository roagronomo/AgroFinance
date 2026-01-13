import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Iniciando verificação de contas a pagar...');

    // Buscar todas as contas ativas e não pagas
    const contas = await base44.asServiceRole.entities.ContaPagar.filter({ 
      ativo: true,
      pago: false 
    }, 'data_vencimento');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const conta of contas) {
      try {
        const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00');
        dataVencimento.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataVencimento - hoje) / (1000 * 60 * 60 * 24));

        // Verificar se deve enviar o lembrete antecipado
        const deveEnviarAntecipado = 
          diasRestantes === conta.dias_antes_avisar && 
          !conta.lembrete_antecipado_enviado;

        // Verificar se deve enviar o lembrete no dia
        const deveEnviarNoDia = 
          diasRestantes === 0 && 
          !conta.lembrete_enviado;

        if (!deveEnviarAntecipado && !deveEnviarNoDia) {
          continue;
        }

        const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');
        const valorFormatado = conta.valor.toLocaleString('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        });

        let mensagem;
        if (deveEnviarNoDia) {
          mensagem = `💰 *CONTA A PAGAR - VENCE HOJE!*

📋 *${conta.descricao}*
${conta.fornecedor ? `🏢 *Fornecedor:* ${conta.fornecedor}\n` : ''}
📅 *Vencimento:* ${dataFormatada} (HOJE)
💵 *Valor:* ${valorFormatado}
${conta.categoria ? `📂 *Categoria:* ${conta.categoria}\n` : ''}
${conta.observacoes ? `📝 ${conta.observacoes}\n` : ''}
${conta.codigo_barras ? `\n🔢 *Código de Barras:*\n\`${conta.codigo_barras}\`\n` : ''}
⚠️ *ATENÇÃO: Esta conta vence HOJE!*

_Lembrete automático - AgroFinance_`;
        } else {
          mensagem = `💰 *LEMBRETE - CONTA A PAGAR*

📋 *${conta.descricao}*
${conta.fornecedor ? `🏢 *Fornecedor:* ${conta.fornecedor}\n` : ''}
📅 *Vencimento:* ${dataFormatada}
⏰ *Faltam ${conta.dias_antes_avisar} dia(s)*
💵 *Valor:* ${valorFormatado}
${conta.categoria ? `📂 *Categoria:* ${conta.categoria}\n` : ''}
${conta.observacoes ? `📝 ${conta.observacoes}\n` : ''}
${conta.codigo_barras ? `\n🔢 *Código de Barras:*\n\`${conta.codigo_barras}\`\n` : ''}
_Lembrete automático - AgroFinance_`;
        }

        // Enviar WhatsApp
        const response = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
          numero: conta.telefone_contato,
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

          await base44.asServiceRole.entities.ContaPagar.update(conta.id, updateData);
          lembretesEnviados++;
          console.log(`Lembrete enviado: ${conta.descricao}`);
        } else {
          erros.push({
            conta: conta.descricao,
            erro: response.error || 'Erro desconhecido'
          });
          console.error(`Erro ao enviar lembrete ${conta.descricao}:`, response.error);
        }

      } catch (error) {
        erros.push({
          conta: conta.descricao,
          erro: error.message
        });
        console.error(`Erro ao processar conta ${conta.descricao}:`, error);
      }
    }

    console.log(`Verificação concluída. ${lembretesEnviados} lembrete(s) enviado(s).`);

    return Response.json({
      success: true,
      lembretesEnviados,
      erros: erros.length > 0 ? erros : null
    });

  } catch (error) {
    console.error('Erro ao verificar contas a pagar:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});