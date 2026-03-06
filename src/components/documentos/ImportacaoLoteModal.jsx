import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import {
  Upload, Loader2, CheckCircle2, XCircle, Clock, Trash2, Sparkles, Save, FileText
} from "lucide-react";

const STATUS = { PENDENTE: "pendente", PROCESSANDO: "processando", CONCLUIDO: "concluido", ERRO: "erro" };


const TIPOS_DOCUMENTO = [
  "Certidão", "CCIR", "CIB", "ITR", "CAR - Recibo", "CAR - Demonstrativo",
  "Contrato de Arrendamento", "Aditivo", "Carta de Anuência", "Laudo Técnico",
  "ART", "Validação de Assinatura", "Outro"
];

function calcularStatus(data_vencimento) {
  if (!data_vencimento) return "Vigente";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = differenceInDays(new Date(data_vencimento + 'T00:00:00'), hoje);
  return dias < 0 ? "Vencido" : dias <= 30 ? "Vencendo" : "Vigente";
}

function matchCliente(clientes, nomeCliente) {
  if (!nomeCliente) return "";
  const norm = nomeCliente.toLowerCase().trim();
  const encontrado = clientes.find(c =>
    c.nome.toLowerCase().includes(norm) || norm.includes(c.nome.toLowerCase())
  );
  return encontrado?.id || "";
}

function matchImovel(imoveis, matriculaNume, clienteId) {
  if (!matriculaNume) return "";
  const matriculaNorm = String(matriculaNume).replace(/\D/g, '');
  const lista = clienteId ? imoveis.filter(i => i.cliente_id === clienteId) : imoveis;
  const encontrado = lista.find(i => {
    if (!i.matricula_numero) return false;
    return String(i.matricula_numero).replace(/\D/g, '') === matriculaNorm;
  });
  return encontrado?.id || "";
}

