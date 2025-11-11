export function formatarNomeProprio(nome) {
  if (!nome) return '';

  // Palavras a manter em minúsculo quando não forem a primeira/última do nome
  const lowerWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'à', 'às'];
  
  // Romanos válidos (para manter em maiúsculo)
  const romans = ['ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
  
  // Siglas comuns (mantém maiúsculas quando isoladas)
  const siglas = ['me', 'epp', 's/a', 's.a.', 'ltda', 'ltda.', 'eireli', 'mei'];

  // Sanitiza espaçamento
  const s = nome.trim().replace(/\s+/g, ' ');
  if (!s) return '';

  // Divide em palavras
  const palavras = s.split(' ');
  
  return palavras.map((rawWord, index) => {
    if (!rawWord) return rawWord;

    // Trata subpartes por hífen (ex.: Ana-Maria)
    const parts = rawWord.split('-').map(part => formatPart(part, index, palavras.length, lowerWords, romans, siglas));
    return parts.join('-');
  }).join(' ');
}

function formatPart(word, wordIndex, totalWords, lowerWords, romans, siglas) {
  const w = word.toLowerCase();

  // Mantém "d'Ávila" corretamente: se começa com d' / de' etc.
  const aposIndex = w.indexOf("'");
  if (aposIndex > 0 && aposIndex < w.length - 1) {
    const left = w.slice(0, aposIndex + 1);
    const right = w.slice(aposIndex + 1);
    return left + capitalize(right);
  }

  // Primeira/última palavra sempre capitalizada (mesmo se for "da", "de", etc.)
  if (wordIndex === 0 || wordIndex === totalWords - 1) {
    return capitalize(w);
  }

  // Romanos e siglas, manter maiúsculo
  if (romans.includes(w)) return w.toUpperCase();
  if (siglas.includes(w)) return w.toUpperCase();

  // Palavras de ligação em minúsculo
  if (lowerWords.includes(w)) return w;

  // Demais: Capitaliza
  return capitalize(w);
}

function capitalize(w) {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

export function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(0)) return false;
  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(1)) return false;
  return true;
}

export const formatarCPF = (cpf) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
export const formatarCNPJ = (cnpj) => cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

export function formatarContrato(contrato) {
  if (!contrato) return '';
  
  // Remove caracteres não permitidos e espaços extras
  return contrato
    .replace(/[^0-9/.\-]/g, '') // Permite apenas dígitos, /, . e -
    .replace(/\s+/g, '') // Remove todos os espaços
    .trim();
}

export function normalizeContract(str = '') {
  // Remove tudo que não for dígito
  return String(str).replace(/\D/g, '');
}