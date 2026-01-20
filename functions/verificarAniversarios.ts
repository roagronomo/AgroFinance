import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const hoje = new Date();
    const diaHoje = String(hoje.getDate()).padStart(2, '0');
    const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
    
    console.log(`🎂 Verificando aniversários do dia ${diaHoje}/${mesHoje}`);
    
    // Buscar todos os clientes com lembrete ativo
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    const clientesAniversariantes = clientes.filter(cliente => {
      if (!cliente.enviar_lembrete_aniversario || !cliente.data_nascimento) {
        return false;
      }
      
      const dataNasc = new Date(cliente.data_nascimento + 'T00:00:00');
      const diaNasc = String(dataNasc.getDate()).padStart(2, '0');
      const mesNasc = String(dataNasc.getMonth() + 1).padStart(2, '0');
      
      return diaNasc === diaHoje && mesNasc === mesHoje;
    });
    
    console.log(`🎉 ${clientesAniversariantes.length} aniversariante(s) encontrado(s)`);
    
    let enviados = 0;
    const erros = [];
    
    for (const cliente of clientesAniversariantes) {
      try {
        const destino = cliente.aniversario_grupo_whatsapp_id || cliente.aniversario_telefone_contato;
        
        if (!destino) {
          console.warn(`⚠️ Cliente ${cliente.nome} sem telefone/grupo configurado`);
          continue;
        }
        
        // Extrair primeiro e segundo nome
        const partesNome = cliente.nome ? cliente.nome.split(' ') : ['Cliente'];
        const primeiroSegundoNome = partesNome.length >= 2 
          ? `${partesNome[0]} ${partesNome[1]}` 
          : partesNome[0];
        
        const mensagem = `🎂 *Lembrete de Aniversário*\n\nHoje é aniversário de *${primeiroSegundoNome}*!\n\nNão esqueça de parabenizá-lo(a)! 🎉`;
        
        // Enviar mensagem de texto para você (grupo ou telefone de contato)
        const response = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
          numero: destino,
          mensagem: mensagem
        });
        
        if (response.success) {
          enviados++;
          console.log(`✅ Lembrete enviado para ${cliente.nome}`);
          
          // Enviar SOMENTE o cartão para o WhatsApp do cliente (se configurado)
          if (cliente.whatsapp_cliente && cliente.cartao_aniversario_url) {
            try {
              await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
                numero: cliente.whatsapp_cliente,
                mensagem: '',
                imagem_url: cliente.cartao_aniversario_url
              });
              console.log(`🎂 Cartão enviado para o cliente ${cliente.nome}`);
            } catch (imgError) {
              console.warn(`⚠️ Erro ao enviar cartão para o cliente ${cliente.nome}:`, imgError.message);
            }
          }
        } else {
          erros.push({ cliente: cliente.nome, erro: response.error });
          console.error(`❌ Erro ao enviar para ${cliente.nome}:`, response.error);
        }
      } catch (error) {
        erros.push({ cliente: cliente.nome, erro: error.message });
        console.error(`❌ Erro ao processar ${cliente.nome}:`, error.message);
      }
    }
    
    return Response.json({
      success: true,
      total_aniversariantes: clientesAniversariantes.length,
      lembretes_enviados: enviados,
      erros: erros
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});