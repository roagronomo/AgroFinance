import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Horário UTC do servidor
    const agoraUTC = new Date();
    
    // Converter para horário de Brasília usando timezone nativo
    const agoraBrasilia = new Date(agoraUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    return Response.json({
      horario_utc: agoraUTC.toISOString(),
      horario_brasilia: agoraBrasilia.toISOString(),
      horario_brasilia_formatado: `${String(agoraBrasilia.getHours()).padStart(2, '0')}:${String(agoraBrasilia.getMinutes()).padStart(2, '0')}:${String(agoraBrasilia.getSeconds()).padStart(2, '0')}`,
      data_brasilia_formatada: `${String(agoraBrasilia.getDate()).padStart(2, '0')}/${String(agoraBrasilia.getMonth() + 1).padStart(2, '0')}/${agoraBrasilia.getFullYear()}`
    });

  } catch (error) {
    console.error('Erro ao verificar horário:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});