import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function processSeq(items, updateFn, delay = 50) {
  for (const item of items) {
    await updateFn(item);
    await new Promise(r => setTimeout(r, delay));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const GRUPO_ID = "120363424659062662@g.us";

    const [contas, lembretes] = await Promise.all([
      base44.asServiceRole.entities.ContaPagar.list(),
      base44.asServiceRole.entities.Lembrete.list()
    ]);

    console.log(`ContaPagar: ${contas.length}, Lembretes: ${lembretes.length}`);

    await processSeq(contas, (c) =>
      base44.asServiceRole.entities.ContaPagar.update(c.id, { grupo_whatsapp_id: GRUPO_ID })
    );
    console.log("ContaPagar atualizadas.");

    await processSeq(lembretes, (l) =>
      base44.asServiceRole.entities.Lembrete.update(l.id, { grupo_whatsapp_id: GRUPO_ID })
    );
    console.log("Lembretes atualizados.");

    return Response.json({
      contasAtualizadas: contas.length,
      lembretesAtualizados: lembretes.length
    });
  } catch (err) {
    console.error("ERRO:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});