import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Bell, Calendar, DollarSign, FileText, Upload, Check, X, Undo2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import AutocompleteInput from "../components/common/AutocompleteInput";

export default function DespesasLembretes() {
  const [contas, setContas] = useState([]);
  const [lembretes, setLembretes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tipoForm, setTipoForm] = useState("conta"); // "conta" ou "lembrete"
  const [editingItem, setEditingItem] = useState(null);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [extraindoCodigo, setExtraindoCodigo] = useState(false);
  const [uploadingBoleto, setUploadingBoleto] = useState(false);
  const [uploadingRecibo, setUploadingRecibo] = useState(false);
  const [corrigindoTexto, setCorrigindoTexto] = useState({});
  const [sugestoes, setSugestoes] = useState({
    descricoes: [],
    fornecedores: [],
    categorias: []
  });

  const [formDataConta, setFormDataConta] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    dias_antes_avisar: 3,
    telefone_contato: "",
    codigo_barras: "",
    fornecedor: "",
    categoria: "",
    observacoes: "",
    ativo: true
  });

  const [formDataLembrete, setFormDataLembrete] = useState({
    descricao: "",
    valor: "",
    data_evento: "",
    dias_antes_avisar: 7,
    telefone_contato: "",
    observacoes: "",
    ativo: true
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    // Extrair sugestões únicas dos dados existentes
    const descricoesContas = [...new Set(contas.map(c => c.descricao).filter(Boolean))];
    const descricoesLembretes = [...new Set(lembretes.map(l => l.descricao).filter(Boolean))];
    const fornecedoresUnicos = [...new Set(contas.map(c => c.fornecedor).filter(Boolean))];
    const categoriasUnicas = [...new Set(contas.map(c => c.categoria).filter(Boolean))];
    
    setSugestoes({
      descricoes: [...new Set([...descricoesContas, ...descricoesLembretes])].sort(),
      fornecedores: fornecedoresUnicos.sort(),
      categorias: categoriasUnicas.sort()
    });
  }, [contas, lembretes]);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [contasData, lembretesData] = await Promise.all([
        base44.entities.ContaPagar.list("-data_vencimento"),
        base44.entities.Lembrete.list("-data_evento")
      ]);
      setContas(contasData || []);
      setLembretes(lembretesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const numero = typeof valor === 'number' ? valor : parseFloat(valor.toString().replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (valor, tipo) => {
    const valorLimpo = valor.replace(/\D/g, '');
    const valorFormatado = formatarMoeda(parseFloat(valorLimpo) / 100);
    
    if (tipo === "conta") {
      setFormDataConta({...formDataConta, valor: valorFormatado});
    } else {
      setFormDataLembrete({...formDataLembrete, valor: valorFormatado});
    }
  };

  const formatarTelefone = (valor) => {
    const numero = valor.replace(/\D/g, '');
    if (numero.length <= 10) {
      return numero.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    return numero.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  };

  const handleTelefoneChange = (valor, tipo) => {
    const valorFormatado = formatarTelefone(valor);
    if (tipo === "conta") {
      setFormDataConta({...formDataConta, telefone_contato: valorFormatado});
    } else {
      setFormDataLembrete({...formDataLembrete, telefone_contato: valorFormatado});
    }
  };

  const handleCorrecaoOrtografica = async (campo, tipo) => {
    const formData = tipo === "conta" ? formDataConta : formDataLembrete;
    const valor = formData[campo];

    if (!valor || valor.trim().length < 3) {
      return;
    }

    setCorrigindoTexto({...corrigindoTexto, [campo]: true});
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Corrija apenas os erros ortográficos e gramaticais do texto a seguir, mantendo o mesmo sentido e estilo. Retorne apenas o texto corrigido, sem explicações:

${valor}`
      });

      if (response && typeof response === 'string') {
        if (tipo === "conta") {
          setFormDataConta({...formDataConta, [campo]: response.trim()});
        } else {
          setFormDataLembrete({...formDataLembrete, [campo]: response.trim()});
        }
      }
    } catch (error) {
      console.error("Erro ao corrigir texto:", error);
    } finally {
      setCorrigindoTexto({...corrigindoTexto, [campo]: false});
    }
  };

  const handleUploadBoleto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    setUploadingBoleto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormDataConta({
        ...formDataConta,
        boleto_anexo: {
          url: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast.success("✓ Boleto anexado com sucesso", { duration: 2000 });
      
      // Extrair código de barras automaticamente
      setExtraindoCodigo(true);
      const response = await base44.functions.invoke('extrairCodigoBarras', { file_url });
      
      if (response.encontrado && response.codigo_barras) {
        setFormDataConta(prev => ({
          ...prev,
          codigo_barras: response.codigo_barras
        }));
        toast.success("✓ Código de barras extraído", { duration: 2000 });
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar boleto");
    } finally {
      setUploadingBoleto(false);
      setExtraindoCodigo(false);
    }
  };

  const handleUploadRecibo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingRecibo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormDataConta({
        ...formDataConta,
        recibo_anexo: {
          url: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast.success("✓ Recibo anexado com sucesso", { duration: 2000 });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar recibo");
    } finally {
      setUploadingRecibo(false);
    }
  };

  const handleSubmitConta = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = parseFloat(formDataConta.valor.replace(/\./g, '').replace(',', '.'));
      const dados = {
        ...formDataConta,
        valor: valorLimpo,
        dias_antes_avisar: parseInt(formDataConta.dias_antes_avisar) || 3
      };

      if (editingItem) {
        await base44.entities.ContaPagar.update(editingItem.id, dados);
        toast.success("Conta atualizada com sucesso!");
      } else {
        await base44.entities.ContaPagar.create(dados);
        toast.success("Conta cadastrada com sucesso!");
      }

      await carregarDados();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error("Erro ao salvar conta");
    }
  };

  const handleSubmitLembrete = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = formDataLembrete.valor ? parseFloat(formDataLembrete.valor.replace(/\./g, '').replace(',', '.')) : null;
      const dados = {
        ...formDataLembrete,
        valor: valorLimpo,
        dias_antes_avisar: parseInt(formDataLembrete.dias_antes_avisar) || 7
      };

      if (editingItem) {
        await base44.entities.Lembrete.update(editingItem.id, dados);
        toast.success("Lembrete atualizado com sucesso!");
      } else {
        await base44.entities.Lembrete.create(dados);
        toast.success("Lembrete cadastrado com sucesso!");
      }

      await carregarDados();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar lembrete:", error);
      toast.error("Erro ao salvar lembrete");
    }
  };

  const handleMarcarPago = async (contaId) => {
    if (!confirm("Tem certeza que deseja marcar esta conta como paga?")) return;
    
    try {
      await base44.entities.ContaPagar.update(contaId, {
        pago: true,
        data_pagamento: new Date().toISOString().split('T')[0]
      });
      toast.success("Conta marcada como paga!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar como pago");
    }
  };

  const handleDesmarcarPago = async (contaId) => {
    if (!confirm("Deseja retornar esta conta para 'Contas a Pagar'?")) return;
    
    try {
      await base44.entities.ContaPagar.update(contaId, {
        pago: false,
        data_pagamento: null
      });
      toast.success("Conta retornada para a pagar!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao desmarcar como pago:", error);
      toast.error("Erro ao processar");
    }
  };

  const handleEditarConta = (conta) => {
    setEditingItem(conta);
    setTipoForm("conta");
    setFormDataConta({
      descricao: conta.descricao || "",
      valor: conta.valor ? formatarMoeda(conta.valor) : "",
      data_vencimento: conta.data_vencimento || "",
      dias_antes_avisar: conta.dias_antes_avisar || 3,
      telefone_contato: conta.telefone_contato || "",
      codigo_barras: conta.codigo_barras || "",
      fornecedor: conta.fornecedor || "",
      categoria: conta.categoria || "",
      observacoes: conta.observacoes || "",
      ativo: conta.ativo !== false,
      boleto_anexo: conta.boleto_anexo || null,
      recibo_anexo: conta.recibo_anexo || null
    });
    setShowForm(true);
  };

  const handleExcluir = async (id, tipo) => {
    if (!confirm(`Deseja realmente excluir este ${tipo === 'conta' ? 'conta' : 'lembrete'}?`)) return;
    
    try {
      if (tipo === 'conta') {
        await base44.entities.ContaPagar.delete(id);
      } else {
        await base44.entities.Lembrete.delete(id);
      }
      toast.success("Item excluído com sucesso!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEditingItem(null);
    setTipoForm("conta");
    setFormDataConta({
      descricao: "",
      valor: "",
      data_vencimento: "",
      dias_antes_avisar: 3,
      telefone_contato: "",
      codigo_barras: "",
      fornecedor: "",
      categoria: "",
      observacoes: "",
      ativo: true
    });
    setFormDataLembrete({
      descricao: "",
      valor: "",
      data_evento: "",
      dias_antes_avisar: 7,
      telefone_contato: "",
      observacoes: "",
      ativo: true
    });
  };

  const calcularDiasRestantes = (data) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const evento = new Date(data + 'T00:00:00');
    return differenceInDays(evento, hoje);
  };

  const getStatusCor = (diasRestantes, pago = false) => {
    if (pago) return "bg-green-100 text-green-800";
    if (diasRestantes < 0) return "bg-red-100 text-red-800";
    if (diasRestantes === 0) return "bg-orange-100 text-orange-800";
    if (diasRestantes <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusTexto = (diasRestantes, pago = false) => {
    if (pago) return "Pago";
    if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dia(s)`;
    if (diasRestantes === 0) return "Vence Hoje!";
    if (diasRestantes === 1) return "Vence Amanhã";
    return `${diasRestantes} dias`;
  };

  const contasAtivas = contas.filter(c => !c.pago && c.ativo !== false);
  const contasPagas = contas.filter(c => c.pago);
  const lembretesAtivos = lembretes.filter(l => l.ativo !== false);

  if (showForm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Tabs value={tipoForm} onValueChange={setTipoForm}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="conta" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Conta a Pagar
            </TabsTrigger>
            <TabsTrigger value="lembrete" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Lembrete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {editingItem && tipoForm === "conta" ? "Editar Conta" : "Nova Conta a Pagar"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitConta} className="space-y-4">
                  <div>
                    <Label>Descrição *</Label>
                    <AutocompleteInput
                      value={formDataConta.descricao}
                      onChange={(e) => setFormDataConta({...formDataConta, descricao: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('descricao', 'conta')}
                      placeholder="Ex: Conta de energia elétrica"
                      suggestions={sugestoes.descricoes}
                      required
                      disabled={corrigindoTexto.descricao}
                    />
                    {corrigindoTexto.descricao && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Fornecedor</Label>
                      <AutocompleteInput
                        value={formDataConta.fornecedor}
                        onChange={(e) => setFormDataConta({...formDataConta, fornecedor: e.target.value})}
                        onBlur={() => handleCorrecaoOrtografica('fornecedor', 'conta')}
                        placeholder="Nome do fornecedor"
                        suggestions={sugestoes.fornecedores}
                        disabled={corrigindoTexto.fornecedor}
                      />
                      {corrigindoTexto.fornecedor && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                    </div>

                    <div>
                      <Label>Categoria</Label>
                      <AutocompleteInput
                        value={formDataConta.categoria}
                        onChange={(e) => setFormDataConta({...formDataConta, categoria: e.target.value})}
                        onBlur={() => handleCorrecaoOrtografica('categoria', 'conta')}
                        placeholder="Ex: Energia, Água, etc"
                        suggestions={sugestoes.categorias}
                        disabled={corrigindoTexto.categoria}
                      />
                      {corrigindoTexto.categoria && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input
                        value={formDataConta.valor}
                        onChange={(e) => handleValorChange(e.target.value, 'conta')}
                        placeholder="0,00"
                        required
                      />
                    </div>

                    <div>
                      <Label>Vencimento *</Label>
                      <Input
                        type="date"
                        value={formDataConta.data_vencimento}
                        onChange={(e) => setFormDataConta({...formDataConta, data_vencimento: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Avisar quantos dias antes? *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={formDataConta.dias_antes_avisar}
                        onChange={(e) => setFormDataConta({...formDataConta, dias_antes_avisar: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Aviso X dias antes + no dia do vencimento
                      </p>
                    </div>

                    <div>
                      <Label>Telefone/WhatsApp *</Label>
                      <Input
                        type="tel"
                        value={formDataConta.telefone_contato}
                        onChange={(e) => handleTelefoneChange(e.target.value, 'conta')}
                        placeholder="(62) 99999-9999"
                        maxLength={15}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold text-sm">Anexos</h3>
                    
                    <div>
                      <Label>Boleto (PDF)</Label>
                      <div className="mt-1">
                        <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingBoleto || extraindoCodigo 
                            ? 'bg-gray-50 border-gray-300 cursor-not-allowed' 
                            : formDataConta.boleto_anexo
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-green-400'
                        }`}>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleUploadBoleto}
                            disabled={uploadingBoleto || extraindoCodigo}
                            className="hidden"
                          />
                          {formDataConta.boleto_anexo ? (
                            <>
                              <Check className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">{formDataConta.boleto_anexo.file_name}</span>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-600">Clique para anexar boleto (PDF)</span>
                            </>
                          )}
                        </label>
                        {(uploadingBoleto || extraindoCodigo) && (
                          <p className="text-xs text-blue-600 mt-2 text-center">
                            {extraindoCodigo ? "🔍 Extraindo código de barras..." : "📤 Carregando arquivo..."}
                          </p>
                        )}
                      </div>
                    </div>

                    {formDataConta.codigo_barras && (
                      <div>
                        <Label>Código de Barras Extraído</Label>
                        <Input
                          value={formDataConta.codigo_barras}
                          onChange={(e) => setFormDataConta({...formDataConta, codigo_barras: e.target.value})}
                          placeholder="Será extraído automaticamente"
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">✨ Extraído automaticamente do PDF</p>
                      </div>
                    )}

                    <div>
                      <Label>Recibo de Pagamento</Label>
                      <div className="mt-1">
                        <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingRecibo
                            ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                            : formDataConta.recibo_anexo
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-green-400'
                        }`}>
                          <input
                            type="file"
                            onChange={handleUploadRecibo}
                            disabled={uploadingRecibo}
                            className="hidden"
                          />
                          {formDataConta.recibo_anexo ? (
                            <>
                              <Check className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">{formDataConta.recibo_anexo.file_name}</span>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-600">Clique para anexar recibo</span>
                            </>
                          )}
                        </label>
                        {uploadingRecibo && (
                          <p className="text-xs text-blue-600 mt-2 text-center">📤 Carregando arquivo...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formDataConta.observacoes}
                      onChange={(e) => setFormDataConta({...formDataConta, observacoes: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('observacoes', 'conta')}
                      rows={3}
                      disabled={corrigindoTexto.observacoes}
                    />
                    {corrigindoTexto.observacoes && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo-conta"
                      checked={formDataConta.ativo}
                      onChange={(e) => setFormDataConta({...formDataConta, ativo: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ativo-conta" className="cursor-pointer">
                      Ativo (receberá notificações)
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {editingItem ? "Atualizar" : "Cadastrar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelar}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lembrete">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {editingItem && tipoForm === "lembrete" ? "Editar Lembrete" : "Novo Lembrete"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitLembrete} className="space-y-4">
                  <div>
                    <Label>Descrição *</Label>
                    <AutocompleteInput
                      value={formDataLembrete.descricao}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, descricao: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('descricao', 'lembrete')}
                      placeholder="Ex: Consórcio - Encerramento do Grupo"
                      suggestions={sugestoes.descricoes}
                      required
                      disabled={corrigindoTexto.descricao}
                    />
                    {corrigindoTexto.descricao && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        value={formDataLembrete.valor}
                        onChange={(e) => handleValorChange(e.target.value, 'lembrete')}
                        placeholder="0,00 (opcional)"
                      />
                    </div>

                    <div>
                      <Label>Data do Evento *</Label>
                      <Input
                        type="date"
                        value={formDataLembrete.data_evento}
                        onChange={(e) => setFormDataLembrete({...formDataLembrete, data_evento: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Avisar quantos dias antes? *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formDataLembrete.dias_antes_avisar}
                        onChange={(e) => setFormDataLembrete({...formDataLembrete, dias_antes_avisar: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label>Telefone/WhatsApp *</Label>
                      <Input
                        type="tel"
                        value={formDataLembrete.telefone_contato}
                        onChange={(e) => handleTelefoneChange(e.target.value, 'lembrete')}
                        placeholder="(62) 99999-9999"
                        maxLength={15}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formDataLembrete.observacoes}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, observacoes: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('observacoes', 'lembrete')}
                      rows={3}
                      disabled={corrigindoTexto.observacoes}
                    />
                    {corrigindoTexto.observacoes && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo-lembrete"
                      checked={formDataLembrete.ativo}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, ativo: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ativo-lembrete" className="cursor-pointer">
                      Ativo (receberá notificações)
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {editingItem ? "Atualizar" : "Cadastrar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelar}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas e Lembretes</h1>
          <p className="text-gray-500 mt-1">
            {contasAtivas.length} conta(s) ativa(s) • {lembretesAtivos.length} lembrete(s) ativo(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setShowForm(true); setTipoForm("conta"); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
          <Button onClick={() => { setShowForm(true); setTipoForm("lembrete"); }} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lembrete
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="contas" className="w-full">
          <TabsList>
            <TabsTrigger value="contas">Contas a Pagar ({contasAtivas.length})</TabsTrigger>
            <TabsTrigger value="lembretes">Lembretes ({lembretesAtivos.length})</TabsTrigger>
            <TabsTrigger value="pagas">Pagas ({contasPagas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contas" className="space-y-4 mt-4">
            {contasAtivas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma conta a pagar cadastrada</p>
                </CardContent>
              </Card>
            ) : (
              contasAtivas.map((conta) => {
                const diasRestantes = calcularDiasRestantes(conta.data_vencimento);
                return (
                  <Card key={conta.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{conta.descricao}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusCor(diasRestantes)}`}>
                              {getStatusTexto(diasRestantes)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}
                            </span>
                            <span className="font-semibold text-red-600">
                              💰 R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {conta.fornecedor && <span>🏢 {conta.fornecedor}</span>}
                            {conta.categoria && <span className="text-blue-600">📂 {conta.categoria}</span>}
                            {conta.codigo_barras && <span className="text-green-600">🔢 Código extraído</span>}
                          </div>
                          {conta.observacoes && (
                            <p className="text-sm text-gray-500 mt-2">{conta.observacoes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditarConta(conta)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleMarcarPago(conta.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Marcar como pago"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(conta.id, 'conta')} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="lembretes" className="space-y-4 mt-4">
            {lembretesAtivos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum lembrete cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              lembretesAtivos.map((lembrete) => {
                const diasRestantes = calcularDiasRestantes(lembrete.data_evento);
                return (
                  <Card key={lembrete.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{lembrete.descricao}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusCor(diasRestantes)}`}>
                              {getStatusTexto(diasRestantes)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(lembrete.data_evento + 'T00:00:00'), 'dd/MM/yyyy')}
                            </span>
                            {lembrete.valor && (
                              <span className="font-semibold text-green-600">
                                💰 R$ {lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            <span>🔔 {lembrete.dias_antes_avisar} dia(s) antes</span>
                          </div>
                          {lembrete.observacoes && (
                            <p className="text-sm text-gray-500 mt-2">{lembrete.observacoes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(lembrete.id, 'lembrete')} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="pagas" className="space-y-4 mt-4">
            {contasPagas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Check className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma conta paga</p>
                </CardContent>
              </Card>
            ) : (
              contasPagas.map((conta) => (
                <Card key={conta.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-700">{conta.descricao}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Pago
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Vencimento: {format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                          {conta.data_pagamento && (
                            <span>Pago em: {format(new Date(conta.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                          )}
                          <span className="font-semibold">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDesmarcarPago(conta.id)}
                          className="text-orange-600 hover:text-orange-700"
                          title="Retornar para a pagar"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleExcluir(conta.id, 'conta')} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}