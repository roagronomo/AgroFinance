import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar como service role para acesso admin
    const servicosComBoleto = await base44.asServiceRole.entities.OutroServico.list("-data_vencimento_boleto");
    
    console.log(`Total de serviços encontrados: ${servicosComBoleto.length}`);
    
    // Horário de Brasília (UTC-3)
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    console.log(`[DIAGNÓSTICO] UTC: ${agora.toISOString()} | BRT: ${String(agoraBrasilia.getHours()).padStart(2,'0')}:${String(agoraBrasilia.getMinutes()).padStart(2,'0')}`);

    // Data de hoje (horário de Brasília)
    const hoje = new Date(agoraBrasilia);
    hoje.setHours(0, 0, 0, 0);
    
    // Data daqui a 3 dias (para aviso antecipado)
    const daquiTresDias = new Date(hoje);
    daquiTresDias.setDate(daquiTresDias.getDate() + 3);
    
    let lembreteEnviados = 0;
    const erros = [];
    
    for (const servico of servicosComBoleto) {
      try {
        // Verificar se tem boleto emitido e data de vencimento
        if (!servico.boleto_emitido || !servico.data_vencimento_boleto) {
          continue;
        }
        
        // Verificar se já enviou lembrete
        if (servico.lembrete_enviado) {
          continue;
        }
        
        // Verificar se não está concluído ou cancelado
        if (servico.status === 'concluido' || servico.status === 'cancelado') {
          continue;
        }
        
        const dataVencimento = new Date(servico.data_vencimento_boleto + 'T00:00:00');
        dataVencimento.setHours(0, 0, 0, 0);
        
        // Enviar lembrete se vencer hoje OU daqui a 3 dias
        const deveLembrar = (
          dataVencimento.getTime() === hoje.getTime() ||
          dataVencimento.getTime() === daquiTresDias.getTime()
        );
        
        if (deveLembrar) {
          // Buscar dados do cliente para enviar e-mail e WhatsApp
          const clientes = await base44.asServiceRole.entities.Cliente.list("nome");
          const cliente = clientes.find(c => c.nome === servico.cliente_nome);
          
          if (cliente) {
            const diasRestantes = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
            const mensagemVencimento = diasRestantes === 0 
              ? "HOJE" 
              : `em ${diasRestantes} dia(s)`;
            
            let enviadoEmail = false;
            let enviadoWhatsApp = false;
            
            // Enviar e-mail se tiver
            if (cliente.email) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: cliente.email,
                  subject: `Lembrete: Boleto vence ${mensagemVencimento}`,
                  body: `
Olá ${cliente.nome},

Este é um lembrete automático sobre o vencimento de um boleto:

Serviço: ${servico.descricao_servico}
Valor: R$ ${servico.valor_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Vencimento: ${new Date(servico.data_vencimento_boleto).toLocaleDateString('pt-BR')}
Status: Vence ${mensagemVencimento}

${servico.banco ? `Banco: ${servico.banco}` : ''}

Por favor, providencie o pagamento para evitar atrasos.

Atenciosamente,
Equipe AgroFinance
                  `.trim()
                });
                enviadoEmail = true;
                console.log(`E-mail enviado para ${cliente.email}`);
              } catch (error) {
                console.error(`Erro ao enviar e-mail:`, error);
              }
            }
            
            // Enviar WhatsApp APENAS se o campo enviar_lembrete_whatsapp estiver marcado
            if (servico.enviar_lembrete_whatsapp && servico.telefone_contato) {
              try {
                const mensagemWhatsApp = `🔔 *Lembrete de Boleto*

Olá ${cliente.nome}!

Seu boleto vence *${mensagemVencimento}*:

📋 *Serviço:* ${servico.descricao_servico}
💰 *Valor:* R$ ${servico.valor_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 *Vencimento:* ${new Date(servico.data_vencimento_boleto).toLocaleDateString('pt-BR')}
${servico.banco ? `🏦 *Banco:* ${servico.banco}` : ''}

Por favor, providencie o pagamento para evitar atrasos.

_Mensagem automática - AgroFinance_`;

                await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
                  numero: servico.telefone_contato,
                  mensagem: mensagemWhatsApp
                });
                enviadoWhatsApp = true;
                console.log(`WhatsApp enviado para ${servico.telefone_contato}`);
              } catch (error) {
                console.error(`Erro ao enviar WhatsApp:`, error);
              }
            }
            
            // Marcar como enviado se pelo menos um canal funcionou
            if (enviadoEmail || enviadoWhatsApp) {
              await base44.asServiceRole.entities.OutroServico.update(servico.id, {
                lembrete_enviado: true
              });
              lembreteEnviados++;
              console.log(`Lembrete enviado para ${cliente.nome} - Email: ${enviadoEmail}, WhatsApp: ${enviadoWhatsApp}`);
            } else {
              console.warn(`Cliente sem e-mail ou celular cadastrado: ${servico.cliente_nome}`);
            }
          } else {
            console.warn(`Cliente não encontrado: ${servico.cliente_nome}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao processar serviço ${servico.id}:`, error);
        erros.push({ servico_id: servico.id, erro: error.message });
      }
    }
    
    return Response.json({
      success: true,
      lembretes_enviados: lembreteEnviados,
      total_verificados: servicosComBoleto.length,
      erros: erros.length > 0 ? erros : undefined
    });
    
  } catch (error) {
    console.error("Erro geral na verificação:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});