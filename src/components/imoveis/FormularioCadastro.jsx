import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, AlertTriangle, FileText, Globe, Upload, Search, CheckCircle, Loader2, Paperclip, Map, FileIcon, Sparkles, Plus, Trash2, CalendarIcon, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Utilidades de formatação
const EXCEPTIONS = new Set(['de','da','do','das','dos','e','em','para','com','a','o','as','os','no','na','nos','nas','dum','duma','duns','dumas']);
const ROMAN_NUMERALS = /^(i{1,3}|iv|v|vi{0,3}|ix|x{1,3}|xi{1,3}|xiv|xv|xvi{0,3}|xix|xx)$/i;

const titleCasePt = (str) => {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => {
      const wLower = w.toLowerCase();
      // Algarismos romanos sempre em maiúsculo
      if (ROMAN_NUMERALS.test(w)) return w.toUpperCase();
      if (i !== 0 && EXCEPTIONS.has(wLower)) return wLower;
      if (wLower.includes("'")) {
        const [p1, p2] = wLower.split("'");
        return `${p1.charAt(0).toUpperCase()+p1.slice(1)}'${p2 ? p2.charAt(0).toUpperCase()+p2.slice(1) : ''}`;
      }
      return wLower.charAt(0).toUpperCase() + wLower.slice(1);
    })
    .join(' ');
};

const formatMunicipio = (raw) => {
  if (!raw) return '';
  let v = raw.trim().replace(/\s+/g, ' ');
  v = v.replace(/\s*-\s*/g, '/').replace(/\s*–\s*/g, '/');
  if (!v.includes('/')) {
    const m = v.match(/(.+?)\s*([A-Za-z]{2})$/);
    if (m) v = `${m[1]}/${m[2]}`;
  }
  const [cidadeRaw, ufRaw=''] = v.split('/');
  const cidade = titleCasePt(cidadeRaw || '');
  const uf = (ufRaw || '').toUpperCase().replace(/[^A-Z]/g,'').slice(0,2);
  return uf ? `${cidade}/${uf}` : cidade;
};

// Helper to parse string input (allowing comma as decimal, removing thousands separators) into a number
const parseAreaInput = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  
  let v = String(value).replace(/[^\d,.\-]/g, ''); // Remove tudo exceto dígitos, vírgula, ponto e sinal
  
  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  
  // Se há vírgula e ponto, manter o ÚLTIMO como decimal
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // Vírgula é decimal, ponto é milhar
      v = v.replace(/\./g, '').replace(',', '.');
    } else {
      // Ponto é decimal, vírgula é milhar
      v = v.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Apenas vírgula → converter para ponto (decimal)
    v = v.replace(',', '.');
  }
  // Se apenas ponto → já está como decimal
  
  return parseFloat(v) || 0;
};

// Helper to format a number for display in pt-BR locale with exactly 4 decimal places for area_total
const formatAreaBR4 = (value) => {
  if (value === null || value === undefined || value === '') return '';
  
  const n = typeof value === 'number' ? value : parseAreaInput(value);
  
  if (isNaN(n)) return '';
  
  return n.toLocaleString('pt-BR', { 
    minimumFractionDigits: 4, 
    maximumFractionDigits: 4 
  });
};

