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

// Rotina de auto-marcação de contas vencidas como pagas
async function executarAutoMarcacao(base44, agoraBrasilia, GRUPO_PADRAO) {
  const hojeAuto = new Date(agoraBrasilia);
  hojeAuto.setHours(0, 0, 0, 0);
  const limite30 = new Date(hojeAuto);
  limite30.setDate(limite30.getDate() - 30);

  const hojeStr = hojeAuto.toISOString().split('T')[0];
  const limite30Str = limite30.toISOString().split('T')[0];

  const candidatas = await base44.asServiceRole.entities.ContaPagar.filter({
    ativo: true,
    pago: false
  });

  const paraMarcar = candidatas.filter(c => {
    if (!c.data_vencimento) return false;
    return c.data_vencimento < hojeStr && c.data_vencimento >= limite30Str;
  });

  const marcadas = [];
  for (const conta of paraMarcar) {
    const obsAuto = `\n[Auto] Marcada como paga em ${hojeStr} (vencia ${conta.data_vencimento}, sem marcação após 1+ dia)`;
    const novasObs = (conta.observacoes || '') + obsAuto;
    await base44.asServiceRole.entities.ContaPagar.update(conta.id, {
      pago: true,
      data_pagamento: conta.data_vencimento,
      observacoes: novasObs,
      lembrete_enviado: true
    });
    marcadas.push(conta);
  }

  console.log(`[verificarContasPagar] Auto-marcadas ${marcadas.length} contas como pagas`);

  if (marcadas.length >= 1) {
    const linhas = marcadas.map(c => {
      const valor = (c.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const dataVenc = new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR');
      return `• ${c.descricao} - ${valor} - venceu ${dataVenc}`;
    }).join('\n');

    const mensagem = `🔔 *Auto-marcação de contas pagas*\n\nMarquei ${marcadas.length} conta(s) como paga(s) automaticamente (venciam há 1+ dia sem marcação):\n\n${linhas}\n\nSe alguma foi marcada errado, abra o app e desmarque.`;

    try {
      await enviarWhatsApp(GRUPO_PADRAO, mensagem);
    } catch (e) {
      console.error('[AUTO-MARCAR] Erro ao enviar WhatsApp:', e.message);
    }
  }

  return marcadas.length;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Ler modo do payload (body POST) para permitir forçar auto-marcação manualmente
    let modoPayload = null;
    try {
      const body = await req.clone().json();
      modoPayload = body?.modo || null;
    } catch {
      // sem body ou body inválido — segue fluxo normal
    }

    const GRUPO_PADRAO = "120363424659062662@g.us";

    // Horário de Brasília (UTC-3) - CORRIGIDO
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaBrasilia = agoraBrasilia.getHours();
    const minutoBrasilia = agoraBrasilia.getMinutes();
    
    console.log(`[DIAGNÓSTICO] Horário UTC: ${agora.toISOString()}`);
    console.log(`[DIAGNÓSTICO] Horário Brasília: ${String(horaBrasilia).padStart(2,'0')}:${String(minutoBrasilia).padStart(2,'0')}`);

    // SHORT-CIRCUIT: modo "auto-marcar" via payload — executa imediatamente, ignora horário
    if (modoPayload === 'auto-marcar') {
      console.log('[verificarContasPagar] modo=auto-marcar (forçado via payload) — ignorando checagem de horário');
      const count = await executarAutoMarcacao(base44, agoraBrasilia, GRUPO_PADRAO);
      return Response.json({
        success: true,
        modo: 'auto-marcar',
        contasAutoMarcadas: count
      });
    }

    // Suporte a modo debug via query params (ex: ?forcar_no_dia=1)
    const url = new URL(req.url);
    const modoForcarNoDia = url.searchParams.get('forcar_no_dia') === '1';
    const modoForcarAntecipado = url.searchParams.get('forcar_antecipado') === '1';

    // Determinar o modo de execução pelo horário BRT
    // 06:00-06:59 BRT = Notificação de dia do vencimento (lembrete_enviado)
    // 16:00-16:59 BRT = Aviso antecipado (lembrete_antecipado_enviado)
    const modoNoDia = modoForcarNoDia || horaBrasilia === 6;
    const modoAntecipado = modoForcarAntecipado || horaBrasilia === 16;
    const modo = modoNoDia ? 'no_dia' : (modoAntecipado ? 'antecipado' : 'nenhum');

    console.log(`[verificarContasPagar] horaBrasilia=${horaBrasilia} modo=${modo} ts=${new Date().toISOString()}`);

    if (!modoNoDia && !modoAntecipado) {
      console.warn(`[verificarContasPagar] Nenhum modo executado nesta hora — possível problema de timezone. horaBrasilia=${horaBrasilia}`);
      console.log(`[GUARD] Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}. Envio às 6h (dia) e 16h (antecipado) BRT.`);
      return Response.json({
        success: true,
        message: `Fora do horário de envio. Hora BRT: ${horaBrasilia}:${String(minutoBrasilia).padStart(2,'0')}.`,
        lembretesEnviados: 0
      });
    }

    console.log(`[MODO] ${modoNoDia ? 'LEMBRETE DO DIA' : 'LEMBRETE ANTECIPADO'} (${horaBrasilia}h BRT)`);

    console.log('Iniciando verificação de contas a pagar...');

    // === AUTO-MARCAR CONTAS PAGAS (apenas modo manhã) ===
    if (modoNoDia) {
      try {
        await executarAutoMarcacao(base44, agoraBrasilia, GRUPO_PADRAO);
      } catch (e) {
        console.error('[AUTO-MARCAR] Erro na rotina:', e.message);
      }
    }
    // ================================================================================

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

    // === DETECÇÃO DE CONTAS DUPLICADAS ===
    // Agrupa por descrição+vencimento e alerta se houver valores diferentes
    const gruposDuplicados = {};
    for (const conta of contas) {
      const chave = `${conta.descricao?.toLowerCase().trim()}_${conta.data_vencimento}`;
      if (!gruposDuplicados[chave]) gruposDuplicados[chave] = [];
      gruposDuplicados[chave].push(conta);
    }
    for (const [chave, grupo] of Object.entries(gruposDuplicados)) {
      if (grupo.length > 1) {
        const valoresDistintos = [...new Set(grupo.map(c => c.valor))];
        if (valoresDistintos.length > 1) {
          const descricao = grupo[0].descricao;
          const vencimento = new Date(grupo[0].data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR');

          // Lista detalhada: valor + fornecedor + categoria de cada conta
          const listaValores = grupo.map(c => {
            const valorFmt = c.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const forn = c.fornecedor ? ` — ${c.fornecedor}` : '';
            const cat = c.categoria ? ` [${c.categoria}]` : '';
            return `• R$ ${valorFmt}${forn}${cat}`;
          }).join('\n');

          // Verifica se TODAS as contas do grupo têm fornecedor preenchido E são todos distintos
          const fornecedores = grupo.map(c => (c.fornecedor || '').trim().toLowerCase()).filter(f => f.length > 0);
          const todosTemFornecedor = fornecedores.length === grupo.length;
          const fornecedoresTodosDistintos = todosTemFornecedor && new Set(fornecedores).size === grupo.length;

          // Monta título, motivo e ação conforme o caso
          let titulo, motivo, acao;
          if (fornecedoresTodosDistintos) {
            titulo = '⚠️ *ATENÇÃO - CONTAS COM MESMA DESCRIÇÃO*';
            motivo = `🔍 *Motivo:* Mesma descrição ("${descricao}") e mesmo vencimento (${vencimento}), com valores E fornecedores diferentes.`;
            acao = 'ℹ️ Provavelmente são contas distintas (fornecedores diferentes). Revise se necessário.';
          } else {
            titulo = '⚠️ *ALERTA - CONTAS POSSIVELMENTE DUPLICADAS*';
            motivo = `🔍 *Motivo:* Mesma descrição ("${descricao}") e mesmo vencimento (${vencimento}), mas com valores diferentes — possível cadastro em duplicidade.`;
            acao = '⚠️ Verifique se há duplicidade antes do vencimento!';
          }

          const msg = `${titulo}\n\n📋 *${descricao}*\n📅 *Vencimento:* ${vencimento}\n\n💰 *Valores cadastrados (${grupo.length}x):*\n${listaValores}\n\n${motivo}\n\n${acao}\n\n_AgroFinance_`;

          try {
            await enviarWhatsApp(GRUPO_PADRAO, msg);
            console.log(`[DUPLICIDADE] Alerta enviado para: ${descricao} (${grupo.length} contas, ${valoresDistintos.length} valores distintos, fornecedores todos distintos: ${fornecedoresTodosDistintos})`);
          } catch (e) {
            console.error(`[DUPLICIDADE] Erro ao enviar alerta:`, e.message);
          }
        }
      }
    }
    // ======================================

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
        console.log(`[CONTA] "${conta.descricao}" | ID: ${conta.id} | privado: ${conta.privado || false} | dias: ${diasRestantes} | noDia: ${deveEnviarNoDia} | antecipado: ${deveEnviarAntecipado}`);
        
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
    const totaisPorDestino = {};
    for (const [chaveUnica, info] of Object.entries(resumoPorDestino)) {
      try {
        const { conta, destino, deveEnviarNoDia, deveEnviarAntecipado, dataFormatada, valorFormatado } = info;

        // === PROTEÇÃO ANTI-DUPLICAÇÃO ATÔMICA ===
        // Re-ler a conta AGORA para pegar o estado mais recente do banco
        const contaAtual = await base44.asServiceRole.entities.ContaPagar.get(conta.id);
        
        // Se os flags já foram marcados por outra execução paralela, pular
        if (deveEnviarNoDia && contaAtual.lembrete_enviado) {
          console.log(`[SKIP-RACE] ${conta.descricao} (${conta.id}) - lembrete_enviado já setado`);
          continue;
        }
        if (deveEnviarAntecipado && contaAtual.lembrete_antecipado_enviado) {
          console.log(`[SKIP-RACE] ${conta.descricao} (${conta.id}) - lembrete_antecipado_enviado já setado`);
          continue;
        }

        // Marcar como enviado IMEDIATAMENTE antes de qualquer outra operação
        const updateData = {};
        if (deveEnviarNoDia) updateData.lembrete_enviado = true;
        if (deveEnviarAntecipado) updateData.lembrete_antecipado_enviado = true;
        await base44.asServiceRole.entities.ContaPagar.update(conta.id, updateData);

        // Re-verificar após o update para garantir que fomos nós que gravamos primeiro
        const contaAposUpdate = await base44.asServiceRole.entities.ContaPagar.get(conta.id);
        if (deveEnviarNoDia && !contaAposUpdate.lembrete_enviado) {
          console.log(`[SKIP-RACE2] ${conta.descricao} - update não refletido, outra execução ganhou`);
          continue;
        }
        if (deveEnviarAntecipado && !contaAposUpdate.lembrete_antecipado_enviado) {
          console.log(`[SKIP-RACE2] ${conta.descricao} - update não refletido, outra execução ganhou`);
          continue;
        }
        // =========================================

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

        await enviarWhatsApp(destino, mensagem);

        // NOTA: A criação da próxima parcela é feita manualmente pelo usuário na tela.
        // A função NÃO cria parcelas automaticamente para evitar duplicação.
        // Acumular totais apenas para o que foi realmente enviado
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

    function formatarMoeda(valor) {
      const partes = valor.toFixed(2).split('.');
      partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return partes.join(',');
    }

    for (const [destino, totais] of Object.entries(totaisPorDestino)) {
      try {
        if (totais.dia.count > 1) {
          const msg = `📊 *RESUMO - CONTAS DO DIA*\n\n📌 Total de contas: ${totais.dia.count}\n💰 Valor total: R$ ${formatarMoeda(totais.dia.total)}\n\n_AgroFinance_`;
          await enviarWhatsApp(destino, msg);
        }
        if (totais.antecipado.count > 1) {
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