import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Download, Copy, Save, Search, Eye, FolderOpen, Trash2, RefreshCw, X, ChevronDown, ChevronUp, Users, AlertTriangle } from "lucide-react";
import DocumentosComplementares from "../components/analise/DocumentosComplementares";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AnaliseCertidoes() {
  const [arquivo, setArquivo] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [statusProcessamento, setStatusProcessamento] = useState("");
  
  const [imoveisSalvos, setImoveisSalvos] = useState([]);
  const [buscaImovel, setBuscaImovel] = useState("");
  const [carregandoImoveis, setCarregandoImoveis] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [imovelVisualizandoId, setImovelVisualizandoId] = useState(null); // Mudou para ID
  const [excluindo, setExcluindo] = useState(false);
  const [matriculaEditavel, setMatriculaEditavel] = useState("");

  useEffect(() => {
    carregarImoveisSalvos();
  }, []);

  useEffect(() => {
    if (resultado && resultado.matricula) {
      setMatriculaEditavel(formatarMatricula(resultado.matricula));
    }
  }, [resultado]);

  const carregarImoveisSalvos = async () => {
    try {
      setCarregandoImoveis(true);
      const imoveis = await base44.entities.Imovel.list("-created_date", 100);
      
      // Filtrar imóveis com análise de certidão
      const imoveisComAnalise = (imoveis || []).filter(imovel => 
        imovel.dados_analise_certidao
      );
      
      // Função para normalizar matrícula (remove pontos e espaços)
      const normalizarMatricula = (matricula) => {
        if (!matricula) return '';
        return String(matricula).replace(/\D/g, '');
      };
      
      // Agrupar por matrícula normalizada
      const imoveisUnicos = {};
      imoveisComAnalise.forEach(imovel => {
        const matriculaNormalizada = normalizarMatricula(imovel.matricula_numero);
        if (!matriculaNormalizada) return;
        
        const atual = imoveisUnicos[matriculaNormalizada];
        
        // Prioridade 1: Imóvel cadastrado (não é do sistema de análise)
        // Prioridade 2: Mais recente
        if (!atual) {
          imoveisUnicos[matriculaNormalizada] = imovel;
        } else {
          const atualEhCadastrado = atual.cliente_id !== "sistema_analise_certidao";
          const novoEhCadastrado = imovel.cliente_id !== "sistema_analise_certidao";
          
          if (novoEhCadastrado && !atualEhCadastrado) {
            // Novo é cadastrado e atual não é → substituir
            imoveisUnicos[matriculaNormalizada] = imovel;
          } else if (novoEhCadastrado === atualEhCadastrado) {
            // Ambos são cadastrados ou ambos são da análise → manter o mais recente
            if (new Date(imovel.created_date) > new Date(atual.created_date)) {
              imoveisUnicos[matriculaNormalizada] = imovel;
            }
          }
          // Se atual é cadastrado e novo não é → manter atual (não faz nada)
        }
      });
      
      // Converter para array e ordenar por data
      const resultado = Object.values(imoveisUnicos).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      setImoveisSalvos(resultado);
    } catch (error) {
      console.error("Erro ao carregar imóveis:", error);
    } finally {
      setCarregandoImoveis(false);
    }
  };

  const formatarMatricula = (valor) => {
    if (!valor) return "";
    const numbers = String(valor).replace(/\D/g, ''); // Remove todos os não-dígitos
    if (!numbers) return "";
    // Adiciona pontos de milhar
    return new Intl.NumberFormat('pt-BR').format(parseInt(numbers, 10));
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatarArea = (area) => {
    if (!area) return "";
    const areaStr = String(area);
    let areaLimpa = areaStr.replace(/\s*ha\s*$/i, '').trim();
    areaLimpa = areaLimpa.replace('.', ',');
    const partes = areaLimpa.split(',');
    if (partes.length === 2) {
      partes[0] = partes[0].replace(/\./g, '');
      areaLimpa = partes.join(',');
    }
    return areaLimpa + ' ha';
  };

  const formatarObservacoes = (texto) => {
    if (!texto) return "";
    
    // REMOVER formatação automática que está quebrando o texto
    // Apenas retornar o texto como veio da IA
    return texto;
  };

  const handleFileChange = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Verificar apenas o tipo MIME, não o nome do arquivo
      if (file.type !== 'application/pdf') {
        toast.error("Por favor, selecione apenas arquivos PDF");
        e.target.value = '';
        return;
      }
      // Limite da API: 10MB
      if (file.size > 10 * 1024 * 1024) {
        const tamanhoMB = (file.size / 1024 / 1024).toFixed(1);
        toast.error(`Arquivo muito grande (${tamanhoMB}MB)`, {
          description: "O limite é 10MB. Abra o PDF no Chrome/Edge, use Ctrl+P e 'Salvar como PDF' para reduzir o tamanho.",
          duration: 5000
        });
        e.target.value = '';
        return;
      }
      setArquivo(file);
      setResultado(null);
      setErro(null);
      setStatusProcessamento("");
      setMatriculaEditavel("");
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo");
    }
  };

  const handleAnalisar = async () => {
    if (!arquivo) {
      toast.error("Por favor, selecione uma certidão para análise");
      return;
    }

    setProcessando(true);
    setErro(null);
    setResultado(null);
    setStatusProcessamento("Preparando arquivo...");

    try {
      const jsonSchema = {
        type: "object",
        properties: {
          nome_imovel: { type: "string", description: "Nome ATUAL/FINAL do imóvel. IMPORTANTE: Remover prefixos como 'Gleba XX, denominada', 'Gleba XX -', 'Parte da', etc. Extrair APENAS o nome próprio da fazenda/propriedade." },
          matricula: { type: "string", description: "Número da matrícula do imóvel" },
          registro_antigo: { type: "string", description: "Registro antigo/transcrito ou N/C" },
          municipio: { type: "string", description: "Cidade/município com UF (ex: Rio Verde/GO)" },
          area_total_ha: { type: "string", description: "Área total em hectares com vírgula como separador decimal (ex: 216,27 ou 216,2700). SEMPRE incluir ' ha' no final" },
          data_emissao_certidao: { type: "string", description: "Data de emissão da certidão no formato DD/MM/AAAA" },
          proprietarios: {
            type: "array",
            description: "Lista APENAS dos PROPRIETÁRIOS TITULARES registrados na matrícula. NUNCA incluir cônjuges aqui - cônjuges vão no campo 'conjuge' dentro do proprietário. Se um proprietário for casado em comunhão, incluir dados do cônjuge no campo 'conjuge', MAS NÃO criar uma entrada separada de proprietário para o cônjuge. SEMPRE incluir area_ha e percentual para cada proprietário TITULAR.",
            items: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Nome completo do proprietário TITULAR (não incluir cônjuge aqui)" },
                cpf: { type: "string", description: "CPF com apenas números (11 dígitos)" },
                area_ha: { type: "string", description: "Área do proprietário em hectares com vírgula (ex: 560,3244 ha). OBRIGATÓRIO - se área total e há apenas 1 proprietário = área total; se múltiplos, dividir igualmente" },
                percentual: { type: "string", description: "Percentual de propriedade (ex: 100% ou 50%). OBRIGATÓRIO - se 1 proprietário = 100%; se múltiplos, dividir igualmente" },
                conjuge: {
                  type: "object",
                  description: "Dados do cônjuge (SE o proprietário for casado). Cônjuge NÃO é proprietário separado!",
                  properties: {
                    nome: { type: "string" },
                    cpf: { type: "string", description: "CPF com apenas números (11 dígitos)" }
                  }
                },
                regime_casamento: { 
                  type: "string", 
                  description: "SEMPRE INFORMAR quando constar na certidão. Exemplos: 'Comunhão Parcial de Bens', 'Comunhão Universal de Bens', 'Separação Total de Bens', 'Viúva', 'Viúvo', 'Desquitada', 'Desquitado', 'Divorciada', 'Divorciado', 'Solteira', 'Solteiro', 'Declara não possuir união estável'. Se não constar: 'N/C'" 
                }
              },
              required: ["nome", "cpf", "area_ha", "percentual", "regime_casamento"]
            }
          },
          usufrutuarios: {
            type: "array",
            description: "Lista de USUFRUTUÁRIOS VIGENTES (que ainda NÃO foram baixados/cancelados). Se não houver usufruto vigente, deixar array vazio []",
            items: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Nome completo do usufrutuário" },
                cpf: { type: "string", description: "CPF com apenas números (11 dígitos)" },
                tipo_usufruto: { type: "string", description: "Tipo: vitalício, temporário, etc." },
                area_ha: { type: "string", description: "Área sob usufruto em hectares (se especificado)" },
                percentual: { type: "string", description: "Percentual do imóvel sob usufruto (se especificado)" },
                observacao: { type: "string", description: "Detalhes adicionais sobre o usufruto" }
              },
              required: ["nome", "tipo_usufruto"]
            }
          },
          tipo_titularidade: { type: "string", description: "Tipo do título atual" },
          data_titularidade: { type: "string", description: "Data no formato DD/MM/AAAA" },
          observacoes: { type: "string", description: "CAMPO OBRIGATÓRIO E COMPLETO. Se houver hipotecas/gravames vigentes, DEVE INICIAR com Resumo Executivo mostrando graus vigentes e próximo grau disponível, seguido do detalhamento completo de TODAS as hipotecas. Sempre deixar 1 linha em branco entre cada hipoteca detalhada." }
        },
        required: ["nome_imovel", "matricula", "municipio", "area_total_ha", "proprietarios"]
      };

      setStatusProcessamento("📤 Fazendo upload do arquivo...");
      
      // Renomear arquivo para evitar problemas com caracteres especiais
      const nomeOriginal = arquivo.name;
      const nomeLimpo = nomeOriginal
        .replace(/[^a-zA-Z0-9.-]/g, '') // Remove caracteres especiais exceto . e -
        .replace(/\.+/g, '.') // Remove pontos duplicados
        .replace(/^[.-]+/, '') // Remove . ou - no início
        .slice(0, 100); // Limita tamanho
      
      const arquivoRenomeado = new File([arquivo], nomeLimpo, { type: arquivo.type });
      
      const uploadResult = await base44.integrations.Core.UploadFile({ file: arquivoRenomeado });
      
      if (!uploadResult || !uploadResult.file_url) {
        throw new Error("Falha no upload: URL do arquivo não foi retornada");
      }
      
      const fileUrl = uploadResult.file_url;

      // ESTRATÉGIA SIMPLIFICADA: Usar diretamente o LLM com o arquivo
      // Isso evita erros de conversão de PDF que aconteciam na estratégia 1
      setStatusProcessamento("🤖 Analisando certidão com IA (pode levar 30-60s)...");
      
      const prompt = `Você é um especialista em análise de certidões de imóveis rurais brasileiros.

Analise o PDF da certidão anexada e extraia TODAS as informações relevantes.

🏡 IMPORTANTE - NOME DO IMÓVEL:
Para o campo "nome_imovel", extraia APENAS o nome próprio da fazenda/propriedade.
REMOVA qualquer prefixo como:
- "Gleba 01, denominada" → extrair só o que vem depois
- "Gleba 02 -" → extrair só o que vem depois
- "Parte da" → extrair só o que vem depois
- Qualquer numeração de gleba

Exemplo CORRETO:
❌ "Gleba 01, denominada Fazenda Reunidas do Pontal"
✅ "Fazenda Reunidas do Pontal"

🚨🚨🚨 ATENÇÃO CRÍTICA - LEIA COM CUIDADO 🚨🚨🚨

O campo "observacoes" é OBRIGATÓRIO e DEVE seguir EXATAMENTE o formato especificado.

Se houver hipotecas/cédulas/gravames VIGENTES (não baixados), você DEVE OBRIGATORIAMENTE:

✅ CRIAR UM RESUMO EXECUTIVO NO INÍCIO
✅ DETALHAR TODAS AS HIPOTECAS VIGENTES
✅ DEIXAR 1 LINHA EM BRANCO ENTRE CADA HIPOTECA


═══════════════════════════════════════════════════════════
📋 FORMATO OBRIGATÓRIO DO CAMPO "observacoes"
═══════════════════════════════════════════════════════════

Resumo Executivo:

Hipotecas Vigentes: Do 13º ao 24º grau (12 graus de hipoteca vigentes)
Próximo Grau Disponível: VIGÉSIMO QUINTO (25º) GRAU
Credor Principal: BANCO DO BRASIL S/A


DETALHAMENTO DAS HIPOTECAS E GRAVAMES:

1. Hipoteca de 13º Grau - R-13-13.329

Data da Contratação: 22/05/2023
Vencimento Final: 20/12/2024
Credor: BANCO DO BRASIL S/A
Devedor/Financiado: FLAVIO FERNANDES COSTA
Valor da Operação: R$ 1.639.242,00

2. Cédula de Crédito Bancário - R-14-13.540

Data da Contratação: 15/06/2023
Vencimento Final: 30/01/2025
Credor: BANCO DO BRASIL S/A
Devedor/Financiado: FLAVIO FERNANDES COSTA
Valor da Operação: R$ 890.000,00


OUTRAS INFORMAÇÕES:

- Georreferenciamento certificado pelo INCRA
- Outras averbações relevantes

═══════════════════════════════════════════════════════════


🔴 REGRAS OBRIGATÓRIAS:

1. Se houver 2 OU MAIS hipotecas/gravames vigentes → CRIAR RESUMO EXECUTIVO
2. Resumo deve ter: Hipotecas Vigentes (do X ao Y grau), Próximo Grau Disponível, Credor Principal
3. SEMPRE escrever próximo grau POR EXTENSO (ex: VIGÉSIMO QUINTO)
4. Deixar 1 LINHA EM BRANCO entre cada hipoteca detalhada
5. Valores com separador de milhar (R$ 1.639.242,00)

🚨 IMPORTANTE: NÃO omita o Resumo Executivo! É OBRIGATÓRIO quando há múltiplas hipotecas vigentes!`;

      const resultadoLLM = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [fileUrl],
        response_json_schema: jsonSchema
      });

      if (resultadoLLM && typeof resultadoLLM === 'object') {
        // Verificar se tem os campos mínimos necessários
        if (resultadoLLM.nome_imovel || resultadoLLM.matricula || resultadoLLM.municipio) {
          setResultado(resultadoLLM);
          setMatriculaEditavel(formatarMatricula(resultadoLLM.matricula));
          setStatusProcessamento("");
          return;
        }
      }
      
      // Se chegou aqui, a análise não retornou dados válidos
      throw new Error("A IA não conseguiu extrair os dados da certidão. Isso pode acontecer com PDFs escaneados, protegidos ou de baixa qualidade.");
      
    } catch (error) {
      console.error("❌ Erro completo:", error);
      console.error("Stack trace:", error?.stack);
      
      let mensagemErro = "Erro ao analisar a certidão. Tente novamente.";
      
      if (error?.message) {
        mensagemErro = error.message;
      }
      
      // Mensagem de ajuda mais amigável
      if (mensagemErro.includes("não conseguiu extrair") || mensagemErro.includes("não retornou")) {
        mensagemErro = "Não foi possível analisar este PDF. O arquivo pode estar escaneado, protegido por senha, ou em formato não suportado.\n\n💡 Dica: Abra o PDF no Chrome ou Edge, vá em Imprimir (Ctrl+P) e salve como PDF novamente. Isso geralmente resolve o problema.";
      }
      
      toast.error("Erro na análise", {
        description: mensagemErro,
        duration: 5000
      });
      
      setErro(mensagemErro);
    } finally {
      setProcessando(false);
      setStatusProcessamento("");
    }
  };

  const handleSalvarImovel = async () => {
    if (!resultado) return;

    // Validar se matrícula foi preenchida
    if (!matriculaEditavel || !matriculaEditavel.trim()) {
      toast.error("Por favor, preencha o número da matrícula antes de salvar");
      return;
    }

    try {
      setSalvando(true);
      
      // Usar a matrícula editável (já formatada)
      const matriculaParaSalvar = matriculaEditavel;
      
      // ✅ GARANTIR que TODOS os dados sejam salvos
      const dadosCompletosAnalise = {
        ...resultado,
        matricula: matriculaParaSalvar
      };
      
      console.log("💾 Salvando dados completos:", dadosCompletosAnalise);
      console.log("👥 Proprietários a salvar:", dadosCompletosAnalise.proprietarios);
      console.log("👥 Usufrutuários a salvar:", dadosCompletosAnalise.usufrutuarios);
      
      const imoveisExistentes = await base44.entities.Imovel.filter({ 
        matricula_numero: matriculaParaSalvar 
      });

      // Preparar área para salvar
      const areaStr = String(resultado.area_total_ha)
        .replace(/\s*ha\s*$/i, '')
        .replace(/\./g, '')
        .replace(',', '.');
      
      // ✅ Dados completos para salvar/atualizar
      const dadosParaSalvar = {
        nome_imovel: resultado.nome_imovel,
        matricula_numero: matriculaParaSalvar,
        matricula_anterior: resultado.registro_antigo !== "N/C" ? resultado.registro_antigo : "",
        municipio: resultado.municipio,
        area_total: parseFloat(areaStr) || 0,
        observacoes: formatarObservacoes(resultado.observacoes || ""),
        // ✅ CRÍTICO: Salvar JSON completo com TODOS os dados
        dados_analise_certidao: JSON.stringify(dadosCompletosAnalise)
      };

      if (imoveisExistentes && imoveisExistentes.length > 0) {
        const confirmar = window.confirm(
          "⚠️ Já existe um imóvel cadastrado com a matrícula " + matriculaParaSalvar + ".\n\nDeseja substituir os dados existentes?"
        );
        
        if (!confirmar) {
          setSalvando(false);
          return;
        }

        const imovelExistente = imoveisExistentes[0];
        await base44.entities.Imovel.update(imovelExistente.id, dadosParaSalvar);

        console.log("✅ Imóvel atualizado com ID:", imovelExistente.id);
        toast.success("Imóvel atualizado com sucesso");
      } else {
        // Adicionar campos obrigatórios apenas para criação
        const dadosParaCriar = {
          ...dadosParaSalvar,
          cliente_id: "sistema_analise_certidao",
          tipo_propriedade: "proprio",
          tipo_uso: "Lavoura"
        };
        
        const novoImovel = await base44.entities.Imovel.create(dadosParaCriar);
        
        console.log("✅ Novo imóvel criado com ID:", novoImovel.id);
        toast.success("Imóvel salvo com sucesso");
      }

      // Recarregar lista de imóveis
      await carregarImoveisSalvos();
      
    } catch (error) {
      console.error("❌ Erro ao salvar imóvel:", error);
      toast.error("Erro ao salvar imóvel", {
        description: error.message,
        duration: 4000
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleDetalhes = (imovelId) => {
    if (imovelVisualizandoId === imovelId) {
      setImovelVisualizandoId(null);
    } else {
      setImovelVisualizandoId(imovelId);
    }
  };

  const handleExcluirImovel = async (imovelId) => {
    if (!window.confirm("⚠️ Tem certeza que deseja excluir este imóvel?\n\nEsta ação não pode ser desfeita.")) {
      return;
    }

    try {
      setExcluindo(true);
      await base44.entities.Imovel.delete(imovelId);
      toast.success("Imóvel excluído com sucesso");
      setImovelVisualizandoId(null);
      await carregarImoveisSalvos();
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
      toast.error("Erro ao excluir imóvel. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  };

  const handleReanalisar = () => {
    if (!window.confirm("📄 Deseja fazer uma nova análise para este imóvel?\n\nIsso irá substituir os dados atuais com uma nova análise de certidão.")) {
      return;
    }

    setImovelVisualizandoId(null); // Limpar o ID do imóvel visualizado
    const tabTrigger = document.querySelector('[data-state="inactive"][value="analise"]');
    if (tabTrigger) {
      tabTrigger.click();
    }
    
    setArquivo(null);
    setResultado(null);
    setErro(null);
    setStatusProcessamento("");
    setMatriculaEditavel("");
    
    const input = document.getElementById('file-upload');
    if (input) input.value = '';
    
    toast.info("Selecione o novo arquivo PDF da certidão para reanalisar");
  };

  const handleCopiarTexto = () => {
    if (!resultado) return;

    let texto = "📋 ANÁLISE DE CERTIDÃO DE IMÓVEL\n";
    texto += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    texto += "🏡 NOME DO IMÓVEL: " + resultado.nome_imovel + "\n\n";
    texto += "📄 MATRÍCULA Nº: " + matriculaEditavel + "\n"; // Use matriculaEditavel
    texto += "📋 REGISTRO ANTIGO: " + resultado.registro_antigo + "\n";
    texto += "📍 MUNICÍPIO: " + resultado.municipio + "\n";
    texto += "📏 ÁREA TOTAL: " + formatarArea(resultado.area_total_ha) + "\n";
    if (resultado.data_emissao_certidao) {
      texto += "📅 EMISSÃO DA CERTIDÃO: " + resultado.data_emissao_certidao + "\n";
    }
    texto += "\n";
    
    texto += "👤 PROPRIETÁRIO(S):\n";
    resultado.proprietarios?.forEach((prop, idx) => {
      texto += "\n   " + (idx + 1) + ". " + prop.nome + "\n";
      texto += "      CPF: " + formatarCPF(prop.cpf) + "\n";
      if (prop.area_ha && prop.area_ha !== "N/C") texto += "      Área: " + formatarArea(prop.area_ha) + "\n";
      if (prop.percentual && prop.percentual !== "N/C") texto += "      Percentual: " + prop.percentual + "\n";
      
      if (prop.conjuge?.nome) {
        texto += "      Cônjuge: " + prop.conjuge.nome;
        if (prop.conjuge.cpf) texto += " - CPF: " + formatarCPF(prop.conjuge.cpf);
        texto += "\n";
      }
      if (prop.regime_casamento && prop.regime_casamento !== "N/C") {
        texto += "      Regime: " + prop.regime_casamento + "\n";
      }
    });

    if (resultado.usufrutuarios && resultado.usufrutuarios.length > 0) {
      texto += "\n⚠️ USUFRUTUÁRIO(S) VIGENTE(S):\n";
      resultado.usufrutuarios.forEach((usu, idx) => {
        texto += "\n   " + (idx + 1) + ". " + usu.nome + "\n";
        if (usu.cpf) texto += "      CPF: " + formatarCPF(usu.cpf) + "\n";
        texto += "      Tipo: " + usu.tipo_usufruto + "\n";
        if (usu.area_ha) texto += "      Área: " + formatarArea(usu.area_ha) + "\n";
        if (usu.percentual) texto += "      Percentual: " + usu.percentual + "\n";
        if (usu.observacao) texto += "      Observação: " + usu.observacao + "\n";
      });
    }
    
    texto += "\n📜 TIPO DE TITULARIDADE: " + resultado.tipo_titularidade + "\n";
    texto += "📅 DATA DA TITULARIDADE: " + resultado.data_titularidade + "\n\n";
    texto += "📝 OBSERVAÇÕES:\n" + formatarObservacoes(resultado.observacoes) + "\n";

    navigator.clipboard.writeText(texto);
    toast.success("Análise copiada para a área de transferência");
  };

  const handleBaixarRelatorio = () => {
    if (!resultado) return;

    // Criar HTML formatado profissionalmente
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Análise de Certidão - ${matriculaEditavel || resultado.matricula}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 15mm 15mm 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: white;
    }
    
    /* Cabeçalho */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 3px solid #2d6a4f;
      margin-bottom: 20px;
    }
    
    .header-logo {
      width: 50px;
      height: 50px;
    }
    
    .header-content {
      flex: 1;
      text-align: center;
    }
    
    .header-title {
      font-size: 16pt;
      font-weight: bold;
      color: #2d6a4f;
      margin-bottom: 2px;
    }
    
    .header-subtitle {
      font-size: 10pt;
      color: #555;
      font-style: italic;
    }
    
    /* Rodapé */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      border-top: 2px solid #2d6a4f;
      padding: 10px 15mm;
      font-size: 9pt;
      color: #666;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
    }
    
    .footer-left {
      text-align: left;
    }
    
    .footer-right {
      text-align: right;
    }
    
    /* Conteúdo principal */
    .container {
      padding-bottom: 70px;
    }
    
    .document-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      color: #2d6a4f;
      margin: 15px 0 25px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #2d6a4f;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #95d5b2;
      text-transform: uppercase;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-item {
      background: #f8f9fa;
      padding: 10px;
      border-left: 3px solid #2d6a4f;
    }
    
    .info-label {
      font-weight: bold;
      color: #2d6a4f;
      font-size: 10pt;
      margin-bottom: 3px;
    }
    
    .info-value {
      font-size: 11pt;
      color: #000;
    }
    
    .proprietario-card {
      background: #f1f8f4;
      border: 1px solid #95d5b2;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    
    .proprietario-header {
      font-weight: bold;
      color: #2d6a4f;
      margin-bottom: 8px;
      font-size: 11pt;
      border-bottom: 1px solid #95d5b2;
      padding-bottom: 5px;
    }
    
    .proprietario-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 10pt;
    }
    
    .conjuge-info {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #95d5b2;
      font-style: italic;
      color: #555;
    }
    
    .usufrutuario-card {
      background: #fff4e6;
      border: 2px solid #fd7e14;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    
    .usufrutuario-header {
      font-weight: bold;
      color: #fd7e14;
      margin-bottom: 8px;
      font-size: 11pt;
    }
    
    .alert-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin-bottom: 15px;
    }
    
    .observacoes-content {
      background: white;
      border: 1px solid #dee2e6;
      padding: 15px;
      white-space: pre-wrap;
      font-size: 10pt;
      line-height: 1.7;
      text-align: justify;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .footer {
        position: fixed;
        bottom: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div class="header">
    <img 
      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cdb2d792e5fbfc65ac3e5d/2517f400d_LogoSemente2.png" 
      alt="Cerrado Consultoria Logo" 
      class="header-logo"
    />
    <div class="header-content">
      <div class="header-title">CERRADO CONSULTORIA</div>
      <div class="header-subtitle">Gestão de Propriedades Rurais</div>
    </div>
    <div style="width: 50px;"></div>
  </div>

  <!-- Rodapé -->
  <div class="footer">
    <div class="footer-left">
      Cerrado Consultoria - Gestão de Propriedades Rurais
    </div>
    <div class="footer-right">
      Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>

  <!-- Conteúdo -->
  <div class="container">
    <h1 class="document-title">Análise de Certidão de Imóvel Rural</h1>
    
    <!-- Dados do Imóvel -->
    <div class="section">
      <h2 class="section-title">I. Identificação do Imóvel</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nome do Imóvel</div>
          <div class="info-value">${resultado.nome_imovel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Matrícula nº</div>
          <div class="info-value">${matriculaEditavel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Registro Antigo</div>
          <div class="info-value">${resultado.registro_antigo}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Município</div>
          <div class="info-value">${resultado.municipio}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Área Total</div>
          <div class="info-value">${formatarArea(resultado.area_total_ha)}</div>
        </div>
        ${resultado.data_emissao_certidao ? `
        <div class="info-item">
          <div class="info-label">Emissão da Certidão</div>
          <div class="info-value">${resultado.data_emissao_certidao}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Proprietários -->
    <div class="section">
      <h2 class="section-title">II. Proprietário(s) Titular(es)</h2>
      ${resultado.proprietarios?.length > 0 ? resultado.proprietarios.map((prop, idx) => `
        <div class="proprietario-card">
          <div class="proprietario-header">Proprietário ${idx + 1}: ${prop.nome}</div>
          <div class="proprietario-info">
            <div>
              <strong>CPF:</strong> ${formatarCPF(prop.cpf)}
            </div>
            ${prop.area_ha && prop.area_ha !== "N/C" ? `
            <div>
              <strong>Área:</strong> ${formatarArea(prop.area_ha)}
            </div>
            ` : ''}
            ${prop.percentual && prop.percentual !== "N/C" ? `
            <div>
              <strong>Percentual:</strong> ${prop.percentual}
            </div>
            ` : ''}
            ${prop.regime_casamento && prop.regime_casamento !== "N/C" ? `
            <div style="grid-column: 1 / -1;">
              <strong>Regime:</strong> ${prop.regime_casamento}
            </div>
            ` : ''}
          </div>
          ${prop.conjuge?.nome ? `
            <div class="conjuge-info">
              <strong>Cônjuge:</strong> ${prop.conjuge.nome}${prop.conjuge.cpf ? ` - CPF: ${formatarCPF(prop.conjuge.cpf)}` : ''}
            </div>
          ` : ''}
        </div>
      `).join('') : '<p>Informação não disponível.</p>'}
    </div>

    <!-- Usufrutuários -->
    ${resultado.usufrutuarios && resultado.usufrutuarios.length > 0 ? `
    <div class="section">
      <h2 class="section-title">III. Usufrutuário(s) Vigente(s)</h2>
      <div class="alert-box">
        <strong>⚠️ ATENÇÃO:</strong> Este imóvel possui usufruto vigente, o que pode restringir a capacidade de uso e disposição do bem.
      </div>
      ${resultado.usufrutuarios.map((usu, idx) => `
        <div class="usufrutuario-card">
          <div class="usufrutuario-header">Usufrutuário ${idx + 1}: ${usu.nome}</div>
          <div class="proprietario-info">
            ${usu.cpf ? `<div><strong>CPF:</strong> ${formatarCPF(usu.cpf)}</div>` : ''}
            ${usu.tipo_usufruto ? `<div><strong>Tipo:</strong> ${usu.tipo_usufruto}</div>` : ''}
            ${usu.area_ha ? `<div><strong>Área:</strong> ${formatarArea(usu.area_ha)}</div>` : ''}
            ${usu.percentual ? `<div><strong>Percentual:</strong> ${usu.percentual}</div>` : ''}
            ${usu.observacao ? `<div style="grid-column: 1 / -1; margin-top: 8px;"><strong>Observação:</strong> ${usu.observacao}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Titularidade -->
    <div class="section">
      <h2 class="section-title">${resultado.usufrutuarios && resultado.usufrutuarios.length > 0 ? 'IV' : 'III'}. Titularidade</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Tipo de Titularidade</div>
          <div class="info-value">${resultado.tipo_titularidade}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data da Titularidade</div>
          <div class="info-value">${resultado.data_titularidade}</div>
        </div>
      </div>
    </div>

    <!-- Observações -->
    <div class="section">
      <h2 class="section-title">${resultado.usufrutuarios && resultado.usufrutuarios.length > 0 ? 'V' : 'IV'}. Observações e Histórico da Matrícula</h2>
      <div class="alert-box" style="margin-bottom: 15px;">
        <strong>📋 IMPORTANTE:</strong> Este documento apresenta ônus reais e gravames que ainda constam como ativos/vigentes na matrícula, ou seja, que ainda não foram quitados ou baixados pelo Cartório de Registro de Imóveis. A ausência de baixa indica que as obrigações correspondentes podem ainda estar pendentes.
      </div>
      <div class="observacoes-content">${formatarObservacoes(resultado.observacoes)}</div>
    </div>
  </div>
</body>
</html>
    `;

    // Criar blob e abrir em nova janela para impressão
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 250);
      });
    } else {
      toast.error("Por favor, permita pop-ups para gerar o PDF", {
        description: "Clique no botão novamente após permitir.",
        duration: 4000
      });
      URL.revokeObjectURL(url);
    }
  };

  const handleNovo = () => {
    setArquivo(null);
    setResultado(null);
    setErro(null);
    setStatusProcessamento("");
    setImovelVisualizandoId(null); // Limpar o ID do imóvel visualizado
    setMatriculaEditavel("");
    const input = document.getElementById('file-upload');
    if (input) input.value = '';
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentuações
      .replace(/[^\w\s]/g, ''); // Remove pontuações e caracteres especiais
  };

  const imoveisFiltrados = imoveisSalvos.filter(imovel => {
    if (!buscaImovel.trim()) return true;
    const termoNormalizado = normalizeText(buscaImovel);
    return (
      normalizeText(imovel.nome_imovel).includes(termoNormalizado) ||
      normalizeText(imovel.matricula_numero).includes(termoNormalizado) ||
      normalizeText(imovel.municipio).includes(termoNormalizado)
    );
  });

  // Função para renderizar detalhes do imóvel
  const renderDetalhesImovel = (imovel) => {
    let dadosVisualizacao;

    try {
      if (imovel.dados_analise_certidao) {
        dadosVisualizacao = JSON.parse(imovel.dados_analise_certidao);
        console.log("📊 Dados carregados da análise:", dadosVisualizacao);
        console.log("👥 Proprietários encontrados:", dadosVisualizacao.proprietarios);
      } else {
        const areaStr = imovel.area_total ? imovel.area_total.toFixed(2).replace('.', ',') + ' ha' : '0,00 ha';
        dadosVisualizacao = {
          nome_imovel: imovel.nome_imovel,
          matricula: imovel.matricula_numero,
          registro_antigo: imovel.matricula_anterior !== "N/C" ? imovel.matricula_anterior : "",
          municipio: imovel.municipio,
          area_total_ha: areaStr,
          proprietarios: [],
          usufrutuarios: [],
          tipo_titularidade: "N/C",
          data_titularidade: "N/C",
          observacoes: imovel.observacoes || "Sem observações registradas"
        };
      }
    } catch (error) {
      console.error("Erro ao visualizar imóvel:", error);
      return null;
    }

    return (
      <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Header Compacto */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{dadosVisualizacao.nome_imovel}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Matrícula {formatarMatricula(dadosVisualizacao.matricula)}
                </span>
                <span>{dadosVisualizacao.municipio}</span>
                <span className="font-semibold text-green-600">{formatarArea(dadosVisualizacao.area_total_ha)}</span>
              </div>
            </div>
            {dadosVisualizacao.data_emissao_certidao && (
              <div className="text-right">
                <span className="text-xs text-gray-500">Emitida em</span>
                <p className="text-sm font-medium text-gray-700">{dadosVisualizacao.data_emissao_certidao}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Dados Essenciais - Grid Compacto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Registro Antigo</Label>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{dadosVisualizacao.registro_antigo || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Área Total</Label>
              <p className="text-sm font-bold text-green-600 mt-0.5">{formatarArea(dadosVisualizacao.area_total_ha)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Tipo de Titularidade</Label>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{dadosVisualizacao.tipo_titularidade}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Data da Titularidade</Label>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{dadosVisualizacao.data_titularidade}</p>
            </div>
          </div>

          {/* PROPRIETÁRIOS - Compacto */}
          {dadosVisualizacao.proprietarios && dadosVisualizacao.proprietarios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-700">Proprietário(s)</h4>
              </div>
              <div className="space-y-2">
                {dadosVisualizacao.proprietarios.map((prop, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">#{idx + 1}</Badge>
                      <p className="font-semibold text-gray-900">{prop.nome}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-gray-500">CPF: </span>
                        <span className="font-medium text-gray-900">{formatarCPF(prop.cpf)}</span>
                      </div>
                      {prop.area_ha && prop.area_ha !== "N/C" && (
                        <div>
                          <span className="text-gray-500">Área: </span>
                          <span className="font-semibold text-green-600">{formatarArea(prop.area_ha)}</span>
                        </div>
                      )}
                      {prop.percentual && prop.percentual !== "N/C" && (
                        <div>
                          <span className="text-gray-500">Percentual: </span>
                          <span className="font-semibold text-blue-600">{prop.percentual}</span>
                        </div>
                      )}
                    </div>

                    {(prop.conjuge?.nome || (prop.regime_casamento && prop.regime_casamento !== "N/C")) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {prop.conjuge?.nome && (
                          <div className="text-xs text-gray-600">
                            <span className="text-gray-500">Cônjuge: </span>
                            <span className="font-medium text-gray-900">{prop.conjuge.nome}</span>
                            {prop.conjuge.cpf && (
                              <span className="text-gray-500 ml-1">
                                (CPF: {formatarCPF(prop.conjuge.cpf)})
                              </span>
                            )}
                          </div>
                        )}
                        {prop.regime_casamento && prop.regime_casamento !== "N/C" && (
                          <div className="text-xs text-gray-500 italic mt-0.5">
                            Regime: {prop.regime_casamento}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USUFRUTUÁRIOS - Compacto */}
          {dadosVisualizacao.usufrutuarios && dadosVisualizacao.usufrutuarios.length > 0 && (
            <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-semibold text-orange-900">Usufrutuário(s) Vigente(s)</h4>
              </div>
              <div className="space-y-2">
                {dadosVisualizacao.usufrutuarios.map((usu, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">#{idx + 1}</Badge>
                      <p className="font-semibold text-gray-900">{usu.nome}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                      {usu.cpf && (
                        <div>
                          <span className="text-gray-500">CPF: </span>
                          <span className="font-medium">{formatarCPF(usu.cpf)}</span>
                        </div>
                      )}
                      {usu.tipo_usufruto && (
                        <div>
                          <span className="text-gray-500">Tipo: </span>
                          <span className="font-semibold text-orange-600">{usu.tipo_usufruto}</span>
                        </div>
                      )}
                      {usu.area_ha && (
                        <div>
                          <span className="text-gray-500">Área: </span>
                          <span className="font-semibold text-green-600">{formatarArea(usu.area_ha)}</span>
                        </div>
                      )}
                      {usu.percentual && (
                        <div>
                          <span className="text-gray-500">%: </span>
                          <span className="font-semibold text-orange-600">{usu.percentual}</span>
                        </div>
                      )}
                    </div>
                    {usu.observacao && (
                      <p className="text-xs text-gray-600 mt-2 italic">{usu.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-800 flex items-start gap-2">
                <span>⚠️</span>
                <span>Este imóvel possui usufruto vigente. Consulte um advogado.</span>
              </div>
            </div>
          )}

          {/* OBSERVAÇÕES - Compacto */}
          {dadosVisualizacao.observacoes && dadosVisualizacao.observacoes !== "Sem observações registradas" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">Observações</h4>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-lg border border-gray-200">
                <Textarea
                  value={formatarObservacoes(dadosVisualizacao.observacoes)}
                  readOnly
                  className="min-h-32 border-0 bg-transparent resize-none whitespace-pre-wrap text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Documentos Complementares */}
          <DocumentosComplementares 
            imovel={imovel} 
            onAtualizar={carregarImoveisSalvos}
          />

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <Button
              onClick={() => handleReanalisar()}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Nova Análise
            </Button>
          </div>
          </div>
          </div>
          );
          };

  return (
    <div className="space-y-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Análise Inteligente de Certidões</h1>
          <p className="text-sm text-gray-500">
            Extraia automaticamente informações de certidões de imóveis usando IA
          </p>
        </div>

        <Tabs defaultValue="analise" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="analise" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Nova Análise
            </TabsTrigger>
            <TabsTrigger value="salvos" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Imóveis Salvos ({imoveisSalvos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analise" className="space-y-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 text-sm text-blue-800">
                    <p className="font-semibold">📋 Como funciona:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Faça upload de uma certidão de imóvel em PDF (atualizada, com menos de 1 ano)</li>
                      <li>O sistema tentará <strong>automaticamente</strong> diferentes métodos de análise</li>
                      <li>A IA irá extrair todas as informações relevantes do documento</li>
                      <li>Revise os dados extraídos e utilize-os conforme necessário</li>
                      <li><strong>Tamanho máximo:</strong> 10MB | <strong>Tempo de análise:</strong> 30-60 segundos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className=" border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Upload className="w-5 h-5" />
                  Upload da Certidão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500 mb-1 block">
                    Selecione a Certidão do Imóvel (PDF)
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={processando}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50"
                  />
                  {arquivo && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Arquivo selecionado: <strong>{arquivo.name}</strong></span>
                      <Badge variant="outline" className="ml-2">
                        {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  )}
                </div>

                {statusProcessamento && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-medium">{statusProcessamento}</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      O sistema está tentando diferentes métodos para garantir a melhor extração de dados...
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleAnalisar}
                    disabled={!arquivo || processando}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    {processando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Analisar Certidão
                      </>
                    )}
                  </Button>

                  {(resultado || erro) && (
                    <Button
                      onClick={handleNovo}
                      variant="outline"
                      className="border-gray-300"
                    >
                      Nova Análise
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {erro && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 mb-1">Erro ao processar certidão</p>
                      <pre className="text-sm text-red-700 mb-3 whitespace-pre-wrap">{erro}</pre>
                      <div className="text-xs text-red-600 space-y-1 bg-red-100 p-3 rounded">
                        <p className="font-semibold">💡 Como resolver:</p>
                        <ol className="list-decimal list-inside ml-2 space-y-1">
                          <li><strong>Abra o PDF no Chrome ou Edge</strong></li>
                          <li>Vá em <strong>Imprimir</strong> (Ctrl+P)</li>
                          <li>Selecione <strong>"Salvar como PDF"</strong> como impressora</li>
                          <li>Salve o novo arquivo e tente novamente</li>
                        </ol>
                        <p className="mt-2 italic">
                          Isso geralmente resolve problemas com PDFs protegidos, corrompidos ou escaneados.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {resultado && (
              <Card className=" border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      Resultado da Análise
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSalvarImovel}
                        disabled={salvando}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {salvando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Imóvel
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCopiarTexto}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-green-600"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                      <Button
                        onClick={handleBaixarRelatorio}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-green-600"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                      📋 Dados do Imóvel
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Nome do Imóvel</Label>
                        <p className="font-semibold text-gray-900">{resultado.nome_imovel}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Label className="text-xs text-blue-700 font-medium block mb-1">
                          Matrícula nº *
                        </Label>
                        <Input
                          type="text"
                          value={matriculaEditavel}
                          onChange={(e) => setMatriculaEditavel(formatarMatricula(e.target.value))}
                          className="font-semibold text-gray-900 border-blue-300 focus:border-blue-500"
                          placeholder="Ex: 7.969"
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Será usado para vincular ao cadastrar o imóvel
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Registro Antigo</Label>
                        <p className="font-semibold text-gray-900">{resultado.registro_antigo}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Município</Label>
                        <p className="font-semibold text-gray-900">{resultado.municipio}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Área Total</Label>
                        <p className="font-semibold text-green-600 text-lg">{formatarArea(resultado.area_total_ha)}</p>
                      </div>
                      {resultado.data_emissao_certidao && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="text-xs text-gray-600 block mb-1">Emissão da Certidão</Label>
                          <p className="text-sm text-gray-700">{resultado.data_emissao_certidao}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                      👤 Proprietário(s)
                    </h3>
                    <div className="space-y-3">
                      {resultado.proprietarios?.map((prop, idx) => (
                        <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-3">
                            <Badge className="bg-blue-600 text-white mt-1">#{idx + 1}</Badge>
                            <div className="flex-1 space-y-2">
                              <p className="font-semibold text-gray-900 text-lg">{prop.nome}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">CPF: </span>
                                  <span className="font-medium text-gray-900">{formatarCPF(prop.cpf)}</span>
                                </div>
                                {prop.area_ha && prop.area_ha !== "N/C" && (
                                  <div>
                                    <span className="text-gray-600">Área: </span>
                                    <span className="font-medium text-green-600">{formatarArea(prop.area_ha)}</span>
                                  </div>
                                )}
                                {prop.percentual && prop.percentual !== "N/C" && (
                                  <div>
                                    <span className="text-gray-600">Percentual: </span>
                                    <span className="font-medium text-blue-700">{prop.percentual}</span>
                                  </div>
                                )}
                              </div>

                              {(prop.conjuge?.nome || (prop.regime_casamento && prop.regime_casamento !== "N/C")) && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                  {prop.conjuge?.nome && (
                                    <div className="text-sm text-gray-700">
                                      <span className="text-gray-500">Cônjuge: </span>
                                      <span className="font-medium">{prop.conjuge.nome}</span>
                                      {prop.conjuge.cpf && (
                                        <span className="text-gray-500 ml-2">
                                          (CPF: <span className="font-medium text-gray-700">{formatarCPF(prop.conjuge.cpf)}</span>)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {prop.regime_casamento && prop.regime_casamento !== "N/C" && (
                                    <div className="text-xs text-gray-600 mt-1 italic">
                                      Regime: {prop.regime_casamento}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NOVO: SEÇÃO DE USUFRUTUÁRIOS NO RESULTADO DA ANÁLISE */}
                  {resultado.usufrutuarios && resultado.usufrutuarios.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-orange-800 mb-3 pb-2 border-b border-orange-300 flex items-center gap-2">
                        ⚠️ Usufrutuário(s) Vigente(s)
                      </h3>
                      <div className="space-y-3">
                        {resultado.usufrutuarios.map((usu, idx) => (
                          <div key={idx} className="p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                            <div className="flex items-start gap-3">
                              <Badge className="bg-orange-600 text-white mt-1">#{idx + 1}</Badge>
                              <div className="flex-1 space-y-2">
                                <p className="font-semibold text-gray-900 text-lg">{usu.nome}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                  {usu.cpf && (
                                    <div>
                                      <span className="text-gray-600">CPF: </span>
                                      <span className="font-medium text-gray-900">{formatarCPF(usu.cpf)}</span>
                                    </div>
                                  )}
                                  {usu.tipo_usufruto && (
                                    <div>
                                      <span className="text-gray-600">Tipo: </span>
                                      <span className="font-medium text-orange-700">{usu.tipo_usufruto}</span>
                                    </div>
                                  )}
                                  {usu.area_ha && (
                                    <div>
                                      <span className="text-gray-600">Área: </span>
                                      <span className="font-medium text-green-600">{formatarArea(usu.area_ha)}</span>
                                    </div>
                                  )}
                                  {usu.percentual && (
                                    <div>
                                      <span className="text-gray-600">Percentual: </span>
                                      <span className="font-medium text-orange-700">{usu.percentual}</span>
                                    </div>
                                  )}
                                </div>

                                {usu.observacao && (
                                  <div className="mt-3 pt-3 border-t border-orange-300">
                                    <p className="text-sm text-gray-700 italic">{usu.observacao}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                        <p className="text-xs text-orange-800 font-medium flex items-start gap-2">
                          <span className="text-base">⚠️</span>
                          <span>
                            <strong>Atenção:</strong> Este imóvel possui usufruto vigente. Consulte um advogado para entender as restrições de uso e disposição do bem.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                      📜 Titularidade
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Tipo de Titularidade</Label>
                        <p className="font-semibold text-gray-900">{resultado.tipo_titularidade}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600 block mb-1">Data da Titularidade</Label>
                        <p className="font-semibold text-gray-900">{resultado.data_titularidade}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                      📝 Observações
                    </h3>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Textarea
                        value={formatarObservacoes(resultado.observacoes)}
                        readOnly
                        className="min-h-48 border-0 bg-transparent resize-none whitespace-pre-wrap font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="salvos" className="space-y-4">
            <Card className=" border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Search className="w-5 h-5" />
                  Buscar Imóveis Analisados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="🔎 Buscar por matrícula, nome do imóvel ou município..."
                  value={buscaImovel}
                  onChange={(e) => setBuscaImovel(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {carregandoImoveis ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-4 text-green-600" />
                  <p className="text-gray-600">Carregando imóveis salvos...</p>
                </CardContent>
              </Card>
            ) : imoveisFiltrados.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-1">
                    {buscaImovel ? "Nenhum imóvel encontrado" : "Nenhum imóvel salvo ainda"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {buscaImovel 
                      ? "Tente ajustar os termos da busca" 
                      : "Analise uma certidão e salve o imóvel para vê-lo aqui"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {imoveisFiltrados.map((imovel) => (
                  <Card key={imovel.id} className="hover: transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <FileText className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold text-lg text-gray-900">
                              Matrícula {formatarMatricula(imovel.matricula_numero)} - {imovel.nome_imovel}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Município:</span> {imovel.municipio}
                            </div>
                            <div>
                              <span className="font-medium">Área Total:</span> {imovel.area_total?.toFixed(2).replace('.', ',')} ha
                            </div>
                            <div>
                              <span className="font-medium">Salvo em:</span> {new Date(imovel.created_date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleToggleDetalhes(imovel.id)}
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-green-600"
                          >
                            {imovelVisualizandoId === imovel.id ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleExcluirImovel(imovel.id)}
                            size="sm"
                            variant="outline"
                            disabled={excluindo}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            {excluindo ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Detalhes do imóvel logo abaixo */}
                      {imovelVisualizandoId === imovel.id && renderDetalhesImovel(imovel)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}