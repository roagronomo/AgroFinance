import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list('nome', 500);
    
    // Criar mapa: CPF → ID do cliente no novo app
    const mapaCpfParaId = {};
    clientes.forEach(cliente => {
      const cpfLimpo = (cliente.cpf || '').replace(/\D/g, '');
      if (cpfLimpo) {
        mapaCpfParaId[cpfLimpo] = cliente.id;
      }
    });

    console.log(`📋 Mapa criado com ${Object.keys(mapaCpfParaId).length} clientes`);

    // Buscar todos os imóveis
    const imoveis = await base44.asServiceRole.entities.Imovel.list('-created_date', 1000);
    console.log(`🏠 ${imoveis.length} imóveis encontrados`);

    let imoveisAtualizados = 0;
    let imoveisNaoEncontrados = [];

    // Atualizar cliente_id dos imóveis que não são "sistema_analise_certidao"
    for (const imovel of imoveis) {
      const clienteIdAtual = imovel.cliente_id;
      
      // Pular imóveis do sistema de análise de certidões
      if (clienteIdAtual === "sistema_analise_certidao" || clienteIdAtual === "sistema") {
        continue;
      }

      // Verificar se o cliente_id já é um ID válido do novo sistema (começa com "6951")
      if (clienteIdAtual && clienteIdAtual.startsWith('6951')) {
        console.log(`✅ Imóvel ${imovel.nome_imovel} já tem ID atualizado`);
        continue;
      }

      // Buscar cliente antigo pelo ID antigo
      const clienteAntigoId = clienteIdAtual;
      
      // Tentar encontrar o cliente correspondente
      // Como não temos o CPF diretamente no imóvel, vamos buscar pela referência
      // Precisamos de uma estratégia diferente
      
      console.log(`⚠️ Imóvel "${imovel.nome_imovel}" tem cliente_id antigo: ${clienteIdAtual}`);
      imoveisNaoEncontrados.push({
        imovel_id: imovel.id,
        nome_imovel: imovel.nome_imovel,
        cliente_id_antigo: clienteIdAtual
      });
    }

    // Buscar todos os planos de produção
    const planos = await base44.asServiceRole.entities.PlanoProducao.list('-created_date', 1000);
    console.log(`📊 ${planos.length} planos de produção encontrados`);

    let planosAtualizados = 0;
    let planosNaoEncontrados = [];

    for (const plano of planos) {
      const clienteIdAtual = plano.cliente_id;
      
      // Verificar se o cliente_id já é um ID válido do novo sistema
      if (clienteIdAtual && clienteIdAtual.startsWith('6951')) {
        console.log(`✅ Plano já tem ID atualizado`);
        continue;
      }

      console.log(`⚠️ Plano tem cliente_id antigo: ${clienteIdAtual}`);
      planosNaoEncontrados.push({
        plano_id: plano.id,
        municipio: plano.municipio_lavoura,
        cliente_id_antigo: clienteIdAtual
      });
    }

    return Response.json({
      success: true,
      resumo: {
        total_clientes: clientes.length,
        total_imoveis: imoveis.length,
        total_planos: planos.length,
        imoveis_atualizados: imoveisAtualizados,
        planos_atualizados: planosAtualizados
      },
      pendentes: {
        imoveis: imoveisNaoEncontrados,
        planos: planosNaoEncontrados
      },
      mapa_cpf: mapaCpfParaId
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});