export default function ImportacaoLoteModal({ open, onClose, clientes, imoveis, onSalvoConcluido }) {
  const [arquivos, setArquivos] = useState([]);
  const [fase, setFase] = useState("selecao"); // selecao | processando | revisao
  const [progresso, setProgresso] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef();

  const handleSelecionarArquivos = (e) => {
    const files = Array.from(e.target.files || []);
    const novos = files
      .filter(f => f.type === "application/pdf")
      .map(f => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        nome: f.name,
        status: STATUS.PENDENTE,
        erro: null,
        // dados extraídos
        arquivo_pdf: "",
        nome_documento: "",
        tipo_documento: "",
        data_emissao: "",
        data_vencimento: "",
        observacoes: "",
        cliente_id: "",
        imovel_id: "",
      }));
    if (files.some(f => f.type !== "application/pdf")) toast.warning("Apenas PDFs são aceitos. Outros arquivos foram ignorados.");
    setArquivos(prev => [...prev, ...novos]);
  };

  const removerArquivo = (id) => setArquivos(prev => prev.filter(a => a.id !== id));

  const processarTodos = async () => {
    if (arquivos.length === 0) return;
    setFase("processando");
    const total = arquivos.length;
    let processados = 0;

    const lista = [...arquivos];
    for (let i = 0; i < lista.length; i++) {
      const arq = lista[i];
      // Marca como processando
      setArquivos(prev => prev.map(a => a.id === arq.id ? { ...a, status: STATUS.PROCESSANDO } : a));

      try {
        // 1. Upload do PDF
        let file_url;
        try {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: arq.file });
          file_url = uploadResult.file_url;
        } catch (uploadErr) {
          throw new Error(`Upload falhou: ${uploadErr.message}`);
        }

        // 2. Extração com IA
        let resultado = {};
        try {
          resultado = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise este documento PDF e extraia as seguintes informações em formato JSON.

REGRAS DE CLASSIFICAÇÃO DO TIPO DE DOCUMENTO:
- "Certidão": contém palavra "certidão", emitida por cartório/órgão público, ex: certidão de matrícula, certidão negativa, certidão de ônus
- "CCIR": contém "CCIR", "Certificado de Cadastro de Imóvel Rural", emitido pelo INCRA, possui número do CCIR e campo de exercício (ano)
- "CIB": contém "CIB", "Certificado de Imóvel do BRASIL" ou cadastro INCRA, código SNCR/CIB
- "ITR": contém "ITR", "Imposto Territorial Rural", "DIAT", "DITR", emitido pela Receita Federal
- "CAR - Recibo": contém "CAR", "Cadastro Ambiental Rural" e a palavra "Recibo de Inscrição" ou "protocolo de inscrição"
- "CAR - Demonstrativo": contém "CAR", "Cadastro Ambiental Rural" e a palavra "Demonstrativo" ou "Boletim"
- "Contrato de Arrendamento": menciona "contrato", "arrendamento", "arrendador", "arrendatário"
- "Aditivo": menciona "aditivo", "termo aditivo", referencia a contrato anterior
- "Carta de Anuência": contém "anuência", "concordância", emitida por proprietário autorizando uso
- "Laudo Técnico": contém "laudo", "avaliação técnica", "vistoria", emitido por engenheiro/perito
- "ART": contém "ART", "Anotação de Responsabilidade Técnica", emitida pelo CREA
- "Validação de Assinatura": contém "validação", "assinatura digital", "certificado digital", "ICP-Brasil"
- "Outro": qualquer documento que não se encaixe nas categorias acima

CAMPOS A EXTRAIR:
- tipo_documento: classificar conforme regras acima (use EXATAMENTE um dos tipos listados)
- nome_sugerido: nome descritivo para o documento (ex: "CCIR 2024 - Faz. Santa Maria", "Contrato de Arrendamento - João Silva")
- data_emissao: data de emissão no formato YYYY-MM-DD (se encontrada, senão null)
- data_vencimento: data de vencimento no formato YYYY-MM-DD (se encontrada, senão null)
- data_inicio_contrato: data de início do contrato no formato YYYY-MM-DD (apenas para Contrato de Arrendamento e Aditivo, senão null)
- data_fim_contrato: data de fim/vencimento do contrato no formato YYYY-MM-DD (apenas para Contrato de Arrendamento e Aditivo, senão null)
- exercicio: ano do exercício como string (apenas para CCIR, ex: "2024", senão null)
- resumo: resumo breve do conteúdo em até 200 caracteres
- matricula_numero: número da matrícula do imóvel mencionado (ex: "27.692"), apenas dígitos e pontos. Se não encontrar, null.
- nome_cliente: nome completo do proprietário/cliente mencionado. Se não encontrar, null.`,
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: {
                tipo_documento: { type: "string" },
                nome_sugerido: { type: "string" },
                data_emissao: { type: "string" },
                data_vencimento: { type: "string" },
                data_inicio_contrato: { type: "string" },
                data_fim_contrato: { type: "string" },
                exercicio: { type: "string" },
                resumo: { type: "string" },
                matricula_numero: { type: "string" },
                nome_cliente: { type: "string" }
              }
            }
          }) || {};
        } catch (iaErr) {
          console.warn("IA falhou, usando dados padrão:", iaErr.message);
          resultado = {};
        }

        const cliente_id = matchCliente(clientes, resultado?.nome_cliente);
        const imovel_id = matchImovel(imoveis, resultado?.matricula_numero, cliente_id);

        setArquivos(prev => prev.map(a => a.id === arq.id ? {
          ...a,
          status: STATUS.CONCLUIDO,
          arquivo_pdf: file_url,
          nome_documento: resultado?.nome_sugerido || arq.nome.replace('.pdf', ''),
          tipo_documento: resultado?.tipo_documento || "",
          data_emissao: resultado?.data_emissao || "",
          data_vencimento: resultado?.data_vencimento || "",
          observacoes: resultado?.resumo || "",
          cliente_id,
          imovel_id,
        } : a));
      } catch (err) {
        setArquivos(prev => prev.map(a => a.id === arq.id ? { ...a, status: STATUS.ERRO, erro: err.message } : a));
      }

      processados++;
      setProgresso(Math.round((processados / total) * 100));
    }

    setFase("revisao");
  };

  const atualizarCampo = (id, campo, valor) => {
    setArquivos(prev => prev.map(a => a.id === id ? { ...a, [campo]: valor } : a));
  };

  const salvarTodos = async () => {
    const paraSalvar = arquivos.filter(a => a.status === STATUS.CONCLUIDO && a.nome_documento.trim());
    if (paraSalvar.length === 0) { toast.error("Nenhum documento válido para salvar"); return; }
    setSalvando(true);
    try {
      await Promise.all(paraSalvar.map(a => base44.entities.Documento.create({
        nome_documento: a.nome_documento,
        tipo_documento: a.tipo_documento,
        data_emissao: a.data_emissao,
        data_vencimento: a.data_vencimento,
        status_documento: calcularStatus(a.data_vencimento),
        cliente_id: a.cliente_id,
        imovel_id: a.imovel_id,
        arquivo_pdf: a.arquivo_pdf,
        observacoes: a.observacoes,
      })));
      toast.success(`${paraSalvar.length} documento(s) salvos com sucesso!`);
      handleFechar();
      onSalvoConcluido();
    } catch (err) {
      toast.error("Erro ao salvar documentos");
    } finally {
      setSalvando(false);
    }
  };

  const handleFechar = () => {
    setArquivos([]);
    setFase("selecao");
    setProgresso(0);
    onClose();
  };

  const concluidos = arquivos.filter(a => a.status === STATUS.CONCLUIDO).length;
  const erros = arquivos.filter(a => a.status === STATUS.ERRO).length;

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" /> Importar Vários Documentos
          </DialogTitle>
          <DialogDescription>
            Selecione múltiplos PDFs para extração automática com IA e cadastro em lote.
          </DialogDescription>
        </DialogHeader>

        {/* FASE: SELEÇÃO */}
        {fase === "selecao" && (
          <div className="space-y-4 py-2">
            <label
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
              onClick={() => inputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Clique para selecionar os PDFs</p>
                <p className="text-xs text-gray-400 mt-1">Múltiplos arquivos permitidos</p>
              </div>
              <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleSelecionarArquivos} />
            </label>

            {arquivos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{arquivos.length} arquivo(s) selecionado(s)</p>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {arquivos.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{a.nome}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0" onClick={() => removerArquivo(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FASE: PROCESSANDO */}
        {fase === "processando" && (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processando arquivos com IA...</span>
                <span className="font-semibold">{progresso}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {arquivos.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="shrink-0">
                    {a.status === STATUS.PENDENTE && <Clock className="w-4 h-4 text-gray-400" />}
                    {a.status === STATUS.PROCESSANDO && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {a.status === STATUS.CONCLUIDO && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {a.status === STATUS.ERRO && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <span className="text-sm text-gray-700 truncate flex-1">{a.nome}</span>
                  <Badge variant="outline" className={
                    a.status === STATUS.PENDENTE ? "text-gray-500" :
                    a.status === STATUS.PROCESSANDO ? "text-blue-600 border-blue-300" :
                    a.status === STATUS.CONCLUIDO ? "text-green-600 border-green-300" :
                    "text-red-600 border-red-300"
                  }>
                    {a.status === STATUS.PENDENTE ? "Pendente" :
                     a.status === STATUS.PROCESSANDO ? "Processando..." :
                     a.status === STATUS.CONCLUIDO ? "Concluído" : "Erro"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FASE: REVISÃO */}
        {fase === "revisao" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> {concluidos} extraídos</span>
              {erros > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4" /> {erros} com erro</span>}
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {arquivos.filter(a => a.status === STATUS.CONCLUIDO).map(a => (
                <div key={a.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{a.nome}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0" onClick={() => removerArquivo(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Tipo *</label>
                      <Select value={a.tipo_documento} onValueChange={v => atualizarCampo(a.id, 'tipo_documento', v)}>
                        <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Nome *</label>
                      <Input className="h-8 text-sm mt-1" value={a.nome_documento} onChange={e => atualizarCampo(a.id, 'nome_documento', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Data Emissão</label>
                      <Input type="date" className="h-8 text-sm mt-1" value={a.data_emissao} onChange={e => atualizarCampo(a.id, 'data_emissao', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Data Vencimento</label>
                      <Input type="date" className="h-8 text-sm mt-1" value={a.data_vencimento} onChange={e => atualizarCampo(a.id, 'data_vencimento', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Cliente</label>
                      <Select value={a.cliente_id || ""} onValueChange={v => atualizarCampo(a.id, 'cliente_id', v)}>
                        <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Imóvel Rural</label>
                      <Select value={a.imovel_id || ""} onValueChange={v => atualizarCampo(a.id, 'imovel_id', v)}>
                        <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {imoveis.filter(i => i.nome_imovel).map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.nome_imovel}{i.municipio ? ` - ${i.municipio}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {a.observacoes && (
                    <div>
                      <label className="text-xs font-medium text-gray-600">Observações (IA)</label>
                      <Input className="h-8 text-sm mt-1" value={a.observacoes} onChange={e => atualizarCampo(a.id, 'observacoes', e.target.value)} />
                    </div>
                  )}
                </div>
              ))}

              {arquivos.filter(a => a.status === STATUS.ERRO).map(a => (
                <div key={a.id} className="border border-red-200 rounded-xl p-4 bg-red-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700">{a.nome}</span>
                    {a.erro && <span className="text-xs text-red-500">({a.erro})</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removerArquivo(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={handleFechar}>Cancelar</Button>

          {fase === "selecao" && (
            <Button
              onClick={processarTodos}
              disabled={arquivos.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Processar com IA ({arquivos.length})
            </Button>
          )}

          {fase === "revisao" && (
            <Button onClick={salvarTodos} disabled={salvando || concluidos === 0} className="bg-green-600 hover:bg-green-700">
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {salvando ? "Salvando..." : `Salvar Todos (${concluidos})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}