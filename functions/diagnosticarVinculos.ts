import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar clientes, imóveis e planos
    const [clientes, imoveis, planos] = await Promise.all([
      base44.asServiceRole.entities.Cliente.list('nome', 500),
      base44.asServiceRole.entities.Imovel.list('-created_date', 1000),
      base44.asServiceRole.entities.PlanoProducao.list('-created_date', 1000)
    ]);

    // Criar conjunto de IDs válidos de clientes
    const idsClientesValidos = new Set(clientes.map(c => c.id));

    // Encontrar imóveis órfãos
    const imoveisOrfaos = imoveis.filter(im => {
      const cid = im.cliente_id;
      // Ignorar sistema
      if (cid === "sistema_analise_certidao" || cid === "sistema") return false;
      // Verificar se o ID existe nos clientes válidos
      return !idsClientesValidos.has(cid);
    });

    // Encontrar planos órfãos
    const planosOrfaos = planos.filter(pl => {
      const cid = pl.cliente_id;
      return !idsClientesValidos.has(cid);
    });

    // Agrupar imóveis órfãos por cliente_id antigo
    const gruposImoveis = {};
    imoveisOrfaos.forEach(im => {
      const cid = im.cliente_id;
      if (!gruposImoveis[cid]) {
        gruposImoveis[cid] = [];
      }
      gruposImoveis[cid].push({
        id: im.id,
        nome: im.nome_imovel,
        municipio: im.municipio
      });
    });

    // Agrupar planos órfãos
    const gruposPlanos = {};
    planosOrfaos.forEach(pl => {
      const cid = pl.cliente_id;
      if (!gruposPlanos[cid]) {
        gruposPlanos[cid] = [];
      }
      gruposPlanos[cid].push({
        id: pl.id,
        municipio: pl.municipio_lavoura,
        numero_produto: pl.numero_produto
      });
    });

    return Response.json({
      success: true,
      diagnostico: {
        total_clientes: clientes.length,
        total_imoveis: imoveis.length,
        total_planos: planos.length,
        imoveis_orfaos: imoveisOrfaos.length,
        planos_orfaos: planosOrfaos.length
      },
      imoveis_por_cliente_antigo: gruposImoveis,
      planos_por_cliente_antigo: gruposPlanos,
      clientes_disponiveis: clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        cpf: c.cpf
      }))
    });
  } catch (error) {
    console.error('Erro no diagnóstico:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});