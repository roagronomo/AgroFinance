import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter parâmetros
    const { latitude, longitude, uf } = await req.json();

    if (!latitude || !longitude || !uf) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: latitude, longitude, uf' 
      }, { status: 400 });
    }

    // Montar URL da API do governo
    const url = `http://geoserver.car.gov.br/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=sicar:sicar_imoveis_${uf.toLowerCase()}&outputFormat=application/json&cql_filter=INTERSECTS(the_geom,POINT(${longitude} ${latitude}))`;
    
    // Headers para fingir ser um navegador real (contornar bloqueios)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    // Fazer requisição ao GeoServer
    const response = await fetch(url, { 
      headers: headers,
      signal: AbortSignal.timeout(15000) // Timeout de 15 segundos
    });

    if (!response.ok) {
      return Response.json({ 
        error: `Erro ao consultar servidor do governo: ${response.status}` 
      }, { status: 500 });
    }

    const data = await response.json();

    // Processar resposta
    if (data.features && data.features.length > 0) {
      // Extrair informações relevantes do primeiro imóvel encontrado
      const imovel = data.features[0];
      const props = imovel.properties || {};

      return Response.json({
        sucesso: true,
        encontrado: true,
        dados: {
          cod_imovel: props.cod_imovel || null,
          nom_imovel: props.nom_imovel || null,
          num_area: props.num_area || null,
          des_condic: props.des_condic || null,
          num_modulo: props.num_modulo || null,
          cod_estado: props.cod_estado || null,
          nom_munici: props.nom_munici || null,
          // Incluir todas as propriedades para debug
          todas_propriedades: props
        },
        total_encontrados: data.features.length
      });
    } else {
      return Response.json({
        sucesso: true,
        encontrado: false,
        mensagem: 'Nenhum imóvel CAR encontrado nesta localização'
      });
    }

  } catch (error) {
    console.error('Erro na consulta CAR:', error);
    
    if (error.name === 'TimeoutError') {
      return Response.json({ 
        error: 'Timeout: Servidor do governo não respondeu a tempo' 
      }, { status: 504 });
    }

    return Response.json({ 
      error: `Erro interno: ${error.message}` 
    }, { status: 500 });
  }
});