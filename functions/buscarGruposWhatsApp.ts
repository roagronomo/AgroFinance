import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar grupos do cache (banco de dados)
    const gruposCache = await base44.asServiceRole.entities.GrupoWhatsApp.list('-ultima_atualizacao');
    
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_INSTANCE_NAME || !EVOLUTION_API_KEY) {
      // Se não tem configuração, retornar grupos do cache
      const grupos = gruposCache.map(g => ({ id: g.grupo_id, subject: g.nome }));
      return Response.json({ 
        grupos,
        fonte: 'cache',
        aviso: 'Usando grupos salvos (API não configurada)'
      });
    }

    // Tentar buscar da API
    try {
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
        console.warn('API Evolution indisponível:', response.status, errorText);
        
        // Retornar grupos do cache
        const grupos = gruposCache.map(g => ({ id: g.grupo_id, subject: g.nome }));
        return Response.json({ 
          grupos,
          fonte: 'cache',
          aviso: 'API temporariamente indisponível. Usando grupos salvos.'
        });
      }

      const data = await response.json();
      
      // A API pode retornar { groups: [...] } ou diretamente um array
      let gruposArray = [];
      if (Array.isArray(data)) {
        gruposArray = data;
      } else if (data && Array.isArray(data.groups)) {
        gruposArray = data.groups;
      } else if (data && data.data && Array.isArray(data.data)) {
        gruposArray = data.data;
      }

      // Atualizar cache no banco de dados
      if (gruposArray.length > 0) {
        const agora = new Date().toISOString();
        
        // Atualizar ou criar cada grupo
        for (const grupo of gruposArray) {
          const grupoExiste = gruposCache.find(g => g.grupo_id === grupo.id);
          
          if (grupoExiste) {
            await base44.asServiceRole.entities.GrupoWhatsApp.update(grupoExiste.id, {
              nome: grupo.subject,
              ultima_atualizacao: agora,
              ativo: true
            });
          } else {
            await base44.asServiceRole.entities.GrupoWhatsApp.create({
              grupo_id: grupo.id,
              nome: grupo.subject,
              ultima_atualizacao: agora,
              ativo: true
            });
          }
        }
        
        console.log(`Cache atualizado: ${gruposArray.length} grupos sincronizados`);
      }

      return Response.json({ 
        grupos: gruposArray,
        fonte: 'api',
        sincronizado: true
      });
    } catch (apiError) {
      console.error('Erro ao buscar da API:', apiError);
      
      // Retornar grupos do cache
      const grupos = gruposCache.map(g => ({ id: g.grupo_id, subject: g.nome }));
      return Response.json({ 
        grupos,
        fonte: 'cache',
        aviso: 'Erro ao buscar da API. Usando grupos salvos.'
      });
    }
  } catch (error) {
    console.error('Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});