/**
 * Formata a matrícula de um imóvel no padrão M-XX.XXX
 * Ex: "27692" → "M-27.692"
 */
export function formatarMatriculaLabel(matricula) {
  if (!matricula) return null;
  const digits = String(matricula).replace(/\D/g, '');
  if (!digits) return null;
  const formatado = new Intl.NumberFormat('pt-BR').format(parseInt(digits, 10));
  return `M-${formatado}`;
}

/**
 * Retorna o label completo de um imóvel para exibição em dropdowns.
 * Formato: "Nome do Imóvel (M-XX.XXX) - Município/UF"
 * Se não tiver matrícula: "Nome do Imóvel - Município/UF"
 */
export function labelImovel(imovel) {
  if (!imovel) return "";
  const nome = imovel.nome_imovel || "";
  const matriculaLabel = formatarMatriculaLabel(imovel.matricula_numero);
  const municipio = imovel.municipio || "";

  let label = nome;
  if (matriculaLabel) label += ` (${matriculaLabel})`;
  if (municipio) label += ` - ${municipio}`;
  return label;
}