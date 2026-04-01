/**
 * Consulta status das instâncias da Evolution API e gera QR Code para reconexão
 * 
 * Payload esperado:
 * {
 *   acao: "status" | "conectar" | "desconectar" | "reiniciar",
 *   instancia?: "agrofinance-whatsapp" | "isabela-whatsapp"  // obrigatório para conectar/desconectar/reiniciar
 * }
 * 
 * Retornos:
 * - status: lista todas as instâncias com connectionStatus, profileName, número
 * - conectar: retorna QR Code em base64 para a instância solicitada
 * - desconectar: desconecta a instância (logout)
 * - reiniciar: reinicia a instância
 */
Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const { acao = 'status', instancia } = payload;

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return Response.json({ 
        error: 'Credenciais da Evolution API não configuradas' 
      }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    };

    // === AÇÃO: STATUS ===
    if (acao === 'status') {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, { headers });
      const instances = await response.json();

      if (!response.ok) {
        return Response.json({ success: false, error: 'Erro ao buscar instâncias', detalhes: instances }, { status: response.status });
      }

      const resultado = instances.map((inst: any) => ({
        nome: inst.name,
        status: inst.connectionStatus,
        perfil: inst.profileName || '—',
        numero: inst.ownerJid ? inst.ownerJid.replace('@s.whatsapp.net', '').replace(/^55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '—',
        foto: inst.profilePicUrl || null,
        desconexao: inst.disconnectionAt || null,
        motivoDesconexao: inst.disconnectionReasonCode || null,
        mensagens: inst._count?.Message || 0,
        contatos: inst._count?.Contact || 0,
        ultimaAtualizacao: inst.updatedAt || null
      }));

      return Response.json({ success: true, instancias: resultado });
    }

    // Validar instância para ações específicas
    if (!instancia) {
      return Response.json({ error: 'Parâmetro obrigatório: instancia' }, { status: 400 });
    }

    // === AÇÃO: CONECTAR (gerar QR Code) ===
    if (acao === 'conectar') {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instancia}`, {
        method: 'GET',
        headers
      });
      const resultado = await response.json();

      if (!response.ok) {
        return Response.json({ success: false, error: 'Erro ao gerar QR Code', detalhes: resultado }, { status: response.status });
      }

      return Response.json({ 
        success: true, 
        instancia,
        qrcode: resultado.base64 || null,
        pairingCode: resultado.pairingCode || null,
        count: resultado.count || 0
      });
    }

    // === AÇÃO: DESCONECTAR (logout) ===
    if (acao === 'desconectar') {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instancia}`, {
        method: 'DELETE',
        headers
      });
      const resultado = await response.json();

      return Response.json({ 
        success: response.ok, 
        instancia,
        mensagem: response.ok ? 'Instância desconectada' : 'Erro ao desconectar',
        detalhes: resultado
      });
    }

    // === AÇÃO: REINICIAR ===
    if (acao === 'reiniciar') {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instancia}`, {
        method: 'PUT',
        headers
      });
      const resultado = await response.json();

      return Response.json({ 
        success: response.ok, 
        instancia,
        mensagem: response.ok ? 'Instância reiniciada' : 'Erro ao reiniciar',
        detalhes: resultado
      });
    }

    return Response.json({ error: 'Ação inválida. Use: status, conectar, desconectar, reiniciar' }, { status: 400 });

  } catch (error) {
    console.error('Erro evolutionStatus:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});