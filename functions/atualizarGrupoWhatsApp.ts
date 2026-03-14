import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function processChunks(items, updateFn, chunkSize = 20) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(updateFn));
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

    await processChunks(contas, (c) =>
      base44.asServiceRole.entities.ContaPagar.update(c.id, { grupo_whatsapp_id: GRUPO_ID })
    );
    console.log("ContaPagar atualizadas.");

    await processChunks(lembretes, (l) =>
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