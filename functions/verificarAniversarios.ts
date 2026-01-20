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
    
    // Buscar imagem de cartão configurada
    const configs = await base44.asServiceRole.entities.ConfiguracaoAniversario.list();
    const imagemCartao = configs.find(c => c.ativo && c.imagem_cartao_url);
    
    let enviados = 0;
    const erros = [];
    
    for (const cliente of clientesAniversariantes) {
      try {
        const destino = cliente.aniversario_grupo_whatsapp_id || cliente.aniversario_telefone_contato;
        
        if (!destino) {
          console.warn(`⚠️ Cliente ${cliente.nome} sem telefone/grupo configurado`);
          continue;
        }
        
        const mensagem = `🎂 *Lembrete de Aniversário*\n\nHoje é aniversário de *${cliente.nome}*!\n\nNão esqueça de parabenizá-lo(a)! 🎉`;
        
        // Enviar mensagem de texto
        const response = await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
          numero: destino,
          mensagem: mensagem
        });
        
        if (response.success) {
          // Se houver imagem configurada, enviar também
          if (imagemCartao?.imagem_cartao_url) {
            try {
              await base44.asServiceRole.functions.invoke('enviarWhatsAppEvolution', {
                numero: destino,
                mensagem: '', // Mensagem vazia, apenas a imagem
                imagem_url: imagemCartao.imagem_cartao_url
              });
            } catch (imgError) {
              console.warn(`⚠️ Erro ao enviar imagem para ${cliente.nome}:`, imgError.message);
            }
          }
          
          enviados++;
          console.log(`✅ Lembrete enviado para ${cliente.nome}`);
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