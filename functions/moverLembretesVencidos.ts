import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const data90DiasAtras = new Date(agora);
    data90DiasAtras.setDate(data90DiasAtras.getDate() - 90);

    // 1. Buscar lembretes ativos vencidos (data_evento < hoje)
    const todosLembretes = await base44.asServiceRole.entities.Lembrete.list();
    const lembretesVencidos = todosLembretes.filter(l => 
      l.ativo && 
      !l.concluido && 
      l.data_evento < dataHoje
    );

    // 2. Marcar como concluídos
    let movidos = 0;
    for (const lembrete of lembretesVencidos) {
      await base44.asServiceRole.entities.Lembrete.update(lembrete.id, {
        concluido: true,
        ativo: false,
        data_conclusao: agora.toISOString()
      });
      movidos++;
    }

    // 3. Excluir lembretes concluídos há mais de 90 dias
    const lembretesConcluidos = todosLembretes.filter(l => 
      l.concluido && 
      l.data_conclusao && 
      new Date(l.data_conclusao) < data90DiasAtras
    );

    let excluidos = 0;
    for (const lembrete of lembretesConcluidos) {
      await base44.asServiceRole.entities.Lembrete.delete(lembrete.id);
      excluidos++;
    }

    return Response.json({ 
      success: true,
      movidos,
      excluidos,
      mensagem: `${movidos} lembretes movidos para concluídos, ${excluidos} excluídos (>90 dias)`
    });
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});