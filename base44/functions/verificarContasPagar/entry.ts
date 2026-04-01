import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Envia mensagem WhatsApp diretamente via Evolution API (sem depender de invoke)
async function enviarWhatsApp(numero, mensagem) {
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

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: numeroFormatado, text: mensagem })
  });

  const resultado = await response.json();
  if (!response.ok) {
    throw new Error(`Evolution API error: ${JSON.stringify(resultado)}`);
  }
  return resultado;
}

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

    // Suporte a modo debug via query params (ex: ?forcar_no_dia=1)
    const url = new URL(req.url);
    const modoForcarNoDia = url.searchParams.get('forcar_no_dia') === '1';
    const modoForcarAntecipado = url.searchParams.get('forcar_antecipado') === '1';

    // Determinar o modo de execução pelo horário BRT
    // 06:00-06:59 BRT = Notificação de dia do vencimento (lembrete_enviado)
    // 16:00-16:59 BRT = Aviso antecipado (lembrete_antecipado_enviado)
    const modoNoDia = modoForcarNoDia || horaBrasilia === 6;
    const modoAntecipado = modoForcarAntecipado || horaBrasilia === 16;

    if (!modoNoDia && !modoAntecipado) {
      console.log(`[GUARD] Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}. Envio às 6h (dia) e 16h (antecipado) BRT.`);
      return Response.json({
        success: true,
        message: `Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}.`,
        lembretesEnviados: 0
      });
    }

    console.log(`[MODO] ${modoNoDia ? 'LEMBRETE DO DIA' : 'LEMBRETE ANTECIPADO'} (${horaBrasilia}h BRT)`);

    console.log('Iniciando verificação de contas a pagar...');

    const GRUPO_PADRAO = "120363424659062662@g.us";

    // Buscar todas as contas ativas, não pagas e não privadas
    const todasContas = await base44.asServiceRole.entities.ContaPagar.filter({ 
      ativo: true,
      pago: false 
    }, 'data_vencimento');

    // Incluir TODAS as contas (privadas e não privadas)
    const contas = todasContas;
    console.log(`[INFO] Total contas ativas não pagas: ${todasContas.length} (privadas incluídas)`);

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

        // Só processa o tipo correspondente ao horário atual — evita duplicação entre execuções
        const deveEnviarNoDia = modoNoDia &&
          diasRestantes === 0 && 
          !conta.lembrete_enviado;

        const deveEnviarAntecipado = modoAntecipado &&
          diasRestantes === conta.dias_antes_avisar && 
          !conta.lembrete_antecipado_enviado;

        if (!deveEnviarAntecipado && !deveEnviarNoDia) {
          continue;
        }

        // Determinar o destino (grupo ou telefone individual, com fallback para grupo padrão)
        const destinoRaw = (conta.grupo_whatsapp_id || '').trim() || (conta.telefone_contato || '').trim();
        const destino = destinoRaw || GRUPO_PADRAO;
        console.log(`[CONTA] "${conta.descricao}" | dias: ${diasRestantes} | destino: ${destino} | noDia: ${deveEnviarNoDia} | antecipado: ${deveEnviarAntecipado}`);
        
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

        // Marcar como enviado ANTES de enviar a mensagem (evita duplicação em execuções paralelas)
        const updateData = {};
        if (deveEnviarNoDia) {
          updateData.lembrete_enviado = true;
        }
        if (deveEnviarAntecipado) {
          updateData.lembrete_antecipado_enviado = true;
        }
        await base44.asServiceRole.entities.ContaPagar.update(conta.id, updateData);

        await enviarWhatsApp(destino, mensagem);

        // Criar próxima parcela para contas recorrentes (com verificação de duplicata)
        if (deveEnviarNoDia) {
          if (conta.recorrente && conta.parcela_atual < conta.parcelas_total) {
            const proximaParcela = conta.parcela_atual + 1;
            const proximaData = new Date(conta.data_vencimento + 'T00:00:00');
            proximaData.setMonth(proximaData.getMonth() + 1);
            const proximaDataStr = proximaData.toISOString().split('T')[0];

            // Verificar se a próxima parcela já existe (pelo grupo_recorrencia_id + parcela_atual)
            const jaExiste = await base44.asServiceRole.entities.ContaPagar.filter({
              grupo_recorrencia_id: conta.grupo_recorrencia_id,
              parcela_atual: proximaParcela
            });

            if (jaExiste && jaExiste.length > 0) {
              console.log(`Parcela ${proximaParcela}/${conta.parcelas_total} já existe — ignorando criação duplicada`);
            } else {
              const proximaConta = {
                descricao: conta.descricao,
                valor: conta.valor,
                data_vencimento: proximaDataStr,
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
                parcela_atual: proximaParcela,
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
              console.log(`Próxima parcela criada: ${proximaParcela}/${conta.parcelas_total}`);
            }
          }
        }
        lembretesEnviados++;
        console.log(`Lembrete enviado: ${conta.descricao} (tipo: ${deveEnviarNoDia ? 'DIA' : 'ANTECIPADO'})`);

      } catch (error) {
        erros.push({
          conta: info.conta.descricao,
          erro: error.message
        });
        console.error(`Erro ao processar conta ${info.conta.descricao}:`, error);
      }
    }

    // Acumular totais por destino para envio de resumo
    const totaisPorDestino = {};
    for (const [, info] of Object.entries(resumoPorDestino)) {
      const { destino, conta, deveEnviarNoDia, deveEnviarAntecipado } = info;
      if (!totaisPorDestino[destino]) {
        totaisPorDestino[destino] = { dia: { count: 0, total: 0 }, antecipado: { count: 0, total: 0 } };
      }
      if (deveEnviarNoDia) {
        totaisPorDestino[destino].dia.count++;
        totaisPorDestino[destino].dia.total += conta.valor || 0;
      }
      if (deveEnviarAntecipado) {
        totaisPorDestino[destino].antecipado.count++;
        totaisPorDestino[destino].antecipado.total += conta.valor || 0;
      }
    }

    function formatarMoeda(valor) {
      const partes = valor.toFixed(2).split('.');
      partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return partes.join(',');
    }

    for (const [destino, totais] of Object.entries(totaisPorDestino)) {
      try {
        if (totais.dia.count > 0) {
          const msg = `📊 *RESUMO - CONTAS DO DIA*\n\n📌 Total de contas: ${totais.dia.count}\n💰 Valor total: R$ ${formatarMoeda(totais.dia.total)}\n\n_AgroFinance_`;
          await enviarWhatsApp(destino, msg);
        }
        if (totais.antecipado.count > 0) {
          const msg = `📊 *RESUMO - CONTAS PRÓXIMAS*\n\n📌 Total de contas: ${totais.antecipado.count}\n💰 Valor total: R$ ${formatarMoeda(totais.antecipado.total)}\n\n_AgroFinance_`;
          await enviarWhatsApp(destino, msg);
        }
      } catch (error) {
        console.error(`Erro ao enviar resumo para ${destino}:`, error);
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