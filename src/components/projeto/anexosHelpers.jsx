import { ProjetoAnexo } from "@/entities/ProjetoAnexo";

// Cache local para evitar re-buscas desnecessárias
const anexosCache = new Map();
const CACHE_TTL = 60000; // 60 segundos (aumentado)

/**
 * Busca anexos de múltiplos projetos de uma só vez (otimizado para listas)
 * @param {string[]} projetoIds - Array de IDs de projetos
 * @returns {Promise<Map<string, {contrato: {total: number}, art: {total: number}, geomapa: {total: number}}>>}
 */
export async function getAnexosResumoLote(projetoIds) {
  if (!projetoIds || projetoIds.length === 0) {
    return new Map();
  }

  const now = Date.now();
  const resultado = new Map();
  const idsParaBuscar = [];

  // Verificar cache primeiro
  for (const id of projetoIds) {
    const cached = anexosCache.get(id);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      resultado.set(id, cached.data);
    } else {
      idsParaBuscar.push(id);
    }
  }

  // Se todos estavam em cache, retornar
  if (idsParaBuscar.length === 0) {
    return resultado;
  }

  try {
    // Buscar todos os anexos de uma vez
    const todosAnexos = await ProjetoAnexo.list();
    
    // Agrupar por projeto
    const anexosPorProjeto = new Map();
    for (const anexo of todosAnexos) {
      if (!anexo.projeto_id || !anexo.file_id) continue;
      
      if (!anexosPorProjeto.has(anexo.projeto_id)) {
        anexosPorProjeto.set(anexo.projeto_id, []);
      }
      anexosPorProjeto.get(anexo.projeto_id).push(anexo);
    }

    // Processar cada projeto que precisava ser buscado
    for (const id of idsParaBuscar) {
      const anexosDoProjeto = anexosPorProjeto.get(id) || [];
      
      const resumo = {
        contrato: { total: anexosDoProjeto.filter(a => a.categoria === 'contrato').length },
        art: { total: anexosDoProjeto.filter(a => a.categoria === 'art').length },
        geomapa: { total: anexosDoProjeto.filter(a => a.categoria === 'geomapa').length }
      };

      // Adicionar ao cache
      anexosCache.set(id, {
        data: resumo,
        timestamp: now
      });

      resultado.set(id, resumo);
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao buscar anexos em lote:', error);
    
    // Em caso de erro, retornar zeros para os IDs que não estavam em cache
    for (const id of idsParaBuscar) {
      const resumoVazio = {
        contrato: { total: 0 },
        art: { total: 0 },
        geomapa: { total: 0 }
      };
      resultado.set(id, resumoVazio);
    }
    
    return resultado;
  }
}

/**
 * Retorna resumo de anexos por categoria para um projeto (uso individual)
 * @param {string} projetoId - ID do projeto
 * @returns {Promise<{contrato: {total: number}, art: {total: number}, geomapa: {total: number}}>}
 */
export async function getAnexosResumo(projetoId) {
  if (!projetoId) {
    return {
      contrato: { total: 0 },
      art: { total: 0 },
      geomapa: { total: 0 }
    };
  }

  // Verificar cache
  const cacheKey = projetoId;
  const cached = anexosCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Buscar anexos do projeto específico
    const anexos = await ProjetoAnexo.filter({ projeto_id: projetoId });

    // Contar por categoria (apenas anexos válidos com file_id)
    const contrato = anexos.filter(a => a.categoria === 'contrato' && a.file_id).length;
    const art = anexos.filter(a => a.categoria === 'art' && a.file_id).length;
    const geomapa = anexos.filter(a => a.categoria === 'geomapa' && a.file_id).length;

    const resultado = {
      contrato: { total: contrato },
      art: { total: art },
      geomapa: { total: geomapa }
    };

    // Armazenar em cache
    anexosCache.set(cacheKey, {
      data: resultado,
      timestamp: now
    });

    return resultado;
  } catch (error) {
    console.error('Erro ao buscar resumo de anexos:', error);
    return {
      contrato: { total: 0 },
      art: { total: 0 },
      geomapa: { total: 0 }
    };
  }
}

/**
 * Limpa o cache de anexos para um projeto específico ou todo o cache
 * @param {string|null} projetoId - ID do projeto ou null para limpar tudo
 */
export function limparCacheAnexos(projetoId = null) {
  if (projetoId) {
    anexosCache.delete(projetoId);
  } else {
    anexosCache.clear();
  }
}