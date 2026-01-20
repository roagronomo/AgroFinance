import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Lista todos os grupos do WhatsApp disponíveis na instância
 * 
 * Retorna:
 * {
 *   success: true,
 *   grupos: [
 *     { id: "556481472080-1616761032@g.us", subject: "Nome do Grupo" }
 *   ]
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter credenciais da Evolution API
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      return Response.json({ 
        error: 'Credenciais da Evolution API não configuradas' 
      }, { status: 500 });
    }

    console.log(`🔍 Buscando grupos do WhatsApp...`);
    console.log(`📍 Endpoint: ${EVOLUTION_API_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE_NAME}`);

    // Buscar grupos via Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE_NAME}?getParticipants=false`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    const resultado = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao buscar grupos:', resultado);
      return Response.json({ 
        success: false, 
        error: resultado.message || 'Erro ao buscar grupos',
        detalhes: resultado
      }, { status: response.status });
    }

    // Processar e formatar a lista de grupos
    const grupos = resultado.map(grupo => ({
      id: grupo.id,
      subject: grupo.subject || grupo.name || 'Sem nome',
      pictureUrl: grupo.pictureUrl || null
    }));

    console.log(`✅ ${grupos.length} grupo(s) encontrado(s)`);

    return Response.json({ 
      success: true,
      grupos: grupos,
      total: grupos.length
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});