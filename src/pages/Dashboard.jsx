import React, { useState, useEffect, useMemo } from "react";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  FileText,
  Plus,
  Building2,
  Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import EstatisticasGerais from "../components/dashboard/EstatisticasGerais";
import ProjetosRecentes from "../components/dashboard/ProjetosRecentes";
import StatusDistribuicao from "../components/dashboard/StatusDistribuicao";

export default function Dashboard() {
  const [todosProjetos, setTodosProjetos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState("todos");
  const [filtroModal, setFiltroModal] = useState(null);

  useEffect(() => {
    carregarTodosProjetos();
  }, []);

  useEffect(() => {
    if (todosProjetos.length > 0) {
      if (anoSelecionado === "todos") {
        setProjetos(todosProjetos);
      } else {
        const projetosFiltrados = todosProjetos.filter(p => 
          p.data_protocolo && !isNaN(new Date(p.data_protocolo)) &&
          new Date(p.data_protocolo).getFullYear().toString() === anoSelecionado
        );
        setProjetos(projetosFiltrados);
      }
    }
  }, [todosProjetos, anoSelecionado]);

  const carregarTodosProjetos = async () => {
    setIsLoading(true);
    try {
      const data = await ProjetoFinanciamento.list("-created_date");
      setTodosProjetos(data);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
    setIsLoading(false);
  };

  const anosDisponiveis = useMemo(() => {
    if (todosProjetos.length === 0) return [];
    const anos = todosProjetos
      .map(p => p.data_protocolo && !isNaN(new Date(p.data_protocolo)) ? new Date(p.data_protocolo).getFullYear() : null)
      .filter(ano => ano !== null);
    return [...new Set(anos)].sort((a, b) => b - a);
  }, [todosProjetos]);

  const yearOptions = anosDisponiveis.map(ano => ({
    value: ano.toString(),
    label: ano.toString()
  }));

  const getYearDisplayValue = () => {
    if (anoSelecionado === "todos") {
      return "Todos os Anos";
    }
    const selectedOption = yearOptions.find(option => option.value === anoSelecionado);
    return selectedOption?.label ?? anoSelecionado;
  };

  const calcularEstatisticas = () => {
    const projetosComTaxa = projetos.filter(p => typeof p.taxa_juros === 'number' && p.taxa_juros > 0);
    const taxaMedia = projetosComTaxa.length > 0 
      ? (projetosComTaxa.reduce((sum, p) => sum + p.taxa_juros, 0) / projetosComTaxa.length) 
      : 0;

    return {
      total: projetos.length,
      emAnalise: projetos.filter(p => p.status === "em_analise").length,
      concluidos: projetos.filter(p => p.status === "concluido").length,
      cancelados: projetos.filter(p => p.status === "cancelado").length,
      valorTotalFinanciado: projetos
        .filter(p => p.status !== 'cancelado')
        .reduce((sum, p) => sum + (p.valor_financiado || 0), 0),
      valorTotalReceber: projetos.reduce((sum, p) => sum + (p.valor_receber || 0), 0),
      valorAReceber: projetos
        .filter(p => p.status === 'em_analise')
        .reduce((sum, p) => sum + (p.valor_receber || 0), 0),
      valorRecebido: projetos
        .filter(p => p.status === 'concluido')
        .reduce((sum, p) => sum + (p.valor_receber || 0), 0),
      taxaJurosMedia: taxaMedia,
    };
  };

  const stats = calcularEstatisticas();

  const handleCardClick = (tipo) => {
    setFiltroModal(tipo);
  };

  const projetosFiltradosModal = useMemo(() => {
    if (!filtroModal) return [];
    
    switch (filtroModal) {
      case 'em_analise':
        return projetos.filter(p => p.status === 'em_analise');
      case 'concluido':
        return projetos.filter(p => p.status === 'concluido');
      case 'todos':
        return projetos;
      default:
        return [];
    }
  }, [filtroModal, projetos]);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-green-900 mb-2">
              Dashboard de Projetos
            </h1>
            <p className="text-green-600 text-lg">
              {anoSelecionado === 'todos' ? 'Visão geral de todos os anos' : `Resumo do ano de ${anoSelecionado}`}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-40">
              <Select 
                value={anoSelecionado === "todos" ? "" : anoSelecionado} 
                onValueChange={(value) => setAnoSelecionado(value || "todos")}
              >
                <SelectTrigger className="border-green-300 text-green-700 hover:bg-green-50 bg-white">
                  <SelectValue>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {getYearDisplayValue()}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos os Anos</SelectItem>
                  {yearOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Link to={createPageUrl("NovoProjeto")} className="flex-1 md:flex-none">
              <Button className="w-full bg-green-600 hover:bg-green-700 shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Novo Projeto
              </Button>
            </Link>
            <Link to={createPageUrl("TodosProjetos")} className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                <FileText className="w-5 h-5 mr-2" />
                Ver Todos
              </Button>
            </Link>
          </div>
        </div>

        <EstatisticasGerais 
          stats={stats} 
          isLoading={isLoading}
          onCardClick={handleCardClick}
        />

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <ProjetosRecentes 
              projetos={projetos.slice(0, 5)} 
              isLoading={isLoading} 
              onUpdate={carregarTodosProjetos}
            />
          </div>
          <div>
            <StatusDistribuicao stats={stats} isLoading={isLoading} todosProjetos={todosProjetos} />
          </div>
        </div>
      </div>

      {filtroModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setFiltroModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {filtroModal === 'em_analise' && 'Projetos em Análise'}
                    {filtroModal === 'concluido' && 'Projetos Concluídos'}
                    {filtroModal === 'todos' && 'Todos os Projetos'}
                  </h2>
                  <p className="text-green-100">
                    {projetosFiltradosModal.length} projeto(s) encontrado(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFiltroModal(null)}
                  className="text-white hover:bg-white/20"
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              {projetosFiltradosModal.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhum projeto encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projetosFiltradosModal.map((projeto) => (
                    <Card key={projeto.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-green-900 mb-2">
                              {projeto.nome_cliente}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-gray-600">Item: </span>
                                <span className="font-medium text-gray-800">{projeto.item_financiado}</span>
                              </div>
                              {projeto.numero_contrato && (
                                <div>
                                  <span className="text-gray-600">Contrato: </span>
                                  <span className="font-medium text-gray-800">{projeto.numero_contrato}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Banco: </span>
                                <span className="font-medium text-gray-800">
                                  {projeto.banco === 'banco_do_brasil' && 'Banco do Brasil'}
                                  {projeto.banco === 'caixa' && 'Caixa Econômica'}
                                  {projeto.banco === 'bradesco' && 'Bradesco'}
                                  {projeto.banco === 'sicoob' && 'Sicoob'}
                                  {projeto.banco === 'sicredi' && 'Sicredi'}
                                  {projeto.banco === 'santander' && 'Santander'}
                                  {projeto.banco === 'outros' && 'Outros'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Valor: </span>
                                <span className="font-bold text-green-700">
                                  R$ {(projeto.valor_financiado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {projeto.valor_receber && (
                                <div>
                                  <span className="text-gray-600">A Receber: </span>
                                  <span className="font-bold text-yellow-600">
                                    R$ {projeto.valor_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {projeto.data_protocolo && (
                                <div>
                                  <span className="text-gray-600">Protocolo: </span>
                                  <span className="font-medium text-gray-800">
                                    {format(new Date(projeto.data_protocolo), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex lg:flex-col gap-2">
                            <Link to={createPageUrl("EditarProjeto") + `?id=${projeto.id}`} className="flex-1 lg:flex-none">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-green-300 text-green-700 hover:bg-green-50"
                              >
                                Ver Detalhes
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}