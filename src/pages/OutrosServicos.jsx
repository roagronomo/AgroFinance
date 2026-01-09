import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OutrosServicos() {
  const [servicos, setServicos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [busca, setBusca] = useState("");
  const [formData, setFormData] = useState({
    cliente_nome: "",
    data_protocolo: "",
    status: "em_analise",
    banco: "",
    valor_receber: "",
    descricao_servico: ""
  });

  useEffect(() => {
    carregarServicos();
  }, []);

  const carregarServicos = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.OutroServico.list("-data_protocolo");
      setServicos(data || []);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dados = {
        ...formData,
        valor_receber: parseFloat(formData.valor_receber) || 0
      };

      if (editingServico) {
        await base44.entities.OutroServico.update(editingServico.id, dados);
        toast.success("Serviço atualizado com sucesso!");
      } else {
        await base44.entities.OutroServico.create(dados);
        toast.success("Serviço cadastrado com sucesso!");
      }

      await carregarServicos();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      toast.error("Erro ao salvar serviço");
    }
  };

  const handleEditar = (servico) => {
    setEditingServico(servico);
    setFormData({
      cliente_nome: servico.cliente_nome || "",
      data_protocolo: servico.data_protocolo || "",
      status: servico.status || "em_analise",
      banco: servico.banco || "",
      valor_receber: servico.valor_receber?.toString() || "",
      descricao_servico: servico.descricao_servico || ""
    });
    setShowForm(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Deseja realmente excluir este serviço?")) return;
    
    try {
      await base44.entities.OutroServico.delete(id);
      toast.success("Serviço excluído com sucesso!");
      await carregarServicos();
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      toast.error("Erro ao excluir serviço");
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEditingServico(null);
    setFormData({
      cliente_nome: "",
      data_protocolo: "",
      status: "em_analise",
      banco: "",
      valor_receber: "",
      descricao_servico: ""
    });
  };

  const servicosFiltrados = servicos.filter(s => 
    s.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    s.descricao_servico?.toLowerCase().includes(busca.toLowerCase()) ||
    s.banco?.toLowerCase().includes(busca.toLowerCase())
  );

  const getStatusLabel = (status) => {
    const labels = {
      em_analise: "Em Análise",
      parado: "Parado",
      concluido: "Concluído",
      cancelado: "Cancelado"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      em_analise: "bg-blue-100 text-blue-800",
      parado: "bg-yellow-100 text-yellow-800",
      concluido: "bg-green-100 text-green-800",
      cancelado: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (showForm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editingServico ? "Editar Serviço" : "Novo Serviço"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={formData.cliente_nome}
                    onChange={(e) => setFormData({...formData, cliente_nome: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Data do Protocolo *</Label>
                  <Input
                    type="date"
                    value={formData.data_protocolo}
                    onChange={(e) => setFormData({...formData, data_protocolo: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="parado">Parado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Banco</Label>
                  <Input
                    value={formData.banco}
                    onChange={(e) => setFormData({...formData, banco: e.target.value})}
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <Label>Valor a Receber *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_receber}
                    onChange={(e) => setFormData({...formData, valor_receber: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Descrição do Serviço *</Label>
                <Textarea
                  value={formData.descricao_servico}
                  onChange={(e) => setFormData({...formData, descricao_servico: e.target.value})}
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingServico ? "Atualizar" : "Cadastrar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelar}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outros Serviços</h1>
          <p className="text-gray-500 mt-1">{servicosFiltrados.length} serviço(s) encontrado(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, banco ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Carregando...
          </CardContent>
        </Card>
      ) : servicosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum serviço encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {servicosFiltrados.map((servico) => (
            <Card key={servico.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{servico.cliente_nome}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(servico.status)}`}>
                        {getStatusLabel(servico.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{servico.descricao_servico}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>📅 {format(new Date(servico.data_protocolo + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                      {servico.banco && <span>🏦 {servico.banco}</span>}
                      <span className="font-semibold text-green-600">
                        💰 R$ {servico.valor_receber?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditar(servico)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExcluir(servico.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}