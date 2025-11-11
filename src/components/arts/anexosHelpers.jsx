// Helper para contar anexos ativos em um serviço

export function contarAnexosAtivos(servico) {
  if (!servico) return 0;
  
  let total = 0;
  
  // Notificação / Auto de Infração (objeto único)
  if (servico.anexo_notificacao && servico.anexo_notificacao.file_id) {
    total += 1;
  }
  
  // ART's (array)
  if (Array.isArray(servico.anexos_arts)) {
    total += servico.anexos_arts.filter(a => a && a.file_id).length;
  }
  
  // Áreas KML/KMZ (array)
  if (Array.isArray(servico.anexos_kml)) {
    total += servico.anexos_kml.filter(a => a && a.file_id).length;
  }
  
  // CAR / Outros (array)
  if (Array.isArray(servico.anexos_outros)) {
    total += servico.anexos_outros.filter(a => a && a.file_id).length;
  }
  
  return total;
}

// Helper para verificar se um serviço tem anexos
export function temAnexos(servico) {
  return contarAnexosAtivos(servico) > 0;
}

// Helper para obter detalhamento de anexos por tipo
export function detalhamentoAnexos(servico) {
  if (!servico) {
    return {
      notificacao: 0,
      arts: 0,
      areas: 0,
      outros: 0,
      total: 0
    };
  }
  
  const notificacao = servico.anexo_notificacao && servico.anexo_notificacao.file_id ? 1 : 0;
  const arts = Array.isArray(servico.anexos_arts) 
    ? servico.anexos_arts.filter(a => a && a.file_id).length 
    : 0;
  const areas = Array.isArray(servico.anexos_kml) 
    ? servico.anexos_kml.filter(a => a && a.file_id).length 
    : 0;
  const outros = Array.isArray(servico.anexos_outros) 
    ? servico.anexos_outros.filter(a => a && a.file_id).length 
    : 0;
  
  return {
    notificacao,
    arts,
    areas,
    outros,
    total: notificacao + arts + areas + outros
  };
}