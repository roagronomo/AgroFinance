import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Receber o mapeamento do frontend
    const { mapeamento } = await req.json();
    // mapeamento é um objeto: { cliente_id_antigo: cliente_id_novo, ... }

    if (!mapeamento || typeof mapeamento !== 'object') {
      throw new Error('Mapeamento inválido');
    }

    let imoveisAtualizados = 0;
    let planosAtualizados = 0;
    const erros = [];

    // Atualizar imóveis
    const imoveis = await base44.asServiceRole.entities.Imovel.list('-created_date', 1000);
    for (const imovel of imoveis) {
      const clienteIdAntigo = imovel.cliente_id;
      const clienteIdNovo = mapeamento[clienteIdAntigo];

      if (clienteIdNovo) {
        try {
          await base44.asServiceRole.entities.Imovel.update(imovel.id, {
            cliente_id: clienteIdNovo
          });
          imoveisAtualizados++;
        } catch (error) {
          erros.push({
            tipo: 'imovel',
            id: imovel.id,
            nome: imovel.nome_imovel,
            erro: error.message
          });
        }
      }
    }

    // Atualizar planos
    const planos = await base44.asServiceRole.entities.PlanoProducao.list('-created_date', 1000);
    for (const plano of planos) {
      const clienteIdAntigo = plano.cliente_id;
      const clienteIdNovo = mapeamento[clienteIdAntigo];

      if (clienteIdNovo) {
        try {
          await base44.asServiceRole.entities.PlanoProducao.update(plano.id, {
            cliente_id: clienteIdNovo
          });
          planosAtualizados++;
        } catch (error) {
          erros.push({
            tipo: 'plano',
            id: plano.id,
            erro: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      resumo: {
        imoveis_atualizados: imoveisAtualizados,
        planos_atualizados: planosAtualizados,
        erros: erros.length
      },
      erros
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});