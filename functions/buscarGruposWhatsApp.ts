import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_INSTANCE_NAME || !EVOLUTION_API_KEY) {
      return Response.json({ 
        error: 'Configuração incompleta - verifique os secrets EVOLUTION_API_URL, EVOLUTION_INSTANCE_NAME e EVOLUTION_API_KEY' 
      }, { status: 500 });
    }

    const response = await fetch(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE_NAME}?getParticipants=false`,
      {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Evolution:', response.status, errorText);
      
      // Se for rate limit, retornar array vazio ao invés de erro
      if (errorText.includes('rate-overlimit')) {
        console.warn('Rate limit da API Evolution - retornando cache vazio');
        return Response.json({ 
          grupos: [],
          aviso: 'API temporariamente indisponível (rate limit). Os grupos serão carregados quando possível.'
        });
      }
      
      return Response.json({ 
        error: `Erro ao buscar grupos: HTTP ${response.status}`,
        detalhes: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Resposta da API:', data);
    
    // A API pode retornar { groups: [...] } ou diretamente um array
    let gruposArray = [];
    if (Array.isArray(data)) {
      gruposArray = data;
    } else if (data && Array.isArray(data.groups)) {
      gruposArray = data.groups;
    } else if (data && data.data && Array.isArray(data.data)) {
      gruposArray = data.data;
    }

    return Response.json({ grupos: gruposArray });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});