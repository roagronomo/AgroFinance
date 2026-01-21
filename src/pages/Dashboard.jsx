import React, { useState, useEffect, useMemo } from "react";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { base44 } from "@/api/base44Client";
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
  Calendar,
  Bell,
  Cake
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import EstatisticasGerais from "../components/dashboard/EstatisticasGerais";
import ProjetosRecentes from "../components/dashboard/ProjetosRecentes";
import StatusDistribuicao from "../components/dashboard/StatusDistribuicao";
import AlertasVencimentos from "../components/dashboard/AlertasVencimentos";

export default function Dashboard() {
  const [todosProjetos, setTodosProjetos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [filtroModal, setFiltroModal] = useState(null);

  const [outrosServicos, setOutrosServicos] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);

  useEffect(() => {
    carregarTodosProjetos();
    carregarOutrosServicos();
    carregarContasPagar();
    carregarAniversariantes();
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

  const carregarOutrosServicos = async () => {
    try {
      const data = await base44.entities.OutroServico.list("-data_protocolo");
      setOutrosServicos(data || []);
    } catch (error) {
      console.error("Erro ao carregar outros serviços:", error);
    }
  };

  const carregarContasPagar = async () => {
    try {
      const data = await base44.entities.ContaPagar.filter({ pago: false, ativo: true }, 'data_vencimento');
      setContasPagar(data || []);
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
    }
  };

  const carregarAniversariantes = async () => {
    try {
      const clientes = await base44.entities.Cliente.list();
      const mesAtual = new Date().getMonth() + 1;
      
      const aniversariantesMes = clientes
        .filter(c => c.data_nascimento)
        .map(c => {
          const dataNasc = new Date(c.data_nascimento + 'T00:00:00');
          return {
            nome: c.nome,
            dia: dataNasc.getDate(),
            mes: dataNasc.getMonth() + 1,
            dataNasc: dataNasc
          };
        })
        .filter(a => a.mes === mesAtual)
        .sort((a, b) => a.dia - b.dia);
      
      setAniversariantes(aniversariantesMes);
    } catch (error) {
      console.error("Erro ao carregar aniversariantes:", error);
    }
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

    // Filtrar outros serviços pelo ano selecionado
    const servicosFiltrados = anoSelecionado === "todos" 
      ? outrosServicos 
      : outrosServicos.filter(s => 
          s.data_protocolo && !isNaN(new Date(s.data_protocolo)) &&
          new Date(s.data_protocolo).getFullYear().toString() === anoSelecionado
        );

    // Calcular valores dos outros serviços
    const valorReceberServicos = servicosFiltrados.reduce((sum, s) => sum + (s.valor_receber || 0), 0);
    const valorAReceberServicos = servicosFiltrados
      .filter(s => s.status === 'em_analise')
      .reduce((sum, s) => sum + (s.valor_receber || 0), 0);
    const valorRecebidoServicos = servicosFiltrados
      .filter(s => s.status === 'concluido')
      .reduce((sum, s) => sum + (s.valor_receber || 0), 0);
    
    // Calcular valores recebidos ASTEC por data de pagamento (usar TODOS os projetos, não apenas os filtrados por ano de protocolo)
    const projetosRecebidos = todosProjetos.filter(p => {
      if (!p.data_pagamento_astec) return false;
      
      const dataPagamento = new Date(p.data_pagamento_astec + 'T00:00:00');
      const anoPagamento = dataPagamento.getFullYear();
      
      // Se filtro "todos", considerar todos os pagamentos
      if (anoSelecionado === "todos") return true;
      
      // Se filtro por ano específico, considerar apenas pagamentos daquele ano
      return anoPagamento.toString() === anoSelecionado;
    });
    
    const valorRecebidoASTEC = projetosRecebidos.reduce((sum, p) => sum + (p.valor_receber || 0), 0);

    return {
      total: projetos.length,
      emAnalise: projetos.filter(p => p.status === "em_analise").length,
      concluidos: projetos.filter(p => p.status === "concluido").length,
      cancelados: projetos.filter(p => p.status === "cancelado").length,
      valorTotalFinanciado: projetos
        .filter(p => p.status !== 'cancelado')
        .reduce((sum, p) => sum + (p.valor_financiado || 0), 0),
      valorTotalReceber: projetos.reduce((sum, p) => sum + (p.valor_receber || 0), 0) + valorReceberServicos,
      valorAReceber: projetos
        .filter(p => p.status === 'em_analise')
        .reduce((sum, p) => sum + (p.valor_receber || 0), 0) + valorAReceberServicos,
      valorRecebido: valorRecebidoASTEC + valorRecebidoServicos,
      quantidadeRecebidos: projetosRecebidos.length + servicosFiltrados.filter(s => s.status === 'concluido').length,
      quantidadeRecebidosTexto: (() => {
        const qtdProjetos = projetosRecebidos.length;
        const qtdServicos = servicosFiltrados.filter(s => s.status === 'concluido').length;
        if (qtdProjetos > 0 && qtdServicos > 0) {
          return `${qtdProjetos} projeto(s) + ${qtdServicos} serviço(s)`;
        } else if (qtdProjetos > 0) {
          return `${qtdProjetos} projeto(s)`;
        } else if (qtdServicos > 0) {
          return `${qtdServicos} serviço(s)`;
        }
        return '0 itens';
      })(),
      taxaJurosMedia: taxaMedia,
    };
  };

  const stats = calcularEstatisticas();

  const handleCardClick = (tipo) => {
    setFiltroModal(tipo);
  };

  const projetosFiltradosModal = useMemo(() => {
    if (!filtroModal) return { projetos: [], servicos: [] };
    
    // Filtrar outros serviços pelo ano selecionado
    const servicosFiltrados = anoSelecionado === "todos" 
      ? outrosServicos 
      : outrosServicos.filter(s => 
          s.data_protocolo && !isNaN(new Date(s.data_protocolo)) &&
          new Date(s.data_protocolo).getFullYear().toString() === anoSelecionado
        );
    
    switch (filtroModal) {
      case 'em_analise':
        return {
          projetos: projetos.filter(p => p.status === 'em_analise'),
          servicos: servicosFiltrados.filter(s => s.status === 'em_analise')
        };
      case 'recebido':
        // Filtrar projetos que tiveram pagamento ASTEC no período selecionado
        const projetosComPagamento = todosProjetos.filter(p => {
          if (!p.data_pagamento_astec) return false;
          
          const dataPagamento = new Date(p.data_pagamento_astec + 'T00:00:00');
          const anoPagamento = dataPagamento.getFullYear();
          
          if (anoSelecionado === "todos") return true;
          return anoPagamento.toString() === anoSelecionado;
        });
        
        return {
          projetos: projetosComPagamento,
          servicos: servicosFiltrados.filter(s => s.status === 'concluido')
        };
      case 'concluido':
        return {
          projetos: projetos.filter(p => p.status === 'concluido'),
          servicos: servicosFiltrados.filter(s => s.status === 'concluido')
        };
      case 'todos':
        return {
          projetos: projetos,
          servicos: servicosFiltrados
        };
      default:
        return { projetos: [], servicos: [] };
    }
  }, [filtroModal, projetos, todosProjetos, outrosServicos, anoSelecionado]);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-green-900 mb-2">
              Painel de Projetos
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
          <div className="lg:col-span-2 space-y-6">
            <ProjetosRecentes 
              projetos={projetos.slice(0, 5)} 
              isLoading={isLoading} 
              onUpdate={carregarTodosProjetos}
            />
            <AlertasVencimentos />
          </div>
          <div className="space-y-6">
            <StatusDistribuicao stats={stats} isLoading={isLoading} todosProjetos={todosProjetos} outrosServicos={outrosServicos} />
            
            {/* Card de Aniversariantes do Mês */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cake className="w-5 h-5 text-pink-600" />
                  Aniversariantes do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aniversariantes.length === 0 ? (
                  <div className="text-center py-6">
                    <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 text-sm">Nenhum aniversariante este mês</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {aniversariantes.map((aniv, index) => {
                      const hoje = new Date().getDate();
                      const isHoje = aniv.dia === hoje;
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            isHoje ? 'bg-pink-50 border-2 border-pink-300' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">
                              {aniv.nome}
                            </p>
                            {isHoje && (
                              <p className="text-xs text-pink-600 font-semibold">
                                🎉 Aniversário HOJE!
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-pink-600">
                              Dia {aniv.dia}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Card de Contas a Pagar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Contas a Pagar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contasPagar.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Nenhuma conta a pagar</p>
                ) : (
                  <div className="space-y-2">
                    {contasPagar.slice(0, 5).map((conta) => {
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const vencimento = new Date(conta.data_vencimento + 'T00:00:00');
                      const diasRestantes = differenceInDays(vencimento, hoje);
                      const isVencido = diasRestantes < 0;
                      const isHoje = diasRestantes === 0;
                      const isProximo = diasRestantes > 0 && diasRestantes <= 3;
                      
                      return (
                        <div 
                          key={conta.id} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            isVencido ? 'bg-red-50 border border-red-200' :
                            isHoje ? 'bg-orange-50 border border-orange-200' :
                            isProximo ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{conta.descricao}</p>
                            <p className="text-xs text-gray-500">
                              {format(vencimento, 'dd/MM/yyyy')} • {
                                isVencido ? `Vencido há ${Math.abs(diasRestantes)} dia(s)` :
                                isHoje ? 'Vence HOJE' :
                                `${diasRestantes} dia(s)`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-red-600">
                              R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {contasPagar.length > 5 && (
                      <Link to={createPageUrl("DespesasLembretes")}>
                        <Button variant="link" className="w-full text-xs">
                          Ver todas as {contasPagar.length} contas →
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                    {filtroModal === 'recebido' && 'Projetos Recebidos (Pagamento ASTEC)'}
                    {filtroModal === 'concluido' && 'Projetos Concluídos'}
                    {filtroModal === 'todos' && 'Todos os Projetos'}
                  </h2>
                  <p className="text-green-100">
                    {projetosFiltradosModal.projetos.length} projeto(s) e {projetosFiltradosModal.servicos.length} outro(s) serviço(s)
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
              {projetosFiltradosModal.projetos.length === 0 && projetosFiltradosModal.servicos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhum projeto ou serviço encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projetosFiltradosModal.projetos.map((projeto) => (
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
                              {filtroModal === 'recebido' && projeto.data_pagamento_astec && (
                                <div>
                                  <span className="text-gray-600">Pago em: </span>
                                  <span className="font-bold text-green-700">
                                    {format(new Date(projeto.data_pagamento_astec), 'dd/MM/yyyy', { locale: ptBR })}
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
                  
                  {projetosFiltradosModal.servicos.map((servico) => (
                    <Card key={`servico-${servico.id}`} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-blue-900">
                                {servico.cliente_nome}
                              </h3>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                Outro Serviço
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Descrição: </span>
                                <span className="font-medium text-gray-800">{servico.descricao_servico}</span>
                              </div>
                              {servico.banco && (
                                <div>
                                  <span className="text-gray-600">Banco: </span>
                                  <span className="font-medium text-gray-800">{servico.banco}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">A Receber: </span>
                                <span className="font-bold text-yellow-600">
                                  R$ {(servico.valor_receber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {servico.data_protocolo && (
                                <div>
                                  <span className="text-gray-600">Protocolo: </span>
                                  <span className="font-medium text-gray-800">
                                    {format(new Date(servico.data_protocolo), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex lg:flex-col gap-2">
                            <Link to={createPageUrl("OutrosServicos")} className="flex-1 lg:flex-none">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
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