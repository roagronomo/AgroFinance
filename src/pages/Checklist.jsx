import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Building2,
  FileText
} from "lucide-react";

const bancos = [
  { value: "banco_do_brasil_private", label: "Banco do Brasil Private" },
  { value: "banco_do_brasil_varejo", label: "Banco do Brasil Varejo" },
  { value: "bradesco", label: "Banco Bradesco" },
  { value: "caixa_economica_federal", label: "Caixa Econômica Federal" },
  { value: "sicoob", label: "Banco Sicoob" },
  { value: "sicredi", label: "Banco Sicredi" }
];

export default function Checklist() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [templateEditando, setTemplateEditando] = useState(null);
  const [filtros, setFiltros] = useState({
    banco: "todos",
    tipoProjeto: ""
  });

  const [formulario, setFormulario] = useState({
    banco: "",
    tipo_projeto: "",
    nome_template: "",
    itens_checklist: [],
    ativo: true
  });

  const [novoItem, setNovoItem] = useState({
    item: "",
    obrigatorio: true,
    observacao: ""
  });

  useEffect(() => {
    carregarTemplates();
  }, []);

  const carregarTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.ChecklistTemplate.list("-created_date");
      setTemplates(data);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
    setIsLoading(false);
  };

  const iniciarNovo = () => {
    setFormulario({
      banco: "",
      tipo_projeto: "",
      nome_template: "",
      itens_checklist: [],
      ativo: true
    });
    setTemplateEditando(null);
    setModoEdicao(true);
  };

  const iniciarEdicao = (template) => {
    setFormulario({
      banco: template.banco,
      tipo_projeto: template.tipo_projeto,
      nome_template: template.nome_template,
      itens_checklist: template.itens_checklist || [],
      ativo: template.ativo !== false
    });
    setTemplateEditando(template);
    setModoEdicao(true);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setTemplateEditando(null);
    setFormulario({
      banco: "",
      tipo_projeto: "",
      nome_template: "",
      itens_checklist: [],
      ativo: true
    });
    setNovoItem({ item: "", obrigatorio: true, observacao: "" });
  };

  const adicionarItem = () => {
    if (!novoItem.item.trim()) return;

    setFormulario(prev => ({
      ...prev,
      itens_checklist: [...prev.itens_checklist, { ...novoItem }]
    }));

    setNovoItem({ item: "", obrigatorio: true, observacao: "" });
  };

  const removerItem = (index) => {
    setFormulario(prev => ({
      ...prev,
      itens_checklist: prev.itens_checklist.filter((_, i) => i !== index)
    }));
  };

  const salvarTemplate = async () => {
    if (!formulario.banco || !formulario.tipo_projeto || !formulario.nome_template) {
      alert("Preencha banco, tipo de projeto e nome do template");
      return;
    }

    try {
      if (templateEditando) {
        await base44.entities.ChecklistTemplate.update(templateEditando.id, formulario);
      } else {
        await base44.entities.ChecklistTemplate.create(formulario);
      }
      
      await carregarTemplates();
      cancelarEdicao();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      alert("Erro ao salvar template");
    }
  };

  const excluirTemplate = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este template?")) return;

    try {
      await base44.entities.ChecklistTemplate.delete(id);
      await carregarTemplates();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      alert("Erro ao excluir template");
    }
  };

  const templatesFiltrados = templates.filter(t => {
    const matchBanco = filtros.banco === "todos" || t.banco === filtros.banco;
    const matchTipo = !filtros.tipoProjeto || 
      t.tipo_projeto.toLowerCase().includes(filtros.tipoProjeto.toLowerCase());
    return matchBanco && matchTipo;
  });

  const getBancoLabel = (value) => {
    return bancos.find(b => b.value === value)?.label || value;
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-indigo-600" />
              Checklist de Projetos
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie checklists por banco e tipo de projeto
            </p>
          </div>
          <Button
            onClick={iniciarNovo}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Checklist
          </Button>
        </div>

        {modoEdicao ? (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {templateEditando ? "Editar Checklist" : "Novo Checklist"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Banco *
                  </label>
                  <Select
                    value={formulario.banco}
                    onValueChange={(value) => setFormulario(prev => ({ ...prev, banco: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map(banco => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Projeto *
                  </label>
                  <Input
                    placeholder="Ex: Custeio Agrícola, Investimento..."
                    value={formulario.tipo_projeto}
                    onChange={(e) => setFormulario(prev => ({ ...prev, tipo_projeto: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nome do Template *
                </label>
                <Input
                  placeholder="Ex: Checklist Custeio BB Private 2026"
                  value={formulario.nome_template}
                  onChange={(e) => setFormulario(prev => ({ ...prev, nome_template: e.target.value }))}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Itens do Checklist
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Novo Item
                    </label>
                    <Input
                      placeholder="Ex: Certidão de Regularidade Ambiental"
                      value={novoItem.item}
                      onChange={(e) => setNovoItem(prev => ({ ...prev, item: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observação (opcional)
                    </label>
                    <Textarea
                      placeholder="Observações sobre este item..."
                      value={novoItem.observacao}
                      onChange={(e) => setNovoItem(prev => ({ ...prev, observacao: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={novoItem.obrigatorio}
                      onCheckedChange={(checked) => setNovoItem(prev => ({ ...prev, obrigatorio: checked }))}
                    />
                    <label className="text-sm text-gray-700">
                      Item obrigatório
                    </label>
                  </div>

                  <Button
                    onClick={adicionarItem}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {formulario.itens_checklist.length > 0 && (
                  <div className="space-y-2">
                    {formulario.itens_checklist.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-white border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.item}</p>
                            {item.obrigatorio && (
                              <Badge variant="outline" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-sm text-gray-600 mt-1">{item.observacao}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => removerItem(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={salvarTemplate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Template
                </Button>
                <Button
                  onClick={cancelarEdicao}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Filtrar por Banco
                  </label>
                  <Select
                    value={filtros.banco}
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, banco: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Bancos</SelectItem>
                      {bancos.map(banco => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Buscar Tipo de Projeto
                  </label>
                  <Input
                    placeholder="Digite para buscar..."
                    value={filtros.tipoProjeto}
                    onChange={(e) => setFiltros(prev => ({ ...prev, tipoProjeto: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 mt-4">Carregando checklists...</p>
              </div>
            ) : templatesFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum checklist encontrado
                </h3>
                <p className="text-gray-500 mb-6">
                  Crie seu primeiro checklist de projeto
                </p>
                <Button onClick={iniciarNovo} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Checklist
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {templatesFiltrados.map(template => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {template.nome_template}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-indigo-100 text-indigo-700">
                              {getBancoLabel(template.banco)}
                            </Badge>
                            <Badge variant="outline">
                              {template.tipo_projeto}
                            </Badge>
                            {template.itens_checklist?.length > 0 && (
                              <Badge variant="outline" className="text-gray-600">
                                {template.itens_checklist.length} itens
                              </Badge>
                            )}
                          </div>

                          {template.itens_checklist?.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {template.itens_checklist.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                  <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                                  <span>{item.item}</span>
                                  {item.obrigatorio && (
                                    <span className="text-xs text-indigo-600">(obrigatório)</span>
                                  )}
                                </div>
                              ))}
                              {template.itens_checklist.length > 3 && (
                                <p className="text-xs text-gray-500 ml-4">
                                  + {template.itens_checklist.length - 3} itens
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => iniciarEdicao(template)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => excluirTemplate(template.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}