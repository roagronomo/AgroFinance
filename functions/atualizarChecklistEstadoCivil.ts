import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os templates
    const templates = await base44.asServiceRole.entities.ChecklistTemplate.list();
    
    let atualizados = 0;
    
    for (const template of templates) {
      let modificado = false;
      const itensAtualizados = template.itens_checklist?.map(item => {
        if (item.item && item.item.toLowerCase().includes('comprovante de estado civil')) {
          modificado = true;
          return {
            ...item,
            item: "Comprovante do estado civil (Certidão de Casamento, Certidão de Óbito, Declaração de União Estável)",
            observacao: item.observacao || ""
          };
        }
        return item;
      }) || [];
      
      if (modificado) {
        await base44.asServiceRole.entities.ChecklistTemplate.update(template.id, {
          itens_checklist: itensAtualizados
        });
        atualizados++;
      }
    }
    
    return Response.json({ 
      success: true, 
      message: `${atualizados} template(s) atualizado(s)` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});