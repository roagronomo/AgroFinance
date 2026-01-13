import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Bell, Calendar, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export default function Lembretes() {
  const [lembretes, setLembretes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLembrete, setEditingLembrete] = useState(null);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data_evento: "",
    dias_antes_avisar: 7,
    telefone_contato: "",
    observacoes: "",
    ativo: true
  });

  useEffect(() => {
    carregarLembretes();
  }, []);

  const carregarLembretes = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.Lembrete.list("-data_evento");
      setLembretes(data || []);
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      toast.error("Erro ao carregar lembretes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = formData.valor ? parseFloat(formData.valor.replace(/\./g, '').replace(',', '.')) : null;
      const dados = {
        ...formData,
        valor: valorLimpo,
        dias_antes_avisar: parseInt(formData.dias_antes_avisar) || 7
      };

      if (editingLembrete) {
        await base44.entities.Lembrete.update(editingLembrete.id, dados);
        toast.success("Lembrete atualizado com sucesso!");
      } else {
        await base44.entities.Lembrete.create(dados);
        toast.success("Lembrete cadastrado com sucesso!");
      }

      await carregarLembretes();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar lembrete:", error);
      toast.error("Erro ao salvar lembrete");
    }
  };

  const handleEditar = (lembrete) => {
    setEditingLembrete(lembrete);
    setFormData({
      descricao: lembrete.descricao || "",
      valor: lembrete.valor ? formatarMoeda(lembrete.valor) : "",
      data_evento: lembrete.data_evento || "",
      dias_antes_avisar: lembrete.dias_antes_avisar || 7,
      telefone_contato: lembrete.telefone_contato || "",
      observacoes: lembrete.observacoes || "",
      ativo: lembrete.ativo !== false
    });
    setShowForm(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Deseja realmente excluir este lembrete?")) return;
    
    try {
      await base44.entities.Lembrete.delete(id);
      toast.success("Lembrete excluído com sucesso!");
      await carregarLembretes();
    } catch (error) {
      console.error("Erro ao excluir lembrete:", error);
      toast.error("Erro ao excluir lembrete");
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEditingLembrete(null);
    setFormData({
      descricao: "",
      valor: "",
      data_evento: "",
      dias_antes_avisar: 7,
      telefone_contato: "",
      observacoes: "",
      ativo: true
    });
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const numero = typeof valor === 'number' ? valor : parseFloat(valor.toString().replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '');
    setFormData({...formData, valor: formatarMoeda(parseFloat(valor) / 100)});
  };

  const formatarTelefone = (valor) => {
    const numero = valor.replace(/\D/g, '');
    if (numero.length <= 10) {
      return numero.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    return numero.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  };

  const handleTelefoneChange = (e) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setFormData({...formData, telefone_contato: valorFormatado});
  };

  const handleEnviarTeste = async () => {
    if (!formData.telefone_contato) {
      toast.error("Digite um número de telefone primeiro");
      return;
    }

    if (!formData.descricao || !formData.data_evento) {
      toast.error("Preencha a descrição e a data antes de testar");
      return;
    }

    setEnviandoTeste(true);
    try {
      const dataEvento = new Date(formData.data_evento + 'T00:00:00');
      const dataFormatada = format(dataEvento, 'dd/MM/yyyy');
      const valorTexto = formData.valor 
        ? `💰 *Valor:* R$ ${parseFloat(formData.valor.replace(/\./g, '').replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` 
        : '';

      const mensagemTeste = `🔔 *Lembrete Importante*

📋 *${formData.descricao}*

📅 *Data:* ${dataFormatada}
${valorTexto}
${formData.observacoes ? `📝 ${formData.observacoes}\n` : ''}
⏰ Este lembrete será enviado automaticamente ${formData.dias_antes_avisar} dia(s) antes e no dia do evento.

_Mensagem de teste - AgroFinance_`;

      const response = await base44.functions.invoke('enviarWhatsAppEvolution', {
        numero: formData.telefone_contato,
        mensagem: mensagemTeste
      });

      if (response.success) {
        toast.success("✅ Mensagem de teste enviada com sucesso!");
      } else {
        toast.error(`Erro: ${response.error || 'Falha ao enviar'}`);
      }
    } catch (error) {
      console.error("Erro ao enviar teste:", error);
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setEnviandoTeste(false);
    }
  };

  const calcularDiasRestantes = (dataEvento) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const evento = new Date(dataEvento + 'T00:00:00');
    return differenceInDays(evento, hoje);
  };

  const getStatusCor = (diasRestantes) => {
    if (diasRestantes < 0) return "bg-gray-100 text-gray-600";
    if (diasRestantes === 0) return "bg-red-100 text-red-800";
    if (diasRestantes <= 7) return "bg-orange-100 text-orange-800";
    if (diasRestantes <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusTexto = (diasRestantes) => {
    if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dia(s)`;
    if (diasRestantes === 0) return "Hoje!";
    if (diasRestantes === 1) return "Amanhã";
    return `${diasRestantes} dias`;
  };

  if (showForm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {editingLembrete ? "Editar Lembrete" : "Novo Lembrete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Descrição do Lembrete *</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Ex: Consórcio - Encerramento do Grupo"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    value={formData.valor}
                    onChange={handleValorChange}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <Label>Data do Evento *</Label>
                  <Input
                    type="date"
                    value={formData.data_evento}
                    onChange={(e) => setFormData({...formData, data_evento: e.target.value})}
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
                    value={formData.dias_antes_avisar}
                    onChange={(e) => setFormData({...formData, dias_antes_avisar: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Você será avisado nesta quantidade de dias antes E no dia do evento
                  </p>
                </div>

                <div>
                  <Label>Telefone/WhatsApp *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      value={formData.telefone_contato}
                      onChange={handleTelefoneChange}
                      placeholder="(62) 99999-9999"
                      maxLength={15}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEnviarTeste}
                      disabled={!formData.telefone_contato || enviandoTeste}
                      className="whitespace-nowrap"
                    >
                      {enviandoTeste ? "Enviando..." : "📱 Testar"}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                  placeholder="Informações adicionais sobre o lembrete..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Lembrete ativo (receberá notificações)
                </Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingLembrete ? "Atualizar" : "Cadastrar"}
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

  const lembretesAtivos = lembretes.filter(l => l.ativo !== false);
  const lembretesInativos = lembretes.filter(l => l.ativo === false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Lembretes</h1>
          <p className="text-gray-500 mt-1">{lembretesAtivos.length} lembrete(s) ativo(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lembrete
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Carregando...
          </CardContent>
        </Card>
      ) : lembretesAtivos.length === 0 && lembretesInativos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum lembrete cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {lembretesAtivos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Lembretes Ativos</h2>
              <div className="grid gap-4">
                {lembretesAtivos.map((lembrete) => {
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
                              <span className="flex items-center gap-1">
                                <Bell className="w-4 h-4" />
                                Avisar {lembrete.dias_antes_avisar} dia(s) antes
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {lembrete.telefone_contato}
                              </span>
                            </div>
                            {lembrete.observacoes && (
                              <p className="text-sm text-gray-500 mt-2">{lembrete.observacoes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditar(lembrete)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleExcluir(lembrete.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {lembretesInativos.length > 0 && (
            <div className="space-y-4 mt-8">
              <h2 className="text-lg font-semibold text-gray-500">Lembretes Inativos</h2>
              <div className="grid gap-4 opacity-60">
                {lembretesInativos.map((lembrete) => (
                  <Card key={lembrete.id} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-600">{lembrete.descricao}</h3>
                          <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <span>📅 {format(new Date(lembrete.data_evento + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                            {lembrete.valor && (
                              <span>💰 R$ {lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditar(lembrete)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(lembrete.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}