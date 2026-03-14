import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Lock, Calendar as CalendarIcon, Check, DollarSign, Copy, CreditCard } from "lucide-react";
import { toast, Toaster } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIN_CORRETO = "996138";
const GRUPO_ID = "120363424659062662@g.us";

function PinModal({ onSuccess }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [erro, setErro] = useState("");
  const inputs = useRef([]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const novo = [...digits];
    novo[idx] = val;
    setDigits(novo);
    setErro("");
    if (val && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
    if (novo.every(d => d !== "")) {
      const pin = novo.join("");
      if (pin === PIN_CORRETO) {
        onSuccess();
      } else {
        setErro("PIN incorreto. Tente novamente.");
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 100);
      }
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-lg">Área Restrita</CardTitle>
          <p className="text-sm text-gray-500">Digite o PIN de 6 dígitos</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center">
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={el => inputs.current[idx] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-gray-800 focus:outline-none"
              />
            ))}
          </div>
          {erro && (
            <p className="text-center text-sm text-red-600 font-medium">{erro}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const formInicial = {
  descricao: "",
  valor: "",
  data_vencimento: "",
  dias_antes_avisar: 3,
  fornecedor: "",
  categoria: "",
  chave_pix: "",
  codigo_barras: "",
  observacoes: "",
  ativo: true,
  recorrente: false,
  parcelas_total: "",
};

export default function DespesasPrivadas() {
  const [autenticado, setAutenticado] = useState(false);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(formInicial);
  const [dialogExcluir, setDialogExcluir] = useState(null);
  const [showGruposWhatsApp, setShowGruposWhatsApp] = useState(false);
  const [gruposWhatsApp, setGruposWhatsApp] = useState([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);

  useEffect(() => {
    if (autenticado) carregarDados();
  }, [autenticado]);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.ContaPagar.filter({ privado: true }, "data_vencimento");
      setContas(data || []);
    } catch (e) {
      toast.error("Erro ao carregar despesas");
    } finally {
      setIsLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "";
    const n = typeof valor === "number" ? valor : parseFloat(String(valor).replace(/\./g, "").replace(",", ".")) || 0;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (val) => {
    const limpo = val.replace(/\D/g, "");
    const formatado = limpo ? formatarMoeda(parseFloat(limpo) / 100) : "";
    setFormData(f => ({ ...f, valor: formatado }));
  };

  const calcularDiasRestantes = (data) => {
    if (!data) return -999;
    try {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const d = new Date(data + "T00:00:00");
      return differenceInDays(d, hoje);
    } catch { return -999; }
  };

  const getStatusInfo = (conta) => {
    if (conta.pago) return { label: "Pago", cls: "bg-green-100 text-green-800" };
    const dias = calcularDiasRestantes(conta.data_vencimento);
    if (dias < 0) return { label: `Vencido (${Math.abs(dias)}d)`, cls: "bg-red-100 text-red-800" };
    if (dias === 0) return { label: "Vence Hoje", cls: "bg-orange-100 text-orange-800" };
    if (dias <= 3) return { label: `${dias} dias`, cls: "bg-yellow-100 text-yellow-800" };
    return { label: `${dias} dias`, cls: "bg-blue-100 text-blue-800" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = parseFloat(String(formData.valor).replace(/\./g, "").replace(",", ".")) || 0;
      const dados = {
        ...formData,
        valor: valorLimpo,
        dias_antes_avisar: parseInt(formData.dias_antes_avisar) || 3,
        parcelas_total: formData.recorrente ? parseInt(formData.parcelas_total) : null,
        privado: true,
        grupo_whatsapp_id: GRUPO_ID,
      };
      if (editingItem) {
        await base44.entities.ContaPagar.update(editingItem.id, dados);
        toast.success("Despesa atualizada!");
      } else {
        await base44.entities.ContaPagar.create(dados);
        toast.success("Despesa criada!");
      }
      await carregarDados();
      handleCancelar();
    } catch (e) {
      toast.error("Erro ao salvar despesa");
    }
  };

  const handleEditar = (conta) => {
    setEditingItem(conta);
    setFormData({
      descricao: conta.descricao || "",
      valor: conta.valor ? formatarMoeda(conta.valor) : "",
      data_vencimento: conta.data_vencimento || "",
      dias_antes_avisar: conta.dias_antes_avisar || 3,
      fornecedor: conta.fornecedor || "",
      categoria: conta.categoria || "",
      chave_pix: conta.chave_pix || "",
      codigo_barras: conta.codigo_barras || "",
      observacoes: conta.observacoes || "",
      ativo: conta.ativo !== false,
      recorrente: conta.recorrente || false,
      parcelas_total: conta.parcelas_total || "",
    });
    setShowForm(true);
  };

  const handleExcluir = async () => {
    if (!dialogExcluir) return;
    try {
      await base44.entities.ContaPagar.delete(dialogExcluir);
      toast.success("Despesa excluída!");
      await carregarDados();
    } catch (e) {
      toast.error("Erro ao excluir");
    } finally {
      setDialogExcluir(null);
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData(formInicial);
  };

  const handleVerGruposWhatsApp = async () => {
    setShowGruposWhatsApp(true);
    setCarregandoGrupos(true);
    try {
      const response = await base44.functions.invoke('buscarGruposWhatsApp', {});
      if (!response.error && response.grupos && response.grupos.length > 0) {
        setGruposWhatsApp(response.grupos);
        toast.success(`${response.grupos.length} grupos atualizados`);
      } else {
        const gruposBD = await base44.entities.GrupoWhatsApp.list('-ultima_atualizacao');
        setGruposWhatsApp(gruposBD.map(g => ({ id: g.grupo_id, subject: g.nome })));
        toast.warning('API indisponível. Usando grupos salvos.');
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setCarregandoGrupos(false);
    }
  };

  if (!autenticado) {
    return <PinModal onSuccess={() => setAutenticado(true)} />;
  }

  if (showForm) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Toaster position="top-right" richColors />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {editingItem ? "Editar Despesa Privada" : "Nova Despesa Privada"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Descrição *</Label>
                <Input value={formData.descricao} onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição da despesa" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input value={formData.valor} onChange={e => handleValorChange(e.target.value)} placeholder="0,00" required />
                </div>
                <div>
                  <Label>Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal ${!formData.data_vencimento && "text-muted-foreground"}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_vencimento ? format(new Date(formData.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={ptBR}
                        selected={formData.data_vencimento ? new Date(formData.data_vencimento + "T00:00:00") : undefined}
                        onSelect={date => date && setFormData(f => ({ ...f, data_vencimento: format(date, "yyyy-MM-dd") }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={formData.fornecedor} onChange={e => setFormData(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome do fornecedor" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={formData.categoria} onChange={e => setFormData(f => ({ ...f, categoria: e.target.value }))} placeholder="Categoria" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chave PIX</Label>
                  <Input value={formData.chave_pix} onChange={e => setFormData(f => ({ ...f, chave_pix: e.target.value }))} placeholder="Chave PIX" />
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Input value={formData.codigo_barras} onChange={e => setFormData(f => ({ ...f, codigo_barras: e.target.value }))} placeholder="Código de barras" className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Avisar quantos dias antes?</Label>
                <Input type="number" min="1" max="30" value={formData.dias_antes_avisar} onChange={e => setFormData(f => ({ ...f, dias_antes_avisar: e.target.value }))} className="w-20" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="recorrente" checked={formData.recorrente} onChange={e => setFormData(f => ({ ...f, recorrente: e.target.checked }))} className="w-4 h-4" />
                <Label htmlFor="recorrente" className="cursor-pointer">Pagamento Recorrente</Label>
              </div>
              {formData.recorrente && (
                <div>
                  <Label>Qtd. Parcelas</Label>
                  <Input type="number" min="2" max="120" value={formData.parcelas_total} onChange={e => setFormData(f => ({ ...f, parcelas_total: e.target.value }))} placeholder="Ex: 12" className="w-24" />
                </div>
              )}
              <div>
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={e => setFormData(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={formData.ativo} onChange={e => setFormData(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="bg-gray-900 hover:bg-gray-800">{editingItem ? "Atualizar" : "Cadastrar"}</Button>
                <Button type="button" variant="outline" onClick={handleCancelar}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Toaster position="top-right" richColors />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-6 h-6 text-gray-600" /> Despesas Privadas
          </h1>
          <p className="text-gray-500 text-sm mt-1">{contas.length} despesa(s) privada(s)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleVerGruposWhatsApp} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            👥 Ver Grupos WhatsApp
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-gray-900 hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa Privada
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-gray-500">Carregando...</CardContent></Card>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma despesa privada cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma Pgto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contas.map(conta => {
                    const status = getStatusInfo(conta);
                    return (
                      <tr key={conta.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {conta.descricao}
                          {conta.fornecedor && <span className="block text-xs text-gray-400">{conta.fornecedor}</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          R$ {conta.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {conta.data_vencimento ? format(new Date(conta.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {conta.chave_pix || conta.categoria || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditar(conta)} className="text-blue-600 h-8 w-8">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDialogExcluir(conta.id)} className="text-red-600 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showGruposWhatsApp} onOpenChange={(open) => !open && setShowGruposWhatsApp(false)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>👥 Grupos do WhatsApp Disponíveis</AlertDialogTitle>
            <AlertDialogDescription>IDs dos grupos para usar nas configurações</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {carregandoGrupos ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Carregando grupos...</p>
              </div>
            ) : gruposWhatsApp.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Nenhum grupo encontrado</p>
            ) : (
              gruposWhatsApp.map((grupo) => (
                <div key={grupo.id} className="border rounded-lg p-4 hover:bg-gray-50 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{grupo.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">{grupo.id}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(grupo.id); toast.success("ID copiado!"); }} className="shrink-0">
                    <Copy className="w-3 h-3 mr-1" /> Copiar ID
                  </Button>
                </div>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!dialogExcluir} onOpenChange={open => !open && setDialogExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}