import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  FileText, CheckCircle2, AlertTriangle, XCircle, 
  Plus, Search, MoreHorizontal, Bell, Loader2, Sparkles,
  Pencil, Trash2, ExternalLink, Calendar
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

// ============================================================
// COMPONENTE: Cartões de Estatísticas
// ============================================================
const EstatisticasDocs = ({ stats, isLoading }) => {
  const cards = [
    { title: "Total de Documentos", value: stats.total, icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50", iconBg: "bg-blue-100", gradient: "from-blue-400 to-blue-600" },
    { title: "Vigentes", value: stats.vigente, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50", iconBg: "bg-green-100", gradient: "from-green-400 to-green-600" },
    { title: "Vencendo (30d)", value: stats.vencendo, icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-50", iconBg: "bg-yellow-100", gradient: "from-yellow-400 to-yellow-600" },
    { title: "Vencidos", value: stats.vencido, icon: XCircle, color: "text-red-600", bgColor: "bg-red-50", iconBg: "bg-red-100", gradient: "from-red-400 to-red-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className={`relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 ${card.bgColor}`}>
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`} />
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
              <div className="font-semibold text-gray-800 text-2xl">
                {isLoading ? <div className="h-8 w-12 bg-gray-200 animate-pulse rounded" /> : card.value}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ============================================================
// COMPONENTE: Alertas de Vencimento
// ============================================================
const AlertasDocumentos = ({ documentos }) => {
  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return documentos
      .filter(doc => doc.data_vencimento)
      .map(doc => {
        const vencimento = new Date(doc.data_vencimento + 'T00:00:00');
        return { ...doc, diasRestantes: differenceInDays(vencimento, hoje) };
      })
      .filter(doc => doc.diasRestantes <= 30)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5);
  }, [documentos]);

  if (alertas.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-600" /> Alertas de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Nenhum documento vencendo</p>
            <p className="text-xs text-gray-400 mt-1">Todos os documentos estão em dia!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-600" /> Alertas de Documentos
          </div>
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          {alertas.map((alerta, idx) => {
            const corAlerta = alerta.diasRestantes < 0
              ? "text-red-600 bg-red-50 border-red-200"
              : alerta.diasRestantes === 0
              ? "text-orange-600 bg-orange-50 border-orange-200"
              : alerta.diasRestantes <= 7
              ? "text-yellow-600 bg-yellow-50 border-yellow-200"
              : "text-blue-600 bg-blue-50 border-blue-200";

            const textoAlerta = alerta.diasRestantes < 0
              ? `Vencido há ${Math.abs(alerta.diasRestantes)} dia(s)`
              : alerta.diasRestantes === 0
              ? "Vence HOJE"
              : `Vence em ${alerta.diasRestantes} dia(s)`;

            return (
              <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{alerta.nome_documento}</p>
                    <p className="text-xs text-gray-500 mt-1">{alerta.tipo_documento}</p>
                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(alerta.data_vencimento + 'T00:00:00'), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-1 rounded-md border text-xs font-semibold ${corAlerta}`}>
                    {textoAlerta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// COMPONENTE: Tabela de Documentos
// ============================================================
const TabelaDocumentos = ({ documentos, isLoading, onAction }) => {
  const getStatusBadge = (status) => {
    const config = {
      "Vigente": "bg-green-50 text-green-700 border-green-200",
      "Vencendo": "bg-yellow-50 text-yellow-700 border-yellow-200",
      "Vencido": "bg-red-50 text-red-700 border-red-200",
      "Arquivado": "bg-gray-50 text-gray-600 border-gray-200",
      "Rascunho": "bg-gray-100 text-gray-500 border-gray-200",
    };
    return <Badge variant="outline" className={config[status] || config["Rascunho"]}>{status || "—"}</Badge>;
  };

  const getTipoColor = (tipo) => {
    const cores = {
      "Certidão": "bg-blue-100 text-blue-600",
      "Contrato": "bg-green-100 text-green-600",
      "Carta de Anuência": "bg-yellow-100 text-yellow-600",
      "Laudo Técnico": "bg-red-100 text-red-600",
      "ART": "bg-purple-100 text-purple-600",
    };
    return cores[tipo] || "bg-gray-100 text-gray-600";
  };

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Documentos Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="py-4">
                    <div className="h-6 bg-gray-100 animate-pulse rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  Nenhum documento encontrado. Clique em "Novo Documento" para começar.
                </TableCell>
              </TableRow>
            ) : (
              documentos.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onAction("view", doc)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTipoColor(doc.tipo_documento)}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm">{doc.nome_documento}</div>
                        <div className="text-xs text-gray-500">{doc.tipo_documento}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600">{doc._cliente_nome || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {doc.data_vencimento ? format(new Date(doc.data_vencimento + 'T00:00:00'), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(doc.status_documento)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {doc.arquivo_pdf && (
                          <DropdownMenuItem onClick={() => window.open(doc.arquivo_pdf, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onAction("edit", doc)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("delete", doc)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PainelDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoDoc, setEditandoDoc] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [extraindoIA, setExtraindoIA] = useState(false);

  const formInicial = {
    nome_documento: "", tipo_documento: "", data_emissao: "", data_vencimento: "",
    status_documento: "Vigente", cliente_id: "", imovel_id: "", arquivo_pdf: "", observacoes: "", dados_extracao_ia: ""
  };
  const [formData, setFormData] = useState(formInicial);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [docsData, clientsData, imoveisData] = await Promise.all([
        base44.entities.Documento.list("-created_date"),
        base44.entities.Cliente.list("nome"),
        base44.entities.Imovel.list("-created_date", 200)
      ]);
      const docsComCliente = (docsData || []).map(doc => ({
        ...doc,
        _cliente_nome: (clientsData || []).find(c => c.id === doc.cliente_id)?.nome || ""
      }));
      setDocumentos(docsComCliente);
      setClientes(clientsData || []);
      setImoveis(imoveisData || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => documentos.reduce((acc, doc) => {
    acc.total++;
    if (doc.status_documento === 'Vigente') acc.vigente++;
    if (doc.status_documento === 'Vencido') acc.vencido++;
    if (doc.status_documento === 'Vencendo') acc.vencendo++;
    return acc;
  }, { total: 0, vigente: 0, vencendo: 0, vencido: 0 }), [documentos]);

  const documentosFiltrados = useMemo(() => {
    if (!busca.trim()) return documentos;
    const termo = busca.toLowerCase();
    return documentos.filter(doc =>
      (doc.nome_documento || "").toLowerCase().includes(termo) ||
      (doc.tipo_documento || "").toLowerCase().includes(termo) ||
      (doc._cliente_nome || "").toLowerCase().includes(termo)
    );
  }, [documentos, busca]);

  const abrirNovoDocumento = () => {
    setEditandoDoc(null);
    setFormData(formInicial);
    setModalAberto(true);
  };

  const abrirEditarDocumento = (doc) => {
    setEditandoDoc(doc);
    setFormData({
      nome_documento: doc.nome_documento || "", tipo_documento: doc.tipo_documento || "",
      data_emissao: doc.data_emissao || "", data_vencimento: doc.data_vencimento || "",
      status_documento: doc.status_documento || "Vigente", cliente_id: doc.cliente_id || "",
      imovel_id: doc.imovel_id || "", arquivo_pdf: doc.arquivo_pdf || "",
      observacoes: doc.observacoes || "", dados_extracao_ia: doc.dados_extracao_ia || ""
    });
    setModalAberto(true);
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error("Selecione apenas arquivos PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 10MB)"); return; }
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, arquivo_pdf: file_url }));
      toast.success("PDF enviado com sucesso");
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    }
  };

  const handleExtrairIA = async () => {
    if (!formData.arquivo_pdf) { toast.error("Envie um PDF primeiro"); return; }
    setExtraindoIA(true);
    try {
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este documento PDF e extraia as seguintes informações em formato JSON:
        - tipo_documento: tipo do documento (Certidão, Contrato, Carta de Anuência, Laudo Técnico, ART, Outro)
        - nome_sugerido: nome descritivo para o documento (ex: "Certidão Matrícula 12.345 - Faz. Santa Maria")
        - data_emissao: data de emissão no formato YYYY-MM-DD (se encontrada)
        - data_vencimento: data de vencimento no formato YYYY-MM-DD (se encontrada)
        - resumo: resumo breve do conteúdo em até 200 caracteres`,
        file_urls: [formData.arquivo_pdf],
        response_json_schema: {
          type: "object",
          properties: {
            tipo_documento: { type: "string" },
            nome_sugerido: { type: "string" },
            data_emissao: { type: "string" },
            data_vencimento: { type: "string" },
            resumo: { type: "string" }
          }
        }
      });
      if (resultado) {
        setFormData(prev => ({
          ...prev,
          nome_documento: resultado.nome_sugerido || prev.nome_documento,
          tipo_documento: resultado.tipo_documento || prev.tipo_documento,
          data_emissao: resultado.data_emissao || prev.data_emissao,
          data_vencimento: resultado.data_vencimento || prev.data_vencimento,
          observacoes: resultado.resumo || prev.observacoes,
          dados_extracao_ia: JSON.stringify(resultado)
        }));
        toast.success("Dados extraídos com sucesso pela IA!");
      }
    } catch (error) {
      toast.error("Erro ao extrair dados com IA");
    } finally {
      setExtraindoIA(false);
    }
  };

  const handleSalvar = async () => {
    if (!formData.nome_documento.trim()) { toast.error("Informe o nome do documento"); return; }
    if (!formData.tipo_documento) { toast.error("Selecione o tipo do documento"); return; }
    setSalvando(true);
    try {
      let statusCalculado = formData.status_documento;
      if (formData.data_vencimento) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const dias = differenceInDays(new Date(formData.data_vencimento + 'T00:00:00'), hoje);
        statusCalculado = dias < 0 ? "Vencido" : dias <= 30 ? "Vencendo" : "Vigente";
      }
      const dados = { ...formData, status_documento: statusCalculado };
      if (editandoDoc) {
        await base44.entities.Documento.update(editandoDoc.id, dados);
        toast.success("Documento atualizado com sucesso");
      } else {
        await base44.entities.Documento.create(dados);
        toast.success("Documento cadastrado com sucesso");
      }
      setModalAberto(false);
      await fetchData();
    } catch (error) {
      toast.error("Erro ao salvar documento");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (doc) => {
    if (!window.confirm(`Excluir "${doc.nome_documento}"?`)) return;
    try {
      await base44.entities.Documento.delete(doc.id);
      toast.success("Documento excluído");
      await fetchData();
    } catch (error) {
      toast.error("Erro ao excluir documento");
    }
  };

  const handleAction = (action, doc) => {
    if (action === "view") { if (doc.arquivo_pdf) window.open(doc.arquivo_pdf, '_blank'); else abrirEditarDocumento(doc); }
    if (action === "edit") abrirEditarDocumento(doc);
    if (action === "delete") handleExcluir(doc);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel de Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie certidões, contratos e laudos de forma centralizada.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar documento..." className="pl-10 w-full sm:w-56" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Button onClick={abrirNovoDocumento} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" /> Novo Documento
          </Button>
        </div>
      </div>

      <EstatisticasDocs stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TabelaDocumentos documentos={documentosFiltrados.slice(0, 15)} isLoading={isLoading} onAction={handleAction} />
        </div>
        <div>
          <AlertasDocumentos documentos={documentos} />
        </div>
      </div>

      {/* Modal Novo / Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoDoc ? "Editar Documento" : "Novo Documento"}</DialogTitle>
            <DialogDescription>
              {editandoDoc ? "Atualize as informações do documento." : "Cadastre um novo documento. Envie o PDF para extração automática com IA."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Upload PDF + IA */}
            <div className="space-y-2">
              <Label>Arquivo PDF</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf" onChange={handleUploadPDF} className="flex-1" />
                {formData.arquivo_pdf && (
                  <Button variant="outline" size="sm" onClick={handleExtrairIA} disabled={extraindoIA}>
                    {extraindoIA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />}
                    {extraindoIA ? "Extraindo..." : "Extrair com IA"}
                  </Button>
                )}
              </div>
              {formData.arquivo_pdf && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> PDF enviado com sucesso
                </p>
              )}
            </div>

            {/* Tipo + Nome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo do Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_documento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certidão">Certidão</SelectItem>
                    <SelectItem value="Contrato">Contrato</SelectItem>
                    <SelectItem value="Carta de Anuência">Carta de Anuência</SelectItem>
                    <SelectItem value="Laudo Técnico">Laudo Técnico</SelectItem>
                    <SelectItem value="ART">ART</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Documento *</Label>
                <Input value={formData.nome_documento} onChange={(e) => setFormData(prev => ({ ...prev, nome_documento: e.target.value }))} placeholder="Ex: Certidão Matrícula 12.345" />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input type="date" value={formData.data_emissao} onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))} />
              </div>
            </div>

            {/* Cliente + Imóvel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.cliente_id} onValueChange={(v) => setFormData(prev => ({ ...prev, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Imóvel Rural</Label>
                <Select value={formData.imovel_id} onValueChange={(v) => setFormData(prev => ({ ...prev, imovel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o imóvel..." /></SelectTrigger>
                  <SelectContent>
                    {imoveis.filter(i => i.nome_imovel).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.nome_imovel}{i.municipio ? ` - ${i.municipio}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Anotações, detalhes importantes..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando} className="bg-green-600 hover:bg-green-700">
              {salvando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : editandoDoc ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}