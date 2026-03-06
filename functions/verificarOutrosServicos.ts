import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
  if (!response.ok) throw new Error(`Evolution API error: ${JSON.stringify(resultado)}`);
  return resultado;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Horário de Brasília (UTC-3)
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaBrasilia = agoraBrasilia.getHours();
    const minutoBrasilia = agoraBrasilia.getMinutes();

    console.log(`[DIAGNÓSTICO] UTC: ${agora.toISOString()} | BRT: ${String(horaBrasilia).padStart(2,'0')}:${String(minutoBrasilia).padStart(2,'0')}`);

    // GUARD: Só enviar entre 6:00-6:59 BRT
    if (horaBrasilia !== 6) {
      console.log(`[GUARD] Fora do horário (6:00-6:59 BRT). Hora: ${horaBrasilia}. Abortando.`);
      return Response.json({ success: true, message: 'Fora do horário de envio', lembretesEnviados: 0 });
    }

    console.log('Iniciando verificação de Outros Serviços...');

    // Buscar serviços com lembrete WhatsApp ativado e não cancelados
    const servicos = await base44.asServiceRole.entities.OutroServico.filter({
      enviar_lembrete_whatsapp: true
    }, 'data_vencimento_boleto');

    const hoje = new Date(agoraBrasilia);
    hoje.setHours(0, 0, 0, 0);

    let lembretesEnviados = 0;
    const erros = [];

    for (const servico of servicos) {
      try {
        // Pular cancelados ou já enviados
        if (servico.status === 'cancelado' || servico.lembrete_enviado) continue;
        if (!servico.data_vencimento_boleto || !servico.telefone_contato) continue;

        const dataCobranca = new Date(servico.data_vencimento_boleto + 'T00:00:00');
        dataCobranca.setHours(0, 0, 0, 0);

        const diasRestantes = Math.floor((dataCobranca - hoje) / (1000 * 60 * 60 * 24));

        if (diasRestantes !== 0) continue;

        const dataExecucaoFormatada = servico.data_protocolo
          ? new Date(servico.data_protocolo + 'T00:00:00').toLocaleDateString('pt-BR')
          : 'Não informada';
        const dataCobrancaFormatada = dataCobranca.toLocaleDateString('pt-BR');
        const valorFormatado = servico.valor_receber
          ? servico.valor_receber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : 'Não informado';

        const mensagem = `💰 *LEMBRETE DE COBRANÇA - VENCE HOJE!*

📋 *${servico.descricao_servico}*
👤 *Cliente:* ${servico.cliente_nome}
${servico.banco ? `🏦 *Banco:* ${servico.banco}\n` : ''}📅 *Data de Execução:* ${dataExecucaoFormatada}
📅 *Cobrança:* ${dataCobrancaFormatada} (HOJE)
💵 *Valor:* ${valorFormatado}

⚠️ *ATENÇÃO: Esta cobrança vence HOJE!*

_Lembrete automático - AgroFinance_`;

        await enviarWhatsApp(servico.telefone_contato, mensagem);
        await base44.asServiceRole.entities.OutroServico.update(servico.id, { lembrete_enviado: true });
        lembretesEnviados++;
        console.log(`Lembrete enviado: ${servico.descricao_servico} - ${servico.cliente_nome}`);

      } catch (error) {
        erros.push({ servico: servico.descricao_servico, erro: error.message });
        console.error(`Erro: ${servico.descricao_servico}:`, error);
      }
    }

    console.log(`Verificação concluída. ${lembretesEnviados} lembrete(s) enviado(s).`);
    return Response.json({ success: true, lembretesEnviados, erros: erros.length > 0 ? erros : null });

  } catch (error) {
    console.error('Erro ao verificar outros serviços:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});