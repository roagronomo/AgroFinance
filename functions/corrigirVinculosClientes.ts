import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Buscar todos os clientes do APP ANTIGO (Cerrado Consultoria)
    const clientesAntigos = await base44.asServiceRole.entities['68cdb2d792e5fbfc65ac3e5d'].Cliente.list('nome', 500);
    
    // 2. Buscar todos os clientes do APP NOVO (AgroFinance)
    const clientesNovos = await base44.asServiceRole.entities.Cliente.list('nome', 500);
    
    // 3. Criar mapa: CPF → ID novo
    const mapaCpfParaIdNovo = {};
    clientesNovos.forEach(cliente => {
      const cpfLimpo = (cliente.cpf || '').replace(/\D/g, '');
      if (cpfLimpo) {
        mapaCpfParaIdNovo[cpfLimpo] = cliente.id;
      }
    });

    // 4. Criar mapa: ID antigo → CPF
    const mapaIdAntigoParaCpf = {};
    clientesAntigos.forEach(cliente => {
      const cpfLimpo = (cliente.cpf || '').replace(/\D/g, '');
      if (cpfLimpo && cliente.id) {
        mapaIdAntigoParaCpf[cliente.id] = cpfLimpo;
      }
    });

    console.log(`📋 ${clientesAntigos.length} clientes no app antigo`);
    console.log(`📋 ${clientesNovos.length} clientes no app novo`);

    // 5. Atualizar imóveis
    const imoveis = await base44.asServiceRole.entities.Imovel.list('-created_date', 1000);
    let imoveisAtualizados = 0;
    let imoveisNaoEncontrados = [];

    for (const imovel of imoveis) {
      const clienteIdAntigo = imovel.cliente_id;
      
      // Pular sistema
      if (clienteIdAntigo === "sistema_analise_certidao" || clienteIdAntigo === "sistema") {
        continue;
      }

      // Já está correto?
      if (clienteIdAntigo && clienteIdAntigo.startsWith('6951')) {
        continue;
      }

      // Buscar CPF do cliente antigo
      const cpf = mapaIdAntigoParaCpf[clienteIdAntigo];
      
      if (!cpf) {
        console.log(`⚠️ Cliente antigo ${clienteIdAntigo} não encontrado`);
        imoveisNaoEncontrados.push(imovel.nome_imovel);
        continue;
      }

      // Buscar ID novo pelo CPF
      const novoClienteId = mapaCpfParaIdNovo[cpf];
      
      if (!novoClienteId) {
        console.log(`⚠️ Cliente com CPF ${cpf} não encontrado no novo app`);
        imoveisNaoEncontrados.push(imovel.nome_imovel);
        continue;
      }

      // Atualizar imóvel
      await base44.asServiceRole.entities.Imovel.update(imovel.id, {
        cliente_id: novoClienteId
      });
      
      imoveisAtualizados++;
      console.log(`✅ Imóvel "${imovel.nome_imovel}" atualizado: ${clienteIdAntigo} → ${novoClienteId}`);
    }

    // 6. Atualizar planos de produção
    const planos = await base44.asServiceRole.entities.PlanoProducao.list('-created_date', 1000);
    let planosAtualizados = 0;
    let planosNaoEncontrados = [];

    for (const plano of planos) {
      const clienteIdAntigo = plano.cliente_id;
      
      // Já está correto?
      if (clienteIdAntigo && clienteIdAntigo.startsWith('6951')) {
        continue;
      }

      // Buscar CPF do cliente antigo
      const cpf = mapaIdAntigoParaCpf[clienteIdAntigo];
      
      if (!cpf) {
        console.log(`⚠️ Cliente antigo ${clienteIdAntigo} não encontrado`);
        planosNaoEncontrados.push(plano.municipio_lavoura);
        continue;
      }

      // Buscar ID novo pelo CPF
      const novoClienteId = mapaCpfParaIdNovo[cpf];
      
      if (!novoClienteId) {
        console.log(`⚠️ Cliente com CPF ${cpf} não encontrado no novo app`);
        planosNaoEncontrados.push(plano.municipio_lavoura);
        continue;
      }

      // Atualizar plano
      await base44.asServiceRole.entities.PlanoProducao.update(plano.id, {
        cliente_id: novoClienteId
      });
      
      planosAtualizados++;
      console.log(`✅ Plano de ${plano.municipio_lavoura} atualizado: ${clienteIdAntigo} → ${novoClienteId}`);
    }

    return Response.json({
      success: true,
      resumo: {
        imoveis_atualizados: imoveisAtualizados,
        imoveis_nao_encontrados: imoveisNaoEncontrados.length,
        planos_atualizados: planosAtualizados,
        planos_nao_encontrados: planosNaoEncontrados.length
      },
      detalhes: {
        imoveis_nao_encontrados: imoveisNaoEncontrados,
        planos_nao_encontrados: planosNaoEncontrados
      }
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});