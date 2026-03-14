import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const GRUPO_ID = "120363424659062662@g.us";

  const contas = await base44.asServiceRole.entities.ContaPagar.list();
  for (const conta of contas) {
    await base44.asServiceRole.entities.ContaPagar.update(conta.id, { grupo_whatsapp_id: GRUPO_ID });
  }

  const lembretes = await base44.asServiceRole.entities.Lembrete.list();
  for (const lembrete of lembretes) {
    await base44.asServiceRole.entities.Lembrete.update(lembrete.id, { grupo_whatsapp_id: GRUPO_ID });
  }

  return Response.json({
    contasAtualizadas: contas.length,
    lembretesAtualizados: lembretes.length
  });
});