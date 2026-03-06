import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Horário de Brasília (UTC-3) - CORRIGIDO
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaBrasilia = agoraBrasilia.getHours();
    const minutoBrasilia = agoraBrasilia.getMinutes();
    
    console.log(`[DIAGNÓSTICO] Horário UTC: ${agora.toISOString()}`);
    console.log(`[DIAGNÓSTICO] Horário Brasília: ${String(horaBrasilia).padStart(2,'0')}:${String(minutoBrasilia).padStart(2,'0')}`);

    // GUARD: Só enviar mensagens nos horários corretos (horário de Brasília)
    // 06:00-06:59 BRT = Notificação de dia do vencimento
    // 16:00-16:59 BRT = Aviso antecipado
    if (horaBrasilia !== 6 && horaBrasilia !== 16) {
      console.log(`[GUARD] Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}. Envio às 6h e 16h BRT.`);
      return Response.json({
        success: true,
        message: `Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}. Envio às 6h e 16h BRT.`,
        lembretesEnviados: 0
      });
    }

    console.log('Iniciando verificação de contas a pagar...');

    // Buscar todas as contas ativas e não pagas
    const contas = await base44.asServiceRole.entities.ContaPagar.filter({ 
      ativo: true,
      pago: false 
    }, 'data_vencimento');

    const hoje = new Date(agoraBrasilia);
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];
    const resumoPorDestino = {}; // Acumular contas por destino (telefone ou grupo)

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

        // Determinar o destino (grupo ou telefone individual)
        const destino = conta.grupo_whatsapp_id || conta.telefone_contato;
        
        // Criar chave única para evitar duplicação: destino + ID da conta
        const chaveUnica = `${destino}_${conta.id}`;
        
        // Verificar se já enviamos para esta conta (evitar duplicação)
        if (resumoPorDestino[chaveUnica]) {
          console.log(`Lembrete já enviado para ${conta.descricao} - pulando duplicação`);
          continue;
        }

        const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');
        const valorFormatado = conta.valor.toLocaleString('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        });

        // Acumular informações da conta para envio agrupado
        if (!resumoPorDestino[chaveUnica]) {
          resumoPorDestino[chaveUnica] = {
            destino,
            conta,
            deveEnviarNoDia,
            deveEnviarAntecipado,
            dataFormatada,
            valorFormatado
          };
        }

      } catch (error) {
        erros.push({
          conta: conta.descricao,
          erro: error.message
        });
        console.error(`Erro ao processar conta ${conta.descricao}:`, error);
      }
    }

    // Agora enviar todas as mensagens acumuladas
    for (const [chaveUnica, info] of Object.entries(resumoPorDestino)) {
      try {
        const { conta, destino, deveEnviarNoDia, deveEnviarAntecipado, dataFormatada, valorFormatado } = info;
        
        let mensagem;
        const recorrenteInfo = conta.recorrente ? `💳 *Parcela ${conta.parcela_atual}/${conta.parcelas_total}*\n` : '';
        
        if (deveEnviarNoDia) {
          mensagem = `💰 *CONTA A PAGAR - VENCE HOJE!*

📋 *${conta.descricao}*
${recorrenteInfo}${conta.fornecedor ? `🏢 *Fornecedor:* ${conta.fornecedor}\n` : ''}
📅 *Vencimento:* ${dataFormatada} (HOJE)
💵 *Valor:* ${valorFormatado}
${conta.categoria ? `📂 *Categoria:* ${conta.categoria}\n` : ''}
${conta.observacoes ? `📝 ${conta.observacoes}\n` : ''}
${conta.codigo_barras && !conta.recorrente ? `\n🔢 *Código de Barras:*\n\`${conta.codigo_barras}\`\n` : ''}${conta.chave_pix ? `\n💳 *PIX para pagamento:*\n${conta.chave_pix}\n` : ''}
⚠️ *ATENÇÃO: Esta conta vence HOJE!*

_Lembrete automático - AgroFinance_`;
        } else {
          mensagem = `💰 *LEMBRETE - CONTA A PAGAR*

📋 *${conta.descricao}*
${recorrenteInfo}${conta.fornecedor ? `🏢 *Fornecedor:* ${conta.fornecedor}\n` : ''}
📅 *Vencimento:* ${dataFormatada}
⏰ *Faltam ${conta.dias_antes_avisar} dia(s)*
💵 *Valor:* ${valorFormatado}
${conta.categoria ? `📂 *Categoria:* ${conta.categoria}\n` : ''}
${conta.observacoes ? `📝 ${conta.observacoes}\n` : ''}
${conta.codigo_barras && !conta.recorrente ? `\n🔢 *Código de Barras:*\n\`${conta.codigo_barras}\`\n` : ''}${conta.chave_pix ? `\n💳 *PIX para pagamento:*\n${conta.chave_pix}\n` : ''}
_Lembrete automático - AgroFinance_`;
        }

        const response = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
          numero: destino,
          mensagem: mensagem
        });

        // A resposta pode vir direto ou em response.data
        const resultado = response?.data || response;

        if (resultado?.success) {
          // Atualizar o status do lembrete
          const updateData = {};
          if (deveEnviarNoDia) {
            updateData.lembrete_enviado = true;
            
            // Se for conta recorrente e foi enviado no dia, criar a próxima parcela
            if (conta.recorrente && conta.parcela_atual < conta.parcelas_total) {
              const proximaData = new Date(conta.data_vencimento + 'T00:00:00');
              proximaData.setMonth(proximaData.getMonth() + 1);
              
              const proximaConta = {
                descricao: conta.descricao,
                valor: conta.valor,
                data_vencimento: proximaData.toISOString().split('T')[0],
                dias_antes_avisar: conta.dias_antes_avisar,
                telefone_contato: conta.telefone_contato,
                grupo_whatsapp_id: conta.grupo_whatsapp_id,
                chave_pix: conta.chave_pix,
                fornecedor: conta.fornecedor,
                categoria: conta.categoria,
                observacoes: conta.observacoes,
                ativo: conta.ativo,
                recorrente: true,
                parcelas_total: conta.parcelas_total,
                parcela_atual: conta.parcela_atual + 1,
                data_vencimento_final: conta.data_vencimento_final,
                grupo_recorrencia_id: conta.grupo_recorrencia_id,
                pago: false,
                lembrete_enviado: false,
                lembrete_antecipado_enviado: false,
                codigo_barras: null,
                boleto_anexo: null,
                recibo_anexo: null
              };
              
              await base44.asServiceRole.entities.ContaPagar.create(proximaConta);
              console.log(`Próxima parcela criada: ${conta.parcela_atual + 1}/${conta.parcelas_total}`);
            }
          }
          if (deveEnviarAntecipado) {
            updateData.lembrete_antecipado_enviado = true;
          }

          await base44.asServiceRole.entities.ContaPagar.update(conta.id, updateData);
          lembretesEnviados++;
          console.log(`Lembrete enviado: ${conta.descricao} (tipo: ${deveEnviarNoDia ? 'DIA' : 'ANTECIPADO'})`);
        } else {
          erros.push({
            conta: conta.descricao,
            erro: resultado?.error || 'Erro desconhecido'
          });
          console.error(`Erro ao enviar lembrete ${conta.descricao}:`, resultado?.error);
        }

      } catch (error) {
        erros.push({
          conta: info.conta.descricao,
          erro: error.message
        });
        console.error(`Erro ao processar conta ${info.conta.descricao}:`, error);
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