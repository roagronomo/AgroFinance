import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar dados do app atual
    const [clientes, imoveis, planos] = await Promise.all([
      base44.asServiceRole.entities.Cliente.list('nome', 500),
      base44.asServiceRole.entities.Imovel.list('-created_date', 1000),
      base44.asServiceRole.entities.PlanoProducao.list('-created_date', 1000)
    ]);

    // IDs válidos no app novo
    const idsNovosValidos = new Set(clientes.map(c => c.id));

    // Encontrar imóveis órfãos (com cliente_id que não existe no app novo)
    const imoveisOrfaos = imoveis.filter(im => {
      const cid = im.cliente_id;
      if (cid === "sistema_analise_certidao" || cid === "sistema") return false;
      return !idsNovosValidos.has(cid);
    });

    // Encontrar planos órfãos
    const planosOrfaos = planos.filter(pl => {
      const cid = pl.cliente_id;
      return !idsNovosValidos.has(cid);
    });

    // Agrupar por cliente_id antigo para análise
    const gruposImoveis = {};
    imoveisOrfaos.forEach(im => {
      if (!gruposImoveis[im.cliente_id]) {
        gruposImoveis[im.cliente_id] = [];
      }
      gruposImoveis[im.cliente_id].push({
        id: im.id,
        nome: im.nome_imovel,
        municipio: im.municipio
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
      grupos_orfaos: gruposImoveis,
      clientes_disponiveis: clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        cpf: c.cpf,
        cidade: c.cidade,
        uf: c.uf
      }))
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});