// Helper to format a number for display in pt-BR locale with exactly 2 decimal places
const formatAreaBR = (value) => {
  if (value === null || value === undefined || value === '') return '';
  
  const n = typeof value === 'number' ? value : parseAreaInput(value);
  
  if (isNaN(n)) return '';
  
  return n.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// Formatador de matrícula - formata com pontos de milhar
const formatarMatricula = (valor) => {
  if (!valor) return "";
  // Remove tudo que não for dígito
  const numbers = String(valor).replace(/\D/g, '');
  if (!numbers) return "";
  // Formata manualmente com pontos a cada 3 dígitos (da direita para esquerda)
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatarCPF = (cpf) => {
  if (!cpf) return "";
  const cleaned = String(cpf).replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatarCNPJ = (cnpj) => {
  if (!cnpj) return "";
  const cleaned = String(cnpj).replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Função inteligente que detecta e formata CPF ou CNPJ
const formatarCPFouCNPJ = (doc) => {
  if (!doc) return "";
  const cleaned = String(doc).replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // É CPF
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    // É CNPJ
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  // Retorna o valor original se não for CPF nem CNPJ válido
  return doc;
};

export default function FormularioCadastro({ imovel, clienteSelecionado, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    nome_imovel: "",
    matricula_numero: "",
    matricula_anterior: "",
    receita_federal: "",
    numero_incra: "",
    municipio: "",
    tipo_propriedade: "proprio", // This will be implicitly set by loaded imovel or default, no longer user-editable
    participacao_percentual: "", // No longer user-editable via UI
    demais_proprietarios: "", // No longer user-editable via UI
    regime_arrendamento: "",
    area_cedida: "",
    data_vencimento_contrato: "",
    financiavel_banco: "sim",
    observacoes: "",
    roteiro_acesso: "",
    car_numero: "",
    area_total: "",
    area_agricultavel: "",
    tipo_uso: "",
    area_lavoura: "",
    area_pastagens: "",
    area_reserva_legal: "",
    area_outros: "",
    financiamentos: [],
    avaliacao_mercado: "",
    dados_avaliacao: "",
    // Campos de coordenadas removidos
    mapa_area_total_urls: [],
    mapa_area_agricultavel_urls: [],
    contrato_arrendamento_urls: [],
    contrato_arrendamento_vencimento: "",
    carta_anuencia_urls: [],
    carta_anuencia_vencimento: ""
  });
  
  const [errors, setErrors] = useState({});
  const [validationError, setValidationError] = useState("");
  const [isUploading, setIsUploading] = useState({});

  // Estados para exibição formatada dos campos de área principais
  const [areaTotalDisplay, setAreaTotalDisplay] = useState("");
  const [areaAgricultavelDisplay, setAreaAgricultavelDisplay] = useState("");
  
  // Estados para exibição formatada dos campos de área por tipo de uso
  const [areaLavouraDisplay, setAreaLavouraDisplay] = useState("");
  const [areaPastagensDisplay, setAreaPastagensDisplay] = useState("");
  const [areaReservaLegalDisplay, setAreaReservaLegalDisplay] = useState("");
  const [areaOutrosDisplay, setAreaOutrosDisplay] = useState("");
  const [areaCedidaDisplay, setAreaCedidaDisplay] = useState("");

  // Estados para busca automática de certidão
  const [buscandoCertidao, setBuscandoCertidao] = useState(false);
  const [certidaoEncontrada, setCertidaoEncontrada] = useState(null);
  const [reescrevendoRoteiro, setReescrevendoRoteiro] = useState(false);

  // Estado para controle do calendário customizado
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Estados para controlar abertura dos popovers de calendário
  const [popoverVencimentoOpen, setPopoverVencimentoOpen] = useState(false);
  const [popoverArrendamentoOpen, setPopoverArrendamentoOpen] = useState(false);
  const [popoverAnuenciaOpen, setPopoverAnuenciaOpen] = useState(false);

  // useEffect para desbloquear campos de uso dinâmicos
  useEffect(() => {
    // Aguarda renderização do DOM
    const timer = setTimeout(() => {
      const usoBlock = document.querySelector('[data-uso-block="true"]');
      if (!usoBlock) return;

      // Desbloqueia todos os inputs dentro do bloco
      const inputs = usoBlock.querySelectorAll('input[type="text"], input[type="number"]');
      inputs.forEach(input => {
        // Remove atributos que bloqueiam
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        
        // Garante que pode receber input
        input.style.pointerEvents = 'auto';
        input.style.userSelect = 'text';
        input.style.opacity = '1';
        
        // Tipo texto para aceitar vírgula/ponto livremente
        if (input.type === 'number') {
          input.type = 'text';
          input.inputMode = 'decimal';
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [formData.tipo_uso]); // Re-executa quando tipo de uso muda

  useEffect(() => {
    if (imovel) {
      setFormData({
        ...imovel,
        // Ensure numbers are displayed correctly, especially for empty/null values
        matricula_numero: imovel.matricula_numero ? formatarMatricula(imovel.matricula_numero) : "", // Store raw value
        participacao_percentual: imovel.participacao_percentual !== null ? imovel.participacao_percentual : "",
        area_cedida: imovel.area_cedida !== null ? imovel.area_cedida : "",
        area_total: imovel.area_total !== null ? imovel.area_total : "",
        area_agricultavel: imovel.area_agricultavel !== null ? imovel.area_agricultavel : "",
        area_lavoura: imovel.area_lavoura !== null ? imovel.area_lavoura : "",
        area_pastagens: imovel.area_pastagens !== null ? imovel.area_pastagens : "",
        area_reserva_legal: imovel.area_reserva_legal !== null ? imovel.area_reserva_legal : "",
        area_outros: imovel.area_outros !== null ? imovel.area_outros : "",
        financiamentos: imovel.financiamentos || [],
        avaliacao_mercado: imovel.avaliacao_mercado !== null ? imovel.avaliacao_mercado : "",
        // Garantir que arrays de arquivos sejam carregados corretamente
        mapa_area_total_urls: imovel.mapa_area_total_urls || [],
        mapa_area_agricultavel_urls: imovel.mapa_area_agricultavel_urls || [],
        contrato_arrendamento_urls: imovel.contrato_arrendamento_urls || [],
        carta_anuencia_urls: imovel.carta_anuencia_urls || []
      });
      // Formatar valores de área para exibição
      setAreaTotalDisplay(formatAreaBR4(imovel.area_total)); // Changed to formatAreaBR4
      setAreaAgricultavelDisplay(formatAreaBR(imovel.area_agricultavel));
      // Formatar áreas por tipo de uso
      setAreaLavouraDisplay(formatAreaBR(imovel.area_lavoura));
      setAreaPastagensDisplay(formatAreaBR(imovel.area_pastagens));
      setAreaReservaLegalDisplay(formatAreaBR(imovel.area_reserva_legal));
      setAreaOutrosDisplay(formatAreaBR(imovel.area_outros));
      setAreaCedidaDisplay(formatAreaBR(imovel.area_cedida));
    } else {
      setFormData({
        nome_imovel: "",
        matricula_numero: "",
        matricula_anterior: "",
        receita_federal: "",
        numero_incra: "",
        municipio: "",
        tipo_propriedade: "proprio",
        participacao_percentual: "",
        demais_proprietarios: "",
        regime_arrendamento: "",
        area_cedida: "",
        data_vencimento_contrato: "",
        financiavel_banco: "sim",
        observacoes: "",
        roteiro_acesso: "",
        car_numero: "",
        area_total: "",
        area_agricultavel: "",
        tipo_uso: "",
        area_lavoura: "",
        area_pastagens: "",
        area_reserva_legal: "",
        area_outros: "",
        financiamentos: [],
        avaliacao_mercado: "",
        dados_avaliacao: "",
        // Campos de coordenadas removidos
        mapa_area_total_urls: [],
        mapa_area_agricultavel_urls: [],
        contrato_arrendamento_urls: [],
        contrato_arrendamento_vencimento: "",
        carta_anuencia_urls: [],
        carta_anuencia_vencimento: ""
      });
      setAreaTotalDisplay("");
      setAreaAgricultavelDisplay("");
      setAreaLavouraDisplay("");
      setAreaPastagensDisplay("");
      setAreaReservaLegalDisplay("");
      setAreaOutrosDisplay("");
      setAreaCedidaDisplay("");
    }
    setValidationError("");
    setErrors({});
    setCertidaoEncontrada(null); // Clear certidão info when form resets
  }, [imovel]);

  // useEffect para busca em tempo real com debounce
  useEffect(() => {
    const matricula = formData.matricula_numero;
    
    // Não buscar se estiver editando um imóvel existente
    if (imovel) return;
    
    // Não buscar se matrícula estiver vazia ou muito curta (considerando apenas dígitos para comprimento)
    if (!matricula || matricula.replace(/\D/g, '').length < 3) {
      setCertidaoEncontrada(null);
      return;
    }

    // Debounce: aguarda 800ms após parar de digitar
    const timer = setTimeout(() => {
      // Passa apenas os números para a função de busca
      buscarCertidaoPorMatricula(matricula.replace(/\D/g, ''));
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.matricula_numero, imovel]);

  const formatReceitaFederal = (value) => {
    if (!value) return "";
    
    // Se já está no formato correto, manter
    const hasFormatting = value.includes('.') || value.includes('-');
    if (hasFormatting) {
      // Validar se está no formato esperado (basicamente, deixar como está)
      return value;
    }
    
    // Caso contrário, formatar normalmente
    const numbers = value.replace(/\D/g, ''); 
    
    // Format: 0.000.000-0 (NIRF/CIB)
    if (numbers.length <= 1) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 1)}.${numbers.slice(1)}`;
    if (numbers.length <= 7) return `${numbers.slice(0, 1)}.${numbers.slice(1, 4)}.${numbers.slice(4)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 1)}.${numbers.slice(1, 4)}.${numbers.slice(4, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 1)}.${numbers.slice(1, 4)}.${numbers.slice(4, 7)}-${numbers.slice(7, 8)}`;
  };

  const formatNumeroIncra = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, ''); // Remove non-digits
    
    // Format: 000.000.000.000-0 (INCRA)
    // Example: 1234567890123 -> 123.456.789.012-3
    // Max length of numbers is 13 for the full format
    if (numbers.length <= 3) return numbers; // 123
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`; // 123.456
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`; // 123.456.789
    if (numbers.length <= 12) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}.${numbers.slice(9)}`; // 123.456.789.012
    if (numbers.length <= 13) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}.${numbers.slice(9, 12)}-${numbers.slice(12)}`; // 123.456.789.012-3
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}.${numbers.slice(9, 12)}-${numbers.slice(12, 13)}`; // Truncate if too long
  };

  const formatDate = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers; // DD
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`; // DD/MM
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`; // DD/MM/AAAA
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  };

  const handleChange = (field, value) => { // Generic handler
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // FUNÇÃO CORRIGIDA com logs detalhados
  const buscarCertidaoPorMatricula = async (matricula) => {
    if (!matricula || !matricula.trim()) return;

    try {
      setBuscandoCertidao(true);
      setCertidaoEncontrada(null);

      console.log("🔍 ===== INICIANDO BUSCA DE CERTIDÃO =====");
      console.log("📝 Matrícula digitada (original):", matricula);

      // Formatar matrícula para comparação (com pontos, removendo não-dígitos e zeros à esquerda)
      const matriculaFormatada = formatarMatricula(matricula);
      console.log("✨ Matrícula formatada para busca:", matriculaFormatada);
      
      // Buscar TODOS os imóveis
      const todosImoveis = await base44.entities.Imovel.list("-created_date", 200);
      console.log("📋 Total de imóveis no sistema:", todosImoveis?.length || 0);

      // Filtrar os que têm análise de certidão (independente do cliente_id)
      const imoveisComAnalise = (todosImoveis || []).filter(im => {
        // Considera qualquer imóvel que tenha dados_analise_certidao preenchido
        return im.dados_analise_certidao && im.dados_analise_certidao.trim() !== '';
      });
      
      console.log("✅ Imóveis com análise de certidão:", imoveisComAnalise.length);
      
      // Listar todas as matrículas com análise
      imoveisComAnalise.forEach(im => {
        // A matrícula no DB pode estar em formato numérico puro ou já formatado (se foi salva antes dessa lógica)
        // Precisamos normalizar ambos para comparação
        const matImovelDbNormalizada = (im.matricula_numero || '').replace(/\D/g, '');
        const matImovelFormatada = formatarMatricula(matImovelDbNormalizada); // Formata para display/comparação consistente
        console.log(`   - Matrícula analisada: ${im.matricula_numero} → Normalizada: ${matImovelDbNormalizada} → Formatada: ${matImovelFormatada}`);
      });
      
      // Buscar correspondência EXATA (com formatação consistente)
      const imovelComCertidao = imoveisComAnalise.find(im => {
        const matriculaImovelDbNormalizada = (im.matricula_numero || '').replace(/\D/g, '');
        const matriculaBuscadaNormalizada = matricula.replace(/\D/g, ''); // Ensure the incoming matricula is also numeric
        
        const match = matriculaImovelDbNormalizada === matriculaBuscadaNormalizada;
        
        if (match) {
          console.log("🎯 MATCH ENCONTRADO!");
          console.log("   - Matrícula do imóvel no DB (original):", im.matricula_numero);
          console.log("   - Nome do imóvel:", im.nome_imovel);
        }
        
        return match;
      });

      if (imovelComCertidao && imovelComCertidao.dados_analise_certidao) {
        console.log("✅ CERTIDÃO ENCONTRADA! Processando dados...");

        const dadosCertidao = JSON.parse(imovelComCertidao.dados_analise_certidao);
        console.log("📄 Dados da certidão:", dadosCertidao);

        // Filtrar observações
        const observacoesRelevantes = filtrarObservacoesRelevantes(dadosCertidao.observacoes || "");

        // Verificar se o cliente é proprietário
        const clienteCpfLimpo = clienteSelecionado?.cpf?.replace(/\D/g, '') || '';
        const ehProprietario = dadosCertidao.proprietarios?.some(prop => {
          const propCpfLimpo = prop.cpf?.replace(/\D/g, '') || '';
          return propCpfLimpo === clienteCpfLimpo;
        }) || false;

        // Verificar se é condomínio (mais de um proprietário)
        const ehCondominio = (dadosCertidao.proprietarios?.length || 0) > 1;

        // IMPORTANTE: Salvar TODOS os dados da certidão, incluindo proprietários, usufrutuários E dados complementares
        const certidaoData = {
          nome_imovel: dadosCertidao.nome_imovel,
          registro_antigo: dadosCertidao.registro_antigo,
          municipio: dadosCertidao.municipio,
          area_total_ha: dadosCertidao.area_total_ha,
          observacoes: observacoesRelevantes,
          proprietarios: dadosCertidao.proprietarios || [],
          usufrutuarios: dadosCertidao.usufrutuarios || [],
          ehProprietario: ehProprietario,
          ehCondominio: ehCondominio,
          // Incluir dados complementares do imóvel encontrado
          receita_federal: imovelComCertidao.receita_federal || "",
          numero_incra: imovelComCertidao.numero_incra || "",
          car_numero: imovelComCertidao.car_numero || ""
        };

        setCertidaoEncontrada(certidaoData);

        // Se está editando, aplicar automaticamente os dados
        if (imovel) {
          const areaStr = String(certidaoData.area_total_ha).replace(/\s*ha\s*$/i, '').trim();
          const areaNum = parseAreaInput(areaStr);

          // Determinar tipo de propriedade
          let tipoPropriedade = "terceiros";
          if (certidaoData.ehProprietario) {
            tipoPropriedade = certidaoData.ehCondominio ? "proprio_condominio" : "proprio";
          }

          setFormData(prev => ({
            ...prev,
            tipo_propriedade: tipoPropriedade,
            dados_analise_certidao: JSON.stringify({
              nome_imovel: certidaoData.nome_imovel,
              registro_antigo: certidaoData.registro_antigo,
              municipio: certidaoData.municipio,
              area_total_ha: certidaoData.area_total_ha,
              observacoes: certidaoData.observacoes,
              proprietarios: certidaoData.proprietarios || [],
              usufrutuarios: certidaoData.usufrutuarios || []
            })
          }));

          console.log("✅ Dados aplicados automaticamente ao formData!");
        }

        console.log("✅ Dados aplicados ao estado!");
      } else {
        console.log("❌ Nenhuma certidão encontrada para matrícula:", matriculaFormatada);
      }
      
      console.log("🔍 ===== FIM DA BUSCA =====");
    } catch (error) {
      console.error("❌ ERRO AO BUSCAR CERTIDÃO:", error);
      console.error("Stack:", error.stack);
    } finally {
      setBuscandoCertidao(false);
    }
  };

  // NOVA FUNÇÃO: Filtrar observações relevantes
  const filtrarObservacoesRelevantes = (observacoes) => {
    if (!observacoes) return "";

    const topicosRelevantes = [
      "troca de nome",
      "alteração de nome",
      "mudança de nome", 
      "venda de parte",
      "alienação", 
      "usufruto",
      "incomunicabilidade",
      "inalienabilidade",
      "cláusula de",
      "impenhorabilidade" 
    ];

    const linhas = observacoes.split('\n');
    const linhasRelevantes = [];
    let capturando = false;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const linhaLower = linha.toLowerCase();
      
      // Verificar se é um tópico relevante
      const ehRelevante = topicosRelevantes.some(topico => linhaLower.includes(topico));
      
      if (ehRelevante) {
        capturando = true;
        linhasRelevantes.push(linha);
      } else if (capturando) {
        // Continuar capturando até encontrar linha vazia ou novo tópico com •
        if (linha.trim() === '') {
          linhasRelevantes.push(linha);
          // Se próxima linha não começar com continuação (e não for um novo tópico relevante), parar
          if (i + 1 < linhas.length && linhas[i + 1].trim().startsWith('•')) {
            const proximaRelevante = topicosRelevantes.some(t => linhas[i + 1].toLowerCase().includes(t));
            if (!proximaRelevante) {
              capturando = false;
            }
          }
        } else if (linha.trim().startsWith('•')) {
          // Novo bullet - verificar se é relevante
          const novoRelevante = topicosRelevantes.some(t => linhaLower.includes(t));
          if (novoRelevante) {
            linhasRelevantes.push(linha);
          } else {
            capturando = false;
          }
        } else {
          linhasRelevantes.push(linha);
        }
      }
    }

    const resultado = linhasRelevantes.join('\n').trim();
    
    if (!resultado) {
      return "✅ Nenhuma restrição ou observação crítica encontrada na análise da certidão.";
    }
    
    return "📋 INFORMAÇÕES RELEVANTES DA CERTIDÃO:\n\n" + resultado;
  };

  // NOVA FUNÇÃO: Aplicar dados da certidão
  const aplicarDadosCertidao = () => {
    if (!certidaoEncontrada) return;

    // Formatar área
    const areaStr = String(certidaoEncontrada.area_total_ha).replace(/\s*ha\s*$/i, '').trim();
    const areaNum = parseAreaInput(areaStr);

    // Determinar tipo de propriedade
    let tipoPropriedade = "terceiros";
    if (certidaoEncontrada.ehProprietario) {
      tipoPropriedade = certidaoEncontrada.ehCondominio ? "proprio_condominio" : "proprio";
    }

    setFormData(prev => ({
      ...prev,
      nome_imovel: certidaoEncontrada.nome_imovel || prev.nome_imovel,
      // Se registro_antigo for "N/C", não sobrescrever o valor atual se houver
      matricula_anterior: (certidaoEncontrada.registro_antigo && certidaoEncontrada.registro_antigo !== "N/C") 
                          ? certidaoEncontrada.registro_antigo 
                          : prev.matricula_anterior,
      municipio: certidaoEncontrada.municipio || prev.municipio,
      area_total: areaNum > 0 ? areaNum : prev.area_total,
      // Definir automaticamente tipo de propriedade
      tipo_propriedade: tipoPropriedade,
      // Usar as observações encontradas, não concatenar automaticamente
      observacoes: certidaoEncontrada.observacoes || prev.observacoes,
      // APLICAR DADOS COMPLEMENTARES (CND/CCIR/CAR)
      receita_federal: certidaoEncontrada.receita_federal || prev.receita_federal,
      numero_incra: certidaoEncontrada.numero_incra || prev.numero_incra,
      car_numero: certidaoEncontrada.car_numero || prev.car_numero,
      // SALVAR DADOS COMPLETOS DA CERTIDÃO
      dados_analise_certidao: JSON.stringify({
        nome_imovel: certidaoEncontrada.nome_imovel,
        registro_antigo: certidaoEncontrada.registro_antigo,
        municipio: certidaoEncontrada.municipio,
        area_total_ha: certidaoEncontrada.area_total_ha,
        observacoes: certidaoEncontrada.observacoes,
        proprietarios: certidaoEncontrada.proprietarios || [],
        usufrutuarios: certidaoEncontrada.usufrutuarios || []
      })
    }));

    // Atualizar display de área
    if (areaNum > 0) {
      setAreaTotalDisplay(formatAreaBR4(areaNum));
    }

    toast.success("Dados aplicados com sucesso", {
      description: "As informações do imóvel foram atualizadas com os dados da certidão e documentos complementares.",
      duration: 3000,
    });
    };

  const handleMatriculaChange = (value) => {
    // Remove formatação e mantém apenas números
    const numbersOnly = value.replace(/\D/g, '');
    
    // Formata com pontos de milhar durante a digitação
    const formatted = formatarMatricula(numbersOnly);
    
    setFormData(prev => ({ ...prev, matricula_numero: formatted }));
    
    if (!numbersOnly) {
      setCertidaoEncontrada(null);
    }
  };

  const handleMatriculaBlur = () => {
    // Não precisa fazer nada - a formatação já acontece no onChange
  };

  const handleReceitaFederalChange = (e) => {
    const value = e.target.value;
    // Permitir digitação livre, apenas números
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, receita_federal: numbers }));
    if (errors.receita_federal && numbers.length === 8) {
      setErrors(prev => ({ ...prev, receita_federal: false }));
    }
  };

  const handleReceitaFederalBlur = () => {
    const numbers = (formData.receita_federal || '').replace(/\D/g, '');
    if (!numbers) return;

    // Formatar: 0.000.000-0
    let formatted = numbers;
    if (numbers.length >= 1) formatted = numbers.slice(0, 1);
    if (numbers.length >= 2) formatted = numbers.slice(0, 1) + '.' + numbers.slice(1, Math.min(4, numbers.length));
    if (numbers.length >= 5) formatted = numbers.slice(0, 1) + '.' + numbers.slice(1, 4) + '.' + numbers.slice(4, Math.min(7, numbers.length));
    if (numbers.length >= 8) formatted = numbers.slice(0, 1) + '.' + numbers.slice(1, 4) + '.' + numbers.slice(4, 7) + '-' + numbers.slice(7, 8);

    setFormData(prev => ({ ...prev, receita_federal: formatted }));

    // Validação
    if (numbers.length > 0 && numbers.length !== 8) {
      setErrors(prev => ({ ...prev, receita_federal: true }));
      alert("Formato inválido. O NIRF deve conter 8 dígitos no formato 0.000.000-0");
    } else {
      setErrors(prev => ({ ...prev, receita_federal: false }));
    }
  };

  const handleNumeroIncraChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatNumeroIncra(value);
    setFormData(prev => ({ ...prev, numero_incra: formattedValue }));
    if (errors.numero_incra) {
      const digits = formattedValue.replace(/\D/g, '');
      if (digits.length === 13) {
        setErrors(prev => ({ ...prev, numero_incra: false }));
      }
    }
  };
  
  const handleDateChange = (value) => {
    const formattedValue = formatDate(value);
    setFormData(prev => ({ ...prev, data_vencimento_contrato: formattedValue }));
    if (validationError) setValidationError("");
  };

  const handleNomeImovelBlur = () => {
    if (formData.nome_imovel) {
      setFormData(prev => ({ ...prev, nome_imovel: titleCasePt(prev.nome_imovel) }));
    }
  };

  const handleMunicipioBlur = () => {
    if (formData.municipio) {
      setFormData(prev => ({ ...prev, municipio: formatMunicipio(prev.municipio) }));
    }
  };

  const handleAreaBlur = (field) => {
    // Para campos de área dinâmicos, apenas garantir que o valor numérico está armazenado
    if (formData[field] !== undefined && formData[field] !== null && formData[field] !== '') {
      const currentNumValue = typeof formData[field] === 'number' ? formData[field] : parseAreaInput(formData[field]);
      setFormData(prev => ({ ...prev, [field]: currentNumValue }));
    }
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    const digits = value.replace(/\D/g, '');

    if (id === 'receita_federal') {
      const hasError = digits.length > 0 && digits.length !== 8;
      setErrors(prev => ({ ...prev, receita_federal: hasError }));
      if (hasError) {
        alert("Formato inválido. O NIRF deve conter 8 dígitos no formato 0.000.000-0");
      }
    }

    if (id === 'numero_incra') {
      const hasError = digits.length > 0 && digits.length !== 13;
      setErrors(prev => ({ ...prev, numero_incra: hasError }));
      if (hasError) {
        alert("Formato inválido. O número do INCRA deve conter 13 dígitos no formato 000.000.000.000-0");
      }
    }
  };

  // Handlers específicos para Área Total
  const handleAreaTotalChange = (value) => {
    setAreaTotalDisplay(value);
  };

  const handleAreaTotalBlur = () => {
    const numValue = parseAreaInput(areaTotalDisplay);
    setFormData(prev => ({ ...prev, area_total: numValue }));
    setAreaTotalDisplay(formatAreaBR4(numValue)); // Use formatador com 4 casas decimais
    if (validationError) setValidationError("");
  };

  // Handlers específicos para Área Agricultavel
  const handleAreaAgricultavelChange = (value) => {
    setAreaAgricultavelDisplay(value);
  };

  const handleAreaAgricultavelBlur = () => {
    const numValue = parseAreaInput(areaAgricultavelDisplay);
    setFormData(prev => ({ ...prev, area_agricultavel: numValue }));
    setAreaAgricultavelDisplay(formatAreaBR(numValue)); // Re-format for consistent display
    if (validationError) setValidationError("");
  };

  // Handlers para Área de Lavoura
  const handleAreaLavouraChange = (value) => {
    setAreaLavouraDisplay(value);
  };

  const handleAreaLavouraBlur = () => {
    const numValue = parseAreaInput(areaLavouraDisplay);
    setFormData(prev => ({ ...prev, area_lavoura: numValue }));
    setAreaLavouraDisplay(formatAreaBR(numValue));
    if (validationError) setValidationError("");
  };

  // Handlers para Área de Pastagens
  const handleAreaPastagensChange = (value) => {
    setAreaPastagensDisplay(value);
  };

  const handleAreaPastagensBlur = () => {
    const numValue = parseAreaInput(areaPastagensDisplay);
    setFormData(prev => ({ ...prev, area_pastagens: numValue }));
    setAreaPastagensDisplay(formatAreaBR(numValue));
    if (validationError) setValidationError("");
  };

  // Handlers para Área de Reserva Legal
  const handleAreaReservaLegalChange = (value) => {
    setAreaReservaLegalDisplay(value);
  };

  const handleAreaReservaLegalBlur = () => {
    const numValue = parseAreaInput(areaReservaLegalDisplay);
    setFormData(prev => ({ ...prev, area_reserva_legal: numValue }));
    setAreaReservaLegalDisplay(formatAreaBR(numValue));
    if (validationError) setValidationError("");
  };

  // Handlers para Área Outros
  const handleAreaOutrosChange = (value) => {
    setAreaOutrosDisplay(value);
  };

  const handleAreaOutrosBlur = () => {
    const numValue = parseAreaInput(areaOutrosDisplay);
    setFormData(prev => ({ ...prev, area_outros: numValue }));
    setAreaOutrosDisplay(formatAreaBR(numValue));
    if (validationError) setValidationError("");
  };

  // Handlers para Área Cedida
  const handleAreaCedidaChange = (value) => {
    setAreaCedidaDisplay(value);
  };

  const handleAreaCedidaBlur = () => {
    const numValue = parseAreaInput(areaCedidaDisplay);
    setFormData(prev => ({ ...prev, area_cedida: numValue }));
    setAreaCedidaDisplay(formatAreaBR(numValue));
    if (validationError) setValidationError("");
  };

  const getCleanFileName = (url) => {
    if (!url) return "";
    const fileName = url.split('/').pop().split('?')[0];
    // Remover prefixo único (ex: fc77657a8_) antes do nome real do arquivo
    return fileName.includes('_') ? fileName.substring(fileName.indexOf('_') + 1) : fileName;
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (field.startsWith('mapa_') && !file.name.toLowerCase().endsWith('.kml')) {
      toast.error("Por favor, selecione um arquivo KML para o mapa", {
        duration: 3000
      });
      return;
    }

    try {
      setIsUploading(prev => ({ ...prev, [field]: true }));
      
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (result && result.file_url) {
        // Para campos múltiplos (arrays), adicionar à lista
        const currentArray = formData[field] || [];
        handleChange(field, [...currentArray, result.file_url]);
        
        toast.success("Arquivo anexado com sucesso", {
          description: file.name,
          duration: 3000
        });
      } else {
        toast.error("Erro ao obter URL do arquivo", {
          description: "Tente novamente",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo", {
        description: "Verifique sua conexão ou tente novamente",
        duration: 3000
      });
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleRemoveFile = (field, index) => {
    const currentArray = formData[field] || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    handleChange(field, newArray);
    toast.info("Arquivo removido");
  };

  const renderAreaFields = () => {
    const tipo = (formData.tipo_uso || '').toLowerCase().trim();
    
    if (!tipo) return null;

    return (
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200" data-uso-block="true">
        <p className="text-xs font-medium text-slate-500 mb-3">Detalhamento por tipo de uso</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(tipo === 'lavoura' || tipo === 'lavoura + pastagens') && (
            <div>
              <Label htmlFor="area_lavoura" className="text-gray-600 text-sm">Área de Lavoura (ha)</Label>
              <Input
                id="area_lavoura"
                type="text"
                inputMode="decimal"
                value={areaLavouraDisplay}
                onChange={(e) => handleAreaLavouraChange(e.target.value)}
                onBlur={handleAreaLavouraBlur}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="123,45"
                data-ha-formatter-ignore="true"
              />
            </div>
          )}
          
          {(tipo === 'pastagens' || tipo === 'lavoura + pastagens') && (
            <div>
              <Label htmlFor="area_pastagens" className="text-gray-600 text-sm">Área de Pastagens (ha)</Label>
              <Input
                id="area_pastagens"
                type="text"
                inputMode="decimal"
                value={areaPastagensDisplay}
                onChange={(e) => handleAreaPastagensChange(e.target.value)}
                onBlur={handleAreaPastagensBlur}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="123,45"
                data-ha-formatter-ignore="true"
              />
            </div>
          )}
          
          {tipo === 'reserva legal' && (
            <div>
              <Label htmlFor="area_reserva_legal" className="text-gray-600 text-sm">Área de Reserva Legal (ha)</Label>
              <Input
                id="area_reserva_legal"
                type="text"
                inputMode="decimal"
                value={areaReservaLegalDisplay}
                onChange={(e) => handleAreaReservaLegalChange(e.target.value)}
                onBlur={handleAreaReservaLegalBlur}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="123,45"
                data-ha-formatter-ignore="true"
              />
            </div>
          )}
          
          {tipo === 'outros' && (
            <div>
              <Label htmlFor="area_outros" className="text-gray-600 text-sm">Área (ha) – Outros</Label>
              <Input
                id="area_outros"
                type="text"
                inputMode="decimal"
                value={areaOutrosDisplay}
                onChange={(e) => handleAreaOutrosChange(e.target.value)}
                onBlur={handleAreaOutrosBlur}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="123,45"
                data-ha-formatter-ignore="true"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Normalizar áreas antes de validar
    const areaTotal = parseAreaInput(areaTotalDisplay);
    const areaAgricultavel = parseAreaInput(areaAgricultavelDisplay);
    
    // Converter campos de área dinâmicos para números para validação local
    const parsedDynamicAreas = {
      area_lavoura: parseAreaInput(areaLavouraDisplay),
      area_pastagens: parseAreaInput(areaPastagensDisplay),
      area_reserva_legal: parseAreaInput(areaReservaLegalDisplay),
      area_outros: parseAreaInput(areaOutrosDisplay)
    };

    // Validação do NIRF
    const nirfDigits = formData.receita_federal?.replace(/\D/g, '') || '';
    if (formData.receita_federal && nirfDigits.length > 0 && nirfDigits.length !== 8) {
      setValidationError("Formato inválido. O NIRF deve conter 8 dígitos no formato 0.000.000-0");
      setErrors(prev => ({ ...prev, receita_federal: true }));
      return;
    } else if (formData.receita_federal && nirfDigits.length === 8) {
      setErrors(prev => ({ ...prev, receita_federal: false }));
    }

    // Validação do INCRA
    const incraDigits = formData.numero_incra?.replace(/\D/g, '') || '';
    if (formData.numero_incra && incraDigits.length > 0 && incraDigits.length !== 13) {
      setValidationError("Formato inválido. O número do INCRA deve conter 13 dígitos no formato 000.000.000.000-0");
      setErrors(prev => ({ ...prev, numero_incra: true }));
      return;
    } else if (formData.numero_incra && incraDigits.length === 13) {
      setErrors(prev => ({ ...prev, numero_incra: false }));
    }

    // Validação: Tipo de Uso Predominante
    if (!formData.tipo_uso) {
      setValidationError("O campo 'Tipo de Uso Predominante' é obrigatório.");
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'auto',
        block: 'center' 
      });
      return;
    }

    // Validação: Data de vencimento obrigatória para terceiros e condomínio
    if ((formData.tipo_propriedade === 'terceiros' || formData.tipo_propriedade === 'proprio_condominio') && !formData.data_vencimento_contrato) {
      setValidationError("A 'Data de Vencimento do Contrato' é obrigatória para imóveis de terceiros e em condomínio.");
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'auto',
        block: 'center' 
      });
      return;
    }

    // Validação: Formato da data de vencimento
    if (formData.data_vencimento_contrato) {
      const dateNumbers = formData.data_vencimento_contrato.replace(/\D/g, '');
      if (dateNumbers.length !== 8) {
        setValidationError("Formato de data inválido. Use o formato DD/MM/AAAA.");
        document.querySelector('#validation-error')?.scrollIntoView({ 
          behavior: 'auto',
          block: 'center' 
        });
        return;
      }
    }

    // NOVA VALIDAÇÃO: Área Agricultável obrigatória
    if (areaAgricultavel <= 0) { 
      setValidationError("A área agricultavel deve ser maior que zero para imóveis com fins de produção agrícola.");
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'auto',
        block: 'center' 
      });
      return;
    }

    // Validação adicional: Área agricultável não pode ser maior que área total
    if (areaTotal > 0 && areaAgricultavel > areaTotal) { 
      setValidationError("A área agricultavel não pode ser maior que a área total do imóvel.");
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'auto',
        block: 'center' 
      });
      return;
    }

    // Extrair apenas números da matrícula para salvar no banco
    const matriculaNumbers = formData.matricula_numero?.replace(/\D/g, '') || "";

    // Normalize all data before submission
    const normalizedData = {
      nome_imovel: formData.nome_imovel?.trim() || "",
      matricula_numero: matriculaNumbers, // Salva APENAS números no banco
      matricula_anterior: formData.matricula_anterior?.trim() || "",
      receita_federal: formData.receita_federal || "",
      numero_incra: formData.numero_incra?.trim() || "",
      municipio: formatMunicipio(formData.municipio?.trim() || ""),
      tipo_propriedade: formData.tipo_propriedade || "proprio",
      participacao_percentual: formData.participacao_percentual !== "" ? parseFloat(formData.participacao_percentual) : null,
      demais_proprietarios: formData.demais_proprietarios?.trim() || "",
      regime_arrendamento: formData.regime_arrendamento || "",
      area_cedida: formData.area_cedida !== "" ? parseAreaInput(formData.area_cedida) : null,
      data_vencimento_contrato: formData.data_vencimento_contrato || "",
      financiavel_banco: formData.financiavel_banco || "sim",
      observacoes: formData.observacoes?.trim() || "",
      roteiro_acesso: formData.roteiro_acesso?.trim() || "",
      car_numero: formData.car_numero?.trim() || "",
      area_total: areaTotal > 0 ? areaTotal : null, 
      area_agricultavel: areaAgricultavel > 0 ? areaAgricultavel : null, 
      tipo_uso: formData.tipo_uso || "",
      area_lavoura: parsedDynamicAreas.area_lavoura > 0 ? parsedDynamicAreas.area_lavoura : null, 
      area_pastagens: parsedDynamicAreas.area_pastagens > 0 ? parsedDynamicAreas.area_pastagens : null, 
      area_reserva_legal: parsedDynamicAreas.area_reserva_legal > 0 ? parsedDynamicAreas.area_reserva_legal : null, 
      area_outros: parsedDynamicAreas.area_outros > 0 ? parsedDynamicAreas.area_outros : null, 
      financiamentos: (formData.financiamentos || []).filter(f => f.area_financiada || f.cultura_financiada || f.safra).map(f => ({
        area_financiada: typeof f.area_financiada === 'number' ? f.area_financiada : parseAreaInput(f.area_financiada),
        cultura_financiada: f.cultura_financiada || "",
        safra: f.safra || ""
      })),
      avaliacao_mercado: formData.avaliacao_mercado !== "" ? parseFloat(formData.avaliacao_mercado) : null,
      dados_avaliacao: formData.dados_avaliacao?.trim() || "",
      // Garantir que todos os arrays de arquivos sejam salvos
      mapa_area_total_urls: Array.isArray(formData.mapa_area_total_urls) ? formData.mapa_area_total_urls : [],
      mapa_area_agricultavel_urls: Array.isArray(formData.mapa_area_agricultavel_urls) ? formData.mapa_area_agricultavel_urls : [],
      contrato_arrendamento_urls: Array.isArray(formData.contrato_arrendamento_urls) ? formData.contrato_arrendamento_urls : [],
      contrato_arrendamento_vencimento: formData.contrato_arrendamento_vencimento || "",
      carta_anuencia_urls: Array.isArray(formData.carta_anuencia_urls) ? formData.carta_anuencia_urls : [],
      carta_anuencia_vencimento: formData.carta_anuencia_vencimento || "",
      // Incluir dados da certidão se disponíveis
      dados_analise_certidao: formData.dados_analise_certidao || ""
      };

      onSubmit(normalizedData);
  };

  return (
    <div className="space-y-6">
      {/* Header simples */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          {imovel ? "Editar Imóvel Rural" : "Novo Imóvel Rural"}
        </h2>
      </div>

      {/* Alerta de Validação */}
      {validationError && (
        <Alert id="validation-error" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700 text-sm">
            {validationError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identificação do Imóvel */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Identificação do Imóvel
          </h3>
          
          <div className="space-y-4">
            {/* Matrícula - Campo principal */}
            <div>
              <Label htmlFor="matricula_numero" className="text-gray-700 font-medium text-sm flex items-center gap-2">
                Matrícula Nº <span className="text-red-400">*</span>
                {buscandoCertidao && (
                  <span className="text-blue-500 text-xs font-normal flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Buscando...
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="matricula_numero"
                  value={formData.matricula_numero}
                  onChange={(e) => {
                    handleMatriculaChange(e.target.value);
                    if (validationError) setValidationError("");
                  }}
                  onBlur={handleMatriculaBlur}
                  className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20 h-11 text-base flex-1"
                  placeholder="Ex: 13190" 
                  required
                  data-ha-formatter-ignore="true"
                />
                {imovel && formData.matricula_numero && (
                  <Button
                    type="button"
                    onClick={async () => {
                      await buscarCertidaoPorMatricula(formData.matricula_numero.replace(/\D/g, ''));
                    }}
                    disabled={buscandoCertidao}
                    className="mt-1.5 h-11 bg-blue-600 hover:bg-blue-700"
                    title="Buscar dados atualizados da certidão"
                  >
                    {buscandoCertidao ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
              
            {/* Card com dados da certidão encontrada */}
            {certidaoEncontrada && !buscandoCertidao && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800 text-sm">Certidão encontrada</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><span className="text-gray-400">Imóvel:</span> {certidaoEncontrada.nome_imovel}</p>
                      <p><span className="text-gray-400">Município:</span> {certidaoEncontrada.municipio}</p>
                      <p><span className="text-gray-400">Área:</span> {certidaoEncontrada.area_total_ha}</p>
                      <p><span className="text-gray-400">Registro Anterior:</span> {certidaoEncontrada.registro_antigo}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={aplicarDadosCertidao}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-xs h-8"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aplicar
                  </Button>
                </div>

                {/* Proprietários */}
                {certidaoEncontrada.proprietarios && certidaoEncontrada.proprietarios.length > 0 && (
                  <div className="border-t border-green-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-green-800">Proprietários:</p>
                      {certidaoEncontrada.ehProprietario ? (
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                          Cliente é proprietário
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                          Imóvel de terceiros
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {certidaoEncontrada.proprietarios.map((prop, idx) => {
                        const clienteCpfLimpo = clienteSelecionado?.cpf?.replace(/\D/g, '') || '';
                        const propCpfLimpo = prop.cpf?.replace(/\D/g, '') || '';
                        const isCliente = propCpfLimpo === clienteCpfLimpo;

                        return (
                          <div key={idx} className={`rounded p-2 text-xs ${isCliente ? 'bg-green-50 border border-green-200' : 'bg-white'}`}>
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-gray-900">{prop.nome}</p>
                              {isCliente && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded-full">Cliente</span>
                              )}
                            </div>
                            <div className="flex gap-3 text-gray-600 mt-1">
                              <span>{prop.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'}: {formatarCPFouCNPJ(prop.cpf)}</span>
                              <span>Parte: {prop.area_ha}</span>
                              <span>({prop.percentual})</span>
                            </div>
                            {prop.conjuge?.nome && (
                              <p className="text-gray-500 mt-1">Cônjuge: {prop.conjuge.nome}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* Nome do Imóvel */}
            <div>
              <Label htmlFor="nome_imovel" className="text-gray-700 font-medium text-sm">
                Nome do Imóvel <span className="text-red-400">*</span>
              </Label>
              <Input
                id="nome_imovel"
                value={formData.nome_imovel}
                onChange={(e) => {
                  handleChange("nome_imovel", e.target.value);
                  if (validationError) setValidationError("");
                }}
                onBlur={handleNomeImovelBlur}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="Ex.: Fazenda Santa Maria"
                required
                data-ha-formatter-ignore="true"
              />
            </div>

            {/* Grid de campos menores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="matricula_anterior" className="text-gray-600 text-sm">Registro Antigo</Label>
                <Input
                  id="matricula_anterior"
                  value={formData.matricula_anterior}
                  onChange={(e) => handleChange("matricula_anterior", e.target.value)}
                  className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                  data-ha-formatter-ignore="true"
                />
              </div>
              <div>
                <Label htmlFor="municipio" className="text-gray-700 font-medium text-sm">
                  Município <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="municipio"
                  value={formData.municipio}
                  onChange={(e) => {
                    handleChange("municipio", e.target.value);
                    if (validationError) setValidationError("");
                  }}
                  onBlur={handleMunicipioBlur}
                  className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                  placeholder="Cidade/UF"
                  required
                  data-ha-formatter-ignore="true"
                />
              </div>
            </div>

            {/* Dados Legais e Registros */}
            <div className="grid grid-cols-12 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="col-span-12 md:col-span-3">
                <Label htmlFor="receita_federal" className={`text-sm ${errors.receita_federal ? 'text-red-500' : 'text-gray-600'}`}>
                  NIRF/CIB
                </Label>
                <Input
                  id="receita_federal"
                  value={formData.receita_federal}
                  onChange={handleReceitaFederalChange}
                  onBlur={handleReceitaFederalBlur}
                  className={`mt-1.5 ${errors.receita_federal ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-green-500'} focus:ring-green-500/20`}
                  placeholder="0.000.000-0"
                  maxLength={11}
                  data-ha-formatter-ignore="true"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <Label htmlFor="numero_incra" className={`text-sm ${errors.numero_incra ? 'text-red-500' : 'text-gray-600'}`}>
                  Número INCRA
                </Label>
                <Input
                  id="numero_incra"
                  value={formData.numero_incra}
                  onChange={handleNumeroIncraChange}
                  onBlur={handleBlur}
                  className={`mt-1.5 ${errors.numero_incra ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-green-500'} focus:ring-green-500/20`}
                  placeholder="000.000.000.000-0"
                  maxLength={17}
                  data-ha-formatter-ignore="true"
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <Label htmlFor="car_numero" className="text-gray-600 text-sm">CAR Nº</Label>
                <Input
                  id="car_numero"
                  value={formData.car_numero}
                  onChange={(e) => handleChange("car_numero", e.target.value)}
                  className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                  data-ha-formatter-ignore="true"
                />
              </div>
            </div>
            {/* Áreas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div>
                <Label htmlFor="area_total" className="text-gray-600 text-sm">Área Total (ha)</Label>
                <Input
                  id="area_total"
                  type="text"
                  inputMode="decimal"
                  value={areaTotalDisplay}
                  onChange={(e) => handleAreaTotalChange(e.target.value)}
                  onBlur={handleAreaTotalBlur}
                  className="mt-1 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                  placeholder="560,3244"
                  data-ha-formatter-ignore="true"
                />
              </div>
              <div>
                <Label htmlFor="area_agricultavel" className="text-gray-700 font-medium text-sm">
                  Área Agricultável (ha) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="area_agricultavel"
                  type="text"
                  inputMode="decimal"
                  value={areaAgricultavelDisplay}
                  onChange={(e) => handleAreaAgricultavelChange(e.target.value)}
                  onBlur={handleAreaAgricultavelBlur}
                  className="mt-1 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                  placeholder="220,98"
                  required
                  data-ha-formatter-ignore="true"
                />
              </div>
              <div>
                <Label htmlFor="tipo_uso" className="text-gray-700 font-medium text-sm">
                  Tipo de Uso <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.tipo_uso}
                  onValueChange={(value) => {
                    handleChange("tipo_uso", value);
                    if (validationError) setValidationError(""); 
                  }}
                  required
                >
                  <SelectTrigger className="mt-1 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lavoura">Lavoura</SelectItem>
                    <SelectItem value="Pastagens">Pastagens</SelectItem>
                    <SelectItem value="Lavoura + Pastagens">Lavoura + Pastagens</SelectItem>
                    <SelectItem value="Reserva Legal">Reserva Legal</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos de área dinâmicos */}
            {renderAreaFields()}

            <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="roteiro_acesso" className="text-gray-600 text-sm">Roteiro de Acesso</Label>
              {formData.roteiro_acesso && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!formData.roteiro_acesso.trim()) return;
                    setReescrevendoRoteiro(true);
                    try {
                      const resultado = await base44.integrations.Core.InvokeLLM({
                        prompt: `Reescreva o seguinte roteiro de acesso a um imóvel rural em um único parágrafo, de forma clara e bem formatada:

                      REGRAS OBRIGATÓRIAS:
                      1. SEMPRE iniciar a primeira palavra com letra MAIÚSCULA
                      2. Nomes de cidades devem ter inicial maiúscula seguido de barra e sigla do estado em maiúscula. Exemplos: "joviânia-go" → "Joviânia/GO", "goiatuba-go" → "Goiatuba/GO"
                      3. Siglas de rodovias em MAIÚSCULA: GO-320, BR-153, etc.
                      4. Corrigir acentuações e pontuações
                      5. O restante do texto em minúsculas
                      6. Manter o sentido original

                      Roteiro original: "${formData.roteiro_acesso}"

                      Responda APENAS com o roteiro reescrito, sem explicações.`,
                      });
                      if (resultado) {
                        handleChange("roteiro_acesso", resultado.trim());
                      }
                    } catch (error) {
                      console.error("Erro ao reescrever roteiro:", error);
                      alert("Erro ao reescrever o roteiro. Tente novamente.");
                    } finally {
                      setReescrevendoRoteiro(false);
                    }
                  }}
                  disabled={reescrevendoRoteiro}
                  className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  {reescrevendoRoteiro ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Reescrevendo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Reescrever com IA
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="roteiro_acesso"
              value={formData.roteiro_acesso}
              onChange={(e) => handleChange("roteiro_acesso", e.target.value)}
              className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 text-sm"
              rows={2}
              placeholder="Descreva como chegar ao imóvel..."
              data-ha-formatter-ignore="true"
            />
          </div>
        </div>
        </section>

        {/* Financiamento */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Financiamento
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="financiavel_banco"
              checked={formData.financiavel_banco === "sim"}
              onChange={(e) => handleChange("financiavel_banco", e.target.checked ? "sim" : "nao")}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <Label htmlFor="financiavel_banco" className="text-gray-600 text-sm cursor-pointer">
              Financiável pelo Banco
            </Label>
          </div>

          {/* Lista de financiamentos existentes */}
          {formData.financiamentos && formData.financiamentos.length > 0 && (
            <div className="space-y-2 mb-2">
              {formData.financiamentos.map((fin, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-xs text-gray-500">Área Financiada (ha)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={fin.area_financiada_display !== undefined ? fin.area_financiada_display : (fin.area_financiada ? formatAreaBR(fin.area_financiada) : "")}
                        onChange={(e) => {
                          const newFinanciamentos = [...formData.financiamentos];
                          newFinanciamentos[idx] = { ...newFinanciamentos[idx], area_financiada_display: e.target.value };
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                        onBlur={(e) => {
                          const numValue = parseAreaInput(e.target.value);
                          const newFinanciamentos = [...formData.financiamentos];
                          newFinanciamentos[idx] = { 
                            ...newFinanciamentos[idx], 
                            area_financiada: numValue,
                            area_financiada_display: formatAreaBR(numValue)
                          };
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                        className="h-8 text-sm border-gray-200"
                        placeholder="50,00"
                        data-ha-formatter-ignore="true"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs text-gray-500">Cultura Financiada</Label>
                      <Select
                        value={fin.cultura_financiada || ""}
                        onValueChange={(value) => {
                          const newFinanciamentos = [...formData.financiamentos];
                          newFinanciamentos[idx] = { ...newFinanciamentos[idx], cultura_financiada: value };
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm border-gray-200">
                          <SelectValue placeholder="Selecione a cultura" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Soja Sequeiro">Soja Sequeiro</SelectItem>
                          <SelectItem value="Soja Irrigada">Soja Irrigada</SelectItem>
                          <SelectItem value="Milho Sequeiro">Milho Sequeiro</SelectItem>
                          <SelectItem value="Milho Irrigado">Milho Irrigado</SelectItem>
                          <SelectItem value="Sorgo Sequeiro">Sorgo Sequeiro</SelectItem>
                          <SelectItem value="Sorgo Irrigado">Sorgo Irrigado</SelectItem>
                          <SelectItem value="Cana-de-Açúcar Sequeiro">Cana-de-Açúcar Sequeiro</SelectItem>
                          <SelectItem value="Cana-de-Açúcar Irrigada">Cana-de-Açúcar Irrigada</SelectItem>
                          <SelectItem value="Milheto">Milheto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs text-gray-500">Safra</Label>
                      <Input
                        type="text"
                        value={fin.safra || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const newFinanciamentos = [...formData.financiamentos];
                          newFinanciamentos[idx] = { ...newFinanciamentos[idx], safra: value };
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                        onBlur={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          let formatted = "";
                          
                          if (value.length === 8) {
                            // 20252026 → 2025/2026
                            formatted = `${value.slice(0, 4)}/${value.slice(4, 8)}`;
                          } else if (value.length === 4) {
                            // 2626 → 2026/2026
                            formatted = `20${value.slice(0, 2)}/20${value.slice(2, 4)}`;
                          } else if (value.length > 0) {
                            formatted = value;
                          }
                          
                          const newFinanciamentos = [...formData.financiamentos];
                          newFinanciamentos[idx] = { ...newFinanciamentos[idx], safra: formatted };
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                        className="h-8 text-sm border-gray-200"
                        placeholder="2025/2026"
                        maxLength={9}
                        data-ha-formatter-ignore="true"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFinanciamentos = formData.financiamentos.filter((_, i) => i !== idx);
                          handleChange("financiamentos", newFinanciamentos);
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão adicionar financiamento */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const newFinanciamentos = [...(formData.financiamentos || []), { area_financiada: "", cultura_financiada: "", safra: "" }];
              handleChange("financiamentos", newFinanciamentos);
            }}
            className="text-xs h-7 text-gray-500 hover:text-green-600"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar Financiamento
          </Button>
        </section>

        {/* Situação da Propriedade */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            {(() => {
              // Prioridade 1: Se está EDITANDO um imóvel que já tem certidão salva
              if (imovel && imovel.dados_analise_certidao) {
                try {
                  const dadosAnalise = JSON.parse(imovel.dados_analise_certidao);
                  if (dadosAnalise.proprietarios && dadosAnalise.proprietarios.length > 0) {
                    return (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-semibold text-gray-700">Proprietários Registrados na Certidão</h4>
                        </div>
                        <div className="space-y-3">
                          {dadosAnalise.proprietarios.map((prop, idx) => (
                            <div key={idx} className="p-4 bg-blue-50/30 rounded-lg border border-blue-200/50">
                              <div className="mb-3">
                                <span className="text-xs font-medium text-blue-600">Proprietário {idx + 1}</span>
                              </div>
                              
                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-5">
                                  <Label className="text-xs text-gray-500 mb-1 block">Nome Completo</Label>
                                  <Input
                                    value={prop.nome}
                                    readOnly
                                    className="bg-white/60 border-gray-200 text-sm text-gray-900 h-9"
                                  />
                                </div>
                                
                                <div className="col-span-12 md:col-span-3">
                                  <Label className="text-xs text-gray-500 mb-1 block">
                                    {prop.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'}
                                  </Label>
                                  <Input
                                    value={formatarCPFouCNPJ(prop.cpf)}
                                    readOnly
                                    className="bg-white/60 border-gray-200 text-sm text-gray-900 h-9"
                                  />
                                </div>
                                
                                <div className="col-span-6 md:col-span-2">
                                  <Label className="text-xs text-gray-500 mb-1 block">Parte (ha)</Label>
                                  <Input
                                    value={prop.area_ha}
                                    readOnly
                                    className="bg-green-50 border-green-200 text-xs font-semibold text-green-700 text-center h-9"
                                  />
                                </div>
                                
                                <div className="col-span-6 md:col-span-2">
                                  <Label className="text-xs text-gray-500 mb-1 block">Parte (%)</Label>
                                  <Input
                                    value={prop.percentual}
                                    readOnly
                                    className="bg-blue-50 border-blue-200 text-xs font-semibold text-blue-700 text-center h-9"
                                  />
                                </div>
                                
                                {prop.conjuge?.nome && (
                                  <>
                                    <div className="col-span-12 md:col-span-5">
                                      <Label className="text-xs text-purple-600 mb-1 block">Nome do Cônjuge</Label>
                                      <Input
                                        value={prop.conjuge.nome}
                                        readOnly
                                        className="bg-purple-50/50 border-purple-200 text-sm text-gray-900 h-9"
                                      />
                                    </div>
                                    
                                    {prop.conjuge.cpf && (
                                      <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs text-purple-600 mb-1 block">
                                          {prop.conjuge.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'} do Cônjuge
                                        </Label>
                                        <Input
                                          value={formatarCPFouCNPJ(prop.conjuge.cpf)}
                                          readOnly
                                          className="bg-purple-50/50 border-purple-200 text-sm text-gray-900 h-9"
                                        />
                                      </div>
                                    )}
                                    
                                    {prop.regime_casamento && prop.regime_casamento !== "N/C" && (
                                      <div className="col-span-12 md:col-span-4">
                                        <Label className="text-xs text-purple-600 mb-1 block">Regime de Casamento</Label>
                                        <Input
                                          value={prop.regime_casamento}
                                          readOnly
                                          className="bg-purple-50/50 border-purple-200 text-xs text-gray-700 h-9"
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs text-blue-700 flex items-start gap-2">
                            <span>ℹ️</span>
                            <span>
                              <strong>Informações da Análise de Certidão:</strong> Estes dados foram extraídos automaticamente 
                              da certidão do imóvel e representam os proprietários registrados na matrícula.
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                } catch (error) {
                  console.error("Erro ao parsear dados_analise_certidao:", error);
                }
              }
              
              // Prioridade 2: Se encontrou certidão ao DIGITAR matrícula em novo cadastro
              if (!imovel && certidaoEncontrada && certidaoEncontrada.proprietarios && certidaoEncontrada.proprietarios.length > 0) {
                return (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-700">Proprietários Encontrados na Certidão</h4>
                    </div>
                    <div className="space-y-3">
                      {certidaoEncontrada.proprietarios.map((prop, idx) => (
                        <div key={idx} className="p-4 bg-green-50/30 rounded-lg border border-green-200/50">
                          <div className="mb-3">
                            <span className="text-xs font-medium text-green-600">Proprietário {idx + 1}</span>
                          </div>
                          
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs text-gray-500 mb-1 block">Nome Completo</Label>
                              <Input
                                value={prop.nome}
                                readOnly
                                className="bg-white/60 border-gray-200 text-sm text-gray-900 h-9"
                              />
                            </div>
                            
                            <div className="col-span-12 md:col-span-3">
                              <Label className="text-xs text-gray-500 mb-1 block">
                                {prop.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'}
                              </Label>
                              <Input
                                value={formatarCPFouCNPJ(prop.cpf)}
                                readOnly
                                className="bg-white/60 border-gray-200 text-sm text-gray-900 h-9"
                              />
                            </div>
                            
                            <div className="col-span-6 md:col-span-2">
                              <Label className="text-xs text-gray-500 mb-1 block">Parte (ha)</Label>
                              <Input
                                value={prop.area_ha}
                                readOnly
                                className="bg-green-50 border-green-200 text-xs font-semibold text-green-700 text-center h-9"
                              />
                            </div>
                            
                            <div className="col-span-6 md:col-span-2">
                              <Label className="text-xs text-gray-500 mb-1 block">Parte (%)</Label>
                              <Input
                                value={prop.percentual}
                                readOnly
                                className="bg-blue-50 border-blue-200 text-xs font-semibold text-blue-700 text-center h-9"
                              />
                            </div>
                            
                            {prop.conjuge?.nome && (
                              <>
                                <div className="col-span-12 md:col-span-5">
                                  <Label className="text-xs text-purple-600 mb-1 block">Nome do Cônjuge</Label>
                                  <Input
                                    value={prop.conjuge.nome}
                                    readOnly
                                    className="bg-purple-50/50 border-purple-200 text-sm text-gray-900 h-9"
                                  />
                                </div>
                                
                                {prop.conjuge.cpf && (
                                  <div className="col-span-12 md:col-span-3">
                                    <Label className="text-xs text-purple-600 mb-1 block">
                                      {prop.conjuge.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'} do Cônjuge
                                    </Label>
                                    <Input
                                      value={formatarCPFouCNPJ(prop.conjuge.cpf)}
                                      readOnly
                                      className="bg-purple-50/50 border-purple-200 text-sm text-gray-900 h-9"
                                    />
                                  </div>
                                )}
                                
                                {prop.regime_casamento && prop.regime_casamento !== "N/C" && (
                                  <div className="col-span-12 md:col-span-4">
                                    <Label className="text-xs text-purple-600 mb-1 block">Regime de Casamento</Label>
                                    <Input
                                      value={prop.regime_casamento}
                                      readOnly
                                      className="bg-purple-50/50 border-purple-200 text-xs text-gray-700 h-9"
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-700 flex items-start gap-2">
                        <span>ℹ️</span>
                        <span>
                          <strong>Informações da Análise de Certidão:</strong> Estes dados foram extraídos automaticamente 
                          da certidão do imóvel e representam os proprietários registrados na matrícula.
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* NOVO: SEÇÃO DE USUFRUTUÁRIOS - APARECE APÓS PROPRIETÁRIOS */}
            {(() => {
              // Prioridade 1: Se está EDITANDO um imóvel que já tem certidão salva
              if (imovel && imovel.dados_analise_certidao) {
                try {
                  const dadosAnalise = JSON.parse(imovel.dados_analise_certidao);
                  if (dadosAnalise.usufrutuarios && dadosAnalise.usufrutuarios.length > 0) {
                    return (
                      <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-lg shadow-sm">
                        <h4 className="text-base font-bold text-orange-900 mb-4 flex items-center gap-2">
                          ⚠️ Usufrutuário(s) Vigente(s)
                        </h4>
                        <div className="space-y-5">
                          {dadosAnalise.usufrutuarios.map((usu, idx) => (
                            <div key={idx} className="p-4 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                              <div className="mb-3 pb-2 border-b border-orange-200">
                                <h5 className="text-sm font-bold text-orange-800">
                                  Usufrutuário {idx + 1}
                                </h5>
                              </div>
                              
                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-5">
                                  <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                    Nome Completo
                                  </Label>
                                  <Input
                                    value={usu.nome}
                                    readOnly
                                    className="bg-gray-50 border-orange-200 text-sm font-medium text-gray-900"
                                  />
                                </div>
                                
                                {usu.cpf && (
                                  <div className="col-span-12 md:col-span-3">
                                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      {usu.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'}
                                    </Label>
                                    <Input
                                      value={formatarCPFouCNPJ(usu.cpf)}
                                      readOnly
                                      className="bg-gray-50 border-orange-200 text-sm font-medium text-gray-900"
                                    />
                                  </div>
                                )}
                                
                                {usu.tipo_usufruto && (
                                  <div className="col-span-12 md:col-span-2">
                                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Tipo
                                    </Label>
                                    <Input
                                      value={usu.tipo_usufruto}
                                      readOnly
                                      className="bg-orange-50 border-orange-300 text-xs font-bold text-orange-700 text-center"
                                    />
                                  </div>
                                )}
                                
                                {usu.area_ha && (
                                  <div className="col-span-6 md:col-span-2">
                                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Área (ha)
                                    </Label>
                                    <Input
                                      value={usu.area_ha}
                                      readOnly
                                      className="bg-green-50 border-green-300 text-xs font-bold text-green-700 text-center"
                                    />
                                  </div>
                                )}
                                
                                {usu.percentual && (
                                  <div className="col-span-6 md:col-span-2">
                                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Percentual
                                    </Label>
                                    <Input
                                      value={usu.percentual}
                                      readOnly
                                      className="bg-orange-50 border-orange-300 text-xs font-bold text-orange-700 text-center"
                                    />
                                  </div>
                                )}
                                
                                {usu.observacao && (
                                  <div className="col-span-12">
                                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Observações
                                    </Label>
                                    <Textarea
                                      value={usu.observacao}
                                      readOnly
                                      className="bg-gray-50 border-orange-200 text-xs text-gray-700 italic"
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                          <p className="text-xs text-orange-800 font-medium flex items-start gap-2">
                            <span className="text-base">⚠️</span>
                            <span>
                              <strong>Atenção - Usufruto Vigente:</strong> Este imóvel possui usufruto registrado na certidão. 
                              Isso pode restringir a capacidade de uso, disposição e oneração do bem. Consulte um advogado especializado.
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                } catch (error) {
                  console.error("Erro ao parsear dados_analise_certidao (usufrutuários):", error);
                }
              }
              
              // Prioridade 2: Se encontrou certidão ao DIGITAR matrícula em novo cadastro
              if (!imovel && certidaoEncontrada && certidaoEncontrada.usufrutuarios && certidaoEncontrada.usufrutuarios.length > 0) {
                return (
                  <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-lg shadow-sm">
                    <h4 className="text-base font-bold text-orange-900 mb-4 flex items-center gap-2">
                      ⚠️ Usufrutuário(s) Encontrado(s) na Certidão
                    </h4>
                    <div className="space-y-5">
                      {certidaoEncontrada.usufrutuarios.map((usu, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                          <div className="mb-3 pb-2 border-b border-orange-200">
                            <h5 className="text-sm font-bold text-orange-800">
                              Usufrutuário {idx + 1}
                            </h5>
                          </div>
                          
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                Nome Completo
                              </Label>
                              <Input
                                value={usu.nome}
                                readOnly
                                className="bg-gray-50 border-orange-200 text-sm font-medium text-gray-900"
                              />
                            </div>
                            
                            {usu.cpf && (
                              <div className="col-span-12 md:col-span-3">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  {usu.cpf?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF'}
                                </Label>
                                <Input
                                  value={formatarCPFouCNPJ(usu.cpf)}
                                  readOnly
                                  className="bg-gray-50 border-orange-200 text-sm font-medium text-gray-900"
                                />
                              </div>
                            )}
                            
                            {usu.tipo_usufruto && (
                              <div className="col-span-12 md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  Tipo
                                </Label>
                                <Input
                                  value={usu.tipo_usufruto}
                                  readOnly
                                  className="bg-orange-50 border-orange-300 text-xs font-bold text-orange-700 text-center"
                                />
                              </div>
                            )}
                            
                            {usu.area_ha && (
                              <div className="col-span-6 md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  Área (ha)
                                </Label>
                                <Input
                                  value={usu.area_ha}
                                  readOnly
                                  className="bg-green-50 border-green-300 text-xs font-bold text-green-700 text-center"
                                />
                              </div>
                            )}
                            
                            {usu.percentual && (
                              <div className="col-span-6 md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  Percentual
                                </Label>
                                <Input
                                  value={usu.percentual}
                                  readOnly
                                  className="bg-orange-50 border-orange-300 text-xs font-bold text-orange-700 text-center"
                                />
                              </div>
                            )}
                            
                            {usu.observacao && (
                              <div className="col-span-12">
                                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  Observações
                                </Label>
                                <Textarea
                                  value={usu.observacao}
                                  readOnly
                                  className="bg-gray-50 border-orange-200 text-xs text-gray-700 italic"
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                      <p className="text-xs text-orange-800 font-medium flex items-start gap-2">
                        <span className="text-base">✅</span>
                        <span>
                          <strong>Certidão Localizada:</strong> Foi detectado usufruto vigente para a matrícula <strong>{formData.matricula_numero}</strong>. 
                          Recomenda-se consultar um advogado antes de realizar transações com este imóvel.
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            <div className="space-y-4">
              {/* Campos de Terceiros e Condomínio */}
              {(formData.tipo_propriedade === "terceiros" || formData.tipo_propriedade === "proprio_condominio") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700 font-medium">Regime de Arrendamento</Label>
                    <Select
                      value={formData.regime_arrendamento}
                      onValueChange={(value) => handleChange("regime_arrendamento", value)}
                    >
                      <SelectTrigger className="border-green-200 focus:border-green-500">
                        <SelectValue placeholder="Selecione o regime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arrendamento">Arrendamento</SelectItem>
                        <SelectItem value="comodato">Comodato</SelectItem>
                        <SelectItem value="parceria">Parceria</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="area_cedida" className="text-green-700 font-medium">Área Cedida (ha)</Label>
                    <Input
                      id="area_cedida"
                      type="text"
                      inputMode="decimal"
                      value={areaCedidaDisplay}
                      onChange={(e) => handleAreaCedidaChange(e.target.value)}
                      onBlur={handleAreaCedidaBlur}
                      className="border-green-200 focus:border-green-500"
                      placeholder="Ex.: 123,45 ou 123.45"
                      data-ha-formatter-ignore="true"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="data_vencimento_contrato" className="text-green-700 font-medium">
                      Data de Vencimento do Contrato *
                      <span className="text-red-500 ml-1">Obrigatório para {formData.tipo_propriedade === "terceiros" ? "terceiros" : "condomínio"}</span>
                    </Label>
                    <Popover open={popoverVencimentoOpen} onOpenChange={setPopoverVencimentoOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-green-200 focus:border-green-500 hover:bg-green-50 ${
                            !formData.data_vencimento_contrato && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.data_vencimento_contrato || "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b space-y-2">
                          <div className="flex gap-2">
                            <Select
                              value={calendarMonth.getFullYear().toString()}
                              onValueChange={(year) => {
                                const newDate = new Date(calendarMonth);
                                newDate.setFullYear(parseInt(year));
                                setCalendarMonth(newDate);
                              }}
                            >
                              <SelectTrigger className="w-24 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => 2020 + i).map(year => (
                                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={(calendarMonth.getMonth()).toString()}
                              onValueChange={(month) => {
                                const newDate = new Date(calendarMonth);
                                newDate.setMonth(parseInt(month));
                                setCalendarMonth(newDate);
                              }}
                            >
                              <SelectTrigger className="flex-1 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Calendar
                          mode="single"
                          selected={parseDate(formData.data_vencimento_contrato)}
                          month={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          onSelect={(date) => {
                            if (date) {
                              const formatted = format(date, "dd/MM/yyyy", { locale: ptBR });
                              handleDateChange(formatted);
                              if (validationError) setValidationError("");
                              setPopoverVencimentoOpen(false);
                            }
                          }}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">
                      📅 Data de vencimento do contrato de arrendamento/parceria
                    </p>
                  </div>
                </div>
              )}

              </div>
              </section>

        {/* Avaliação */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Avaliação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="avaliacao_mercado" className="text-gray-600 text-sm">Valor de Mercado (R$)</Label>
              <Input
                id="avaliacao_mercado"
                type="number"
                step="0.01"
                value={formData.avaliacao_mercado}
                onChange={(e) => handleChange("avaliacao_mercado", e.target.value)}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20"
                placeholder="1.500.000,00"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="dados_avaliacao" className="text-gray-600 text-sm">Dados da Avaliação</Label>
              <Textarea
                id="dados_avaliacao"
                value={formData.dados_avaliacao}
                onChange={(e) => handleChange("dados_avaliacao", e.target.value)}
                className="mt-1.5 border-gray-200 focus:border-green-500 focus:ring-green-500/20 text-sm"
                placeholder="Metodologia, data, responsável..."
                rows={2}
              />
            </div>
          </div>
        </section>

        {/* Observações */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Observações
          </h3>
          <Textarea
            id="observacoes"
            value={formData.observacoes || ""}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 text-sm"
            placeholder="Anotações adicionais sobre o imóvel (opcional)"
            rows={3}
            maxLength={1000}
            data-ha-formatter-ignore="true"
          />
        </section>

        {/* Mapas e Documentos */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Documentos
          </h3>

          {/* Mapas KML */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Mapa Área Total */}
            <div>
              <Label className="text-slate-700 text-xs font-medium mb-2 block">Mapa Área Total (KML)</Label>
              <div className="space-y-1.5">
                {formData.mapa_area_total_urls && formData.mapa_area_total_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <a href={url} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1.5 text-slate-600 hover:text-green-600 flex-1 truncate text-xs">
                      <Map className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{getCleanFileName(url)}</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('mapa_area_total_urls', idx)}
                      className="h-5 w-5 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!formData.mapa_area_total_urls || formData.mapa_area_total_urls.length < 5) && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {isUploading.mapa_area_total_urls ? 'Enviando...' : 'Adicionar arquivo'}
                    </span>
                    <input
                      type="file"
                      accept=".kml"
                      onChange={(e) => handleFileUpload('mapa_area_total_urls', e.target.files[0])}
                      disabled={isUploading.mapa_area_total_urls}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Mapa Área Agricultável */}
            <div>
              <Label className="text-slate-700 text-xs font-medium mb-2 block">Mapa Área Agricultável (KML)</Label>
              <div className="space-y-1.5">
                {formData.mapa_area_agricultavel_urls && formData.mapa_area_agricultavel_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <a href={url} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1.5 text-slate-600 hover:text-green-600 flex-1 truncate text-xs">
                      <Map className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{getCleanFileName(url)}</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('mapa_area_agricultavel_urls', idx)}
                      className="h-5 w-5 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!formData.mapa_area_agricultavel_urls || formData.mapa_area_agricultavel_urls.length < 5) && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {isUploading.mapa_area_agricultavel_urls ? 'Enviando...' : 'Adicionar arquivo'}
                    </span>
                    <input
                      type="file"
                      accept=".kml"
                      onChange={(e) => handleFileUpload('mapa_area_agricultavel_urls', e.target.files[0])}
                      disabled={isUploading.mapa_area_agricultavel_urls}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Contratos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contrato de Arrendamento */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-700 text-xs font-medium">Contrato de Arrendamento</Label>
                <Popover open={popoverArrendamentoOpen} onOpenChange={setPopoverArrendamentoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-slate-200 text-[10px] h-6 px-2"
                      title="Vencimento"
                    >
                      <CalendarIcon className="mr-1 h-2.5 w-2.5" />
                      {formData.contrato_arrendamento_vencimento ? 
                        format(new Date(formData.contrato_arrendamento_vencimento), "dd/MM/yy", { locale: ptBR }) : 
                        "Data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={calendarMonth.getFullYear().toString()}
                          onValueChange={(year) => {
                            const newDate = new Date(calendarMonth);
                            newDate.setFullYear(parseInt(year));
                            setCalendarMonth(newDate);
                          }}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => 2020 + i).map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={(calendarMonth.getMonth()).toString()}
                          onValueChange={(month) => {
                            const newDate = new Date(calendarMonth);
                            newDate.setMonth(parseInt(month));
                            setCalendarMonth(newDate);
                          }}
                        >
                          <SelectTrigger className="flex-1 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                              'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Calendar
                      mode="single"
                      selected={formData.contrato_arrendamento_vencimento ? new Date(formData.contrato_arrendamento_vencimento) : undefined}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (date) {
                          handleChange('contrato_arrendamento_vencimento', format(date, "yyyy-MM-dd"));
                          setPopoverArrendamentoOpen(false);
                        }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                {formData.contrato_arrendamento_urls && formData.contrato_arrendamento_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <a href={url} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 flex-1 truncate text-xs">
                      <FileIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{getCleanFileName(url)}</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('contrato_arrendamento_urls', idx)}
                      className="h-5 w-5 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!formData.contrato_arrendamento_urls || formData.contrato_arrendamento_urls.length < 5) && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {isUploading.contrato_arrendamento_urls ? 'Enviando...' : 'Anexar'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload('contrato_arrendamento_urls', e.target.files[0])}
                      disabled={isUploading.contrato_arrendamento_urls}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Carta de Anuência */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-700 text-xs font-medium">Carta de Anuência</Label>
                <Popover open={popoverAnuenciaOpen} onOpenChange={setPopoverAnuenciaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-slate-200 text-[10px] h-6 px-2"
                      title="Vencimento"
                    >
                      <CalendarIcon className="mr-1 h-2.5 w-2.5" />
                      {formData.carta_anuencia_vencimento ? 
                        format(new Date(formData.carta_anuencia_vencimento), "dd/MM/yy", { locale: ptBR }) : 
                        "Data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={calendarMonth.getFullYear().toString()}
                          onValueChange={(year) => {
                            const newDate = new Date(calendarMonth);
                            newDate.setFullYear(parseInt(year));
                            setCalendarMonth(newDate);
                          }}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => 2020 + i).map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={(calendarMonth.getMonth()).toString()}
                          onValueChange={(month) => {
                            const newDate = new Date(calendarMonth);
                            newDate.setMonth(parseInt(month));
                            setCalendarMonth(newDate);
                          }}
                        >
                          <SelectTrigger className="flex-1 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                              'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Calendar
                      mode="single"
                      selected={formData.carta_anuencia_vencimento ? new Date(formData.carta_anuencia_vencimento) : undefined}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (date) {
                          handleChange('carta_anuencia_vencimento', format(date, "yyyy-MM-dd"));
                          setPopoverAnuenciaOpen(false);
                        }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                {formData.carta_anuencia_urls && formData.carta_anuencia_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <a href={url} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 flex-1 truncate text-xs">
                      <FileIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{getCleanFileName(url)}</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('carta_anuencia_urls', idx)}
                      className="h-5 w-5 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!formData.carta_anuencia_urls || formData.carta_anuencia_urls.length < 5) && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {isUploading.carta_anuencia_urls ? 'Enviando...' : 'Anexar'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload('carta_anuencia_urls', e.target.files[0])}
                      disabled={isUploading.carta_anuencia_urls}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 shadow-sm px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {imovel ? "Salvar Alterações" : "Cadastrar Imóvel"}
          </Button>
        </div>
      </form>
    </div>
  );
}