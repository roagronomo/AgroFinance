import React, { useState, useEffect, useCallback } from "react";
import { ArtsNotificacoes } from "@/entities/ArtsNotificacoes";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, ClipboardCheck, UserCheck, Paperclip, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ConfirmacaoExclusaoServico from "../components/arts/ConfirmacaoExclusaoServico";
import { contarAnexosAtivos } from "../components/arts/anexosHelpers";

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "aguardando_cliente", label: "Aguardando Cliente" },
  { value: "aguardando_orgao", label: "Aguardando Órgão" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" }
];

const statusStyles = {
  aberto: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  aguardando_cliente: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  aguardando_orgao: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  concluido: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelado: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" }
};

const TabelaServicos = ({ servicos, isLoading, currentUser, onDelete }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Carregando serviços...</span>
        </div>
      </div>
    );
  }
  
  if (servicos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-gray-600 font-medium">Nenhum serviço encontrado</p>
        <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou crie um novo serviço</p>
      </div>
    );
  }

  const podeExcluir = (servico) => {
    if (!currentUser) return false;
    const isAdminOrGestor = currentUser.role === 'admin' || currentUser.role === 'gestor';
    const isCriador = servico.created_by === currentUser.email;
    return isAdminOrGestor || isCriador;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Notificação</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Processo</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Responsável</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Anexos</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Prazo</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {servicos.map((servico) => {
              const totalAnexos = contarAnexosAtivos(servico);
              const permiteExclusao = podeExcluir(servico);
              const style = statusStyles[servico.status] || statusStyles.aberto;
              const statusLabel = STATUS_OPTIONS.find(s => s.value === servico.status)?.label || servico.status;
              
              return (
                <tr key={servico.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">{servico.numero_notificacao}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{servico.cliente_nome}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{servico.processo_numero || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{servico.atribuido_para_nome || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {totalAnexos > 0 ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <Paperclip className="w-3 h-3" />
                        <span className="text-xs font-medium">{totalAnexos}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {servico.prazo ? new Date(servico.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={createPageUrl(`EditarServicoART`) + `?id=${servico.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-xs text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          Ver / Editar
                        </Button>
                      </Link>
                      {permiteExclusao && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(servico)}
                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KanbanServicos = ({ servicos, isLoading, currentUser, onDelete }) => {
  const statusColunas = ["aberto", "aguardando_cliente", "aguardando_orgao", "concluido", "cancelado"];

  const podeExcluir = (servico) => {
    if (!currentUser) return false;
    const isAdminOrGestor = currentUser.role === 'admin' || currentUser.role === 'gestor';
    const isCriador = servico.created_by === currentUser.email;
    return isAdminOrGestor || isCriador;
  };

  const getPrioridadeLabel = (prioridade) => {
    if (!prioridade) return null;
    const labels = {
      'alta': 'Alta',
      'media': 'Média',
      'baixa': 'Baixa'
    };
    return labels[prioridade] || null;
  };

  const getPrioridadeClass = (prioridade) => {
    if (!prioridade) return '';
    return `pri-${prioridade}`;
  };

  const ordenarPorPrioridade = (servicosArray) => {
    const prioridadeRank = {
      'alta': 3,
      'media': 2,
      'baixa': 1
    };

    return [...servicosArray].sort((a, b) => {
      const rankA = prioridadeRank[a.prioridade] || 0;
      const rankB = prioridadeRank[b.prioridade] || 0;
      
      if (rankA !== rankB) {
        return rankB - rankA;
      }
      
      // If priorities are the same, sort by deadline
      if (a.prazo && b.prazo) {
        // Convert to Date objects for comparison. Add 'T00:00:00' to ensure dates are parsed consistently
        const dateA = new Date(a.prazo + 'T00:00:00');
        const dateB = new Date(b.prazo + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
      }
      // If one or both don't have a prazo, keep original order relative to each other
      if (a.prazo && !b.prazo) return -1; // a comes before b
      if (!a.prazo && b.prazo) return 1; // b comes before a
      
      return 0; // Maintain original order if no prazo or same prazo
    });
  };

  if (isLoading) {
      return <p>Carregando...</p>
  }
  if (servicos.length === 0) {
    return <p>Nenhum serviço encontrado para visualização Kanban.</p>;
  }

  return (
    <TooltipProvider>
      <div className="mb-4">
        <div className="kanban-legend flex items-center gap-2 text-sm text-gray-600">
          <span>Prioridade:</span>
          <span className="chip alta px-2 py-1 rounded-full text-xs font-semibold">Alta</span>
          <span className="chip media px-2 py-1 rounded-full text-xs font-semibold">Média</span>
          <span className="chip baixa px-2 py-1 rounded-full text-xs font-semibold">Baixa</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColunas.map(status => {
          const servicosDaColuna = servicos.filter(s => s.status === status);
          const servicosOrdenados = ordenarPorPrioridade(servicosDaColuna);
          
          // Obter label formatado do status
          const statusLabel = STATUS_OPTIONS.find(opt => opt.value === status)?.label || status.replace(/_/g, ' ');

          return (
            <div key={status} className="w-72 flex-shrink-0 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 p-3 border-b bg-gray-200 rounded-t-lg">{statusLabel}</h3>
              <div className="p-2 space-y-2">
                {servicosOrdenados.map(servico => {
                  const totalAnexos = contarAnexosAtivos(servico);
                  const permiteExclusao = podeExcluir(servico);
                  const priClass = getPrioridadeClass(servico.prioridade);
                  const priLabel = getPrioridadeLabel(servico.prioridade);
                  
                  return (
                    <Card 
                      key={servico.id} 
                      className={`kanban-card bg-white shadow-sm ${priClass}`}
                      aria-label={`Card ${servico.cliente_nome}${priLabel ? `, prioridade ${priLabel}` : ''}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {servico.prioridade === 'alta' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="pri-ico" aria-label="Prioridade Alta">⚡</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Prioridade Alta</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <p className="font-semibold text-sm text-gray-800 truncate">{servico.cliente_nome}</p>
                            {priLabel && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="pri-badge flex-shrink-0">{priLabel}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Prioridade: {priLabel}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {totalAnexos > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-pointer">
                                    <Paperclip className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600">{totalAnexos}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{totalAnexos} anexo(s)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-[#e6f4ea] text-[#1f7a3a] hover:bg-[#d1f0d3] cursor-pointer">{servico.atribuido_para_nome || '—'}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Atribuído para {servico.atribuido_para_nome || 'Ninguém'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Notificação: {servico.numero_notificacao}</p>
                        {servico.processo_numero && (
                          <p className="text-xs text-gray-500">Processo nº: {servico.processo_numero}</p>
                        )}
                        <p className="text-xs text-gray-500">Prazo: {servico.prazo ? new Date(servico.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Link to={createPageUrl(`EditarServicoART`) + `?id=${servico.id}`}>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">Detalhes</Button>
                          </Link>
                          {permiteExclusao && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDelete(servico)}
                                  className="h-auto p-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  aria-label="Excluir serviço/ART"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir este serviço/ART</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {servicosOrdenados.length === 0 && (
                  <p className="text-xs text-gray-500 p-3 text-center">Nenhum serviço nesta etapa.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        /* Badge */
        .kanban-card .pri-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          border-radius: 9999px;
          padding: 4px 8px;
          color: #0b0f1a;
          background: #e5e7eb;
        }
        .kanban-card.pri-alta .pri-badge {
          background: #fee2e2;
          color: #7f1d1d;
          border: 1px solid #ef4444;
        }
        .kanban-card.pri-media .pri-badge {
          background: #fef3c7;
          color: #7c2d12;
          border: 1px solid #f59e0b;
        }
        .kanban-card.pri-baixa .pri-badge {
          background: #dcfce7;
          color: #064e3b;
          border: 1px solid #10b981;
        }

        /* Faixa lateral */
        .kanban-card {
          border-left: 4px solid transparent;
        }
        .kanban-card.pri-alta {
          border-left-color: #ef4444;
        }
        .kanban-card.pri-media {
          border-left-color: #f59e0b;
        }
        .kanban-card.pri-baixa {
          border-left-color: #10b981;
        }

        /* Ícone destaque alta */
        .kanban-card .pri-ico {
          color: #ef4444;
          font-size: 14px;
          margin-right: 6px;
          flex-shrink: 0;
        }

        /* Legenda opcional */
        .kanban-legend {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 12px;
        }
        .kanban-legend .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 9999px;
          border: 1px solid #e5e7eb;
        }
        .kanban-legend .chip.alta {
          background: #fee2e2;
          border-color: #ef4444;
          color: #7f1d1d;
        }
        .kanban-legend .chip.media {
          background: #fef3c7;
          border-color: #f59e0b;
          color: #7c2d12;
        }
        .kanban-legend .chip.baixa {
          background: #dcfce7;
          border-color: #10b981;
          color: #064e3b;
        }
      `}</style>
    </TooltipProvider>
  );
}

export default function GerenciamentoARTs() {
    const [servicos, setServicos] = useState([]);
    const [servicosFiltrados, setServicosFiltrados] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [usuariosOrganizacao, setUsuariosOrganizacao] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [servicoParaExcluir, setServicoParaExcluir] = useState(null);
    const [excluindo, setExcluindo] = useState(false);
    const [mensagemSucesso, setMensagemSucesso] = useState("");
    const [mensagemErro, setMensagemErro] = useState("");
    const [filtros, setFiltros] = useState({
        busca: "",
        status: "todos",
        atribuido: "todos",
        com_anexos: "todos"
    });

    // Carregar usuários da organização dinamicamente
    const carregarUsuariosOrganizacao = useCallback(async () => {
        try {
            // Em produção, fazer uma consulta à API de usuários da organização
            // Por enquanto, usar lista fixa como fallback
            const usuariosFixos = [
                { nome: "Rodrigo Nascimento", email: "rodrigo@cerradoconsultoria.com" },
                { nome: "Victor Cézar", email: "victor@cerradoconsultoria.com" }
            ];
            setUsuariosOrganizacao(usuariosFixos);
        } catch (error) {
            console.error("Erro ao carregar usuários da organização:", error);
        }
    }, []);

    const carregarDados = useCallback(async () => {
        setIsLoading(true);
        try {
            // Carregar usuário atual
            const user = await User.me();
            setCurrentUser(user);
            
            // Carregar serviços com consulta mais simples
            const data = await ArtsNotificacoes.list("-created_date"); // Mudança para usar created_date
            console.log(`Carregados ${data.length} serviços`);
            setServicos(data);
            setServicosFiltrados(data);
            
            // Carregar usuários da organização
            await carregarUsuariosOrganizacao();
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            // Em vez de alert, vamos mostrar uma mensagem mais amigável
            setServicos([]);
            setServicosFiltrados([]);
        }
        setIsLoading(false);
    }, [carregarUsuariosOrganizacao]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const aplicarFiltros = useCallback(() => {
        let resultado = servicos.filter(s => {
            const buscaLower = filtros.busca.toLowerCase();
            const matchBusca = !filtros.busca ||
                s.cliente_nome?.toLowerCase().includes(buscaLower) ||
                s.cliente_cpf_cnpj?.includes(filtros.busca) ||
                s.processo_numero?.includes(filtros.busca) ||
                s.arts?.some(art => art.numero?.includes(filtros.busca));
            
            const matchStatus = filtros.status === 'todos' || s.status === filtros.status;
            
            const matchAtribuido = filtros.atribuido === 'todos' || s.atribuido_para_nome === filtros.atribuido;

            // Filtro de anexos
            const temAnexos = contarAnexosAtivos(s) > 0;
            const matchAnexos = filtros.com_anexos === 'todos' || 
                              (filtros.com_anexos === 'sim' && temAnexos) ||
                              (filtros.com_anexos === 'nao' && !temAnexos);

            return matchBusca && matchStatus && matchAtribuido && matchAnexos;
        });
        setServicosFiltrados(resultado);
    }, [servicos, filtros]);

    useEffect(() => {
        aplicarFiltros();
    }, [aplicarFiltros]);

    const handleFiltroChange = (tipo, valor) => {
        setFiltros(prev => ({ ...prev, [tipo]: valor }));
    };

    const handleExcluir = async (servico) => {
        setExcluindo(true);
        setMensagemErro("");
        setMensagemSucesso("");
        
        try {
            console.log(`Iniciando exclusão do serviço ${servico.id}`, { servico, currentUser });
            
            // Excluir o serviço
            await ArtsNotificacoes.delete(servico.id);
            
            // Atualizar a lista removendo o serviço excluído
            setServicos(prev => prev.filter(s => s.id !== servico.id));
            setServicosFiltrados(prev => prev.filter(s => s.id !== servico.id));
            
            // Fechar modal
            setServicoParaExcluir(null);
            
            // Mostrar mensagem de sucesso
            setMensagemSucesso("Registro excluído com sucesso.");
            setTimeout(() => setMensagemSucesso(""), 5000);
            
            console.log(`Serviço ${servico.id} excluído com sucesso`);
        } catch (error) {
            console.error("Erro ao excluir serviço:", error, { servicoId: servico.id, userId: currentUser?.id });
            setMensagemErro("Não foi possível excluir. Tente novamente mais tarde.");
            setTimeout(() => setMensagemErro(""), 5000);
        } finally {
            setExcluindo(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header moderno */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 rounded-xl bg-emerald-100">
                                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                                Gerenciamento de ARTs
                            </h1>
                        </div>
                        <p className="text-gray-500 text-sm ml-12">
                            {servicosFiltrados.length} serviço(s) encontrado(s)
                        </p>
                    </div>
                    <Link to={createPageUrl("AbrirServicoART")}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm h-10 px-5 rounded-lg w-full md:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Serviço
                        </Button>
                    </Link>
                </div>

                {mensagemSucesso && (
                    <Alert className="mb-4 bg-emerald-50 border-emerald-200 rounded-lg">
                        <AlertDescription className="text-emerald-800">
                            {mensagemSucesso}
                        </AlertDescription>
                    </Alert>
                )}
                
                {mensagemErro && (
                    <Alert variant="destructive" className="mb-4 rounded-lg">
                        <AlertDescription>{mensagemErro}</AlertDescription>
                    </Alert>
                )}

                {/* Filtros modernos */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar cliente, CPF, processo..."
                                value={filtros.busca}
                                onChange={(e) => handleFiltroChange('busca', e.target.value)}
                                className="pl-10 h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm"
                            />
                        </div>
                        <Select value={filtros.status} onValueChange={(value) => handleFiltroChange('status', value)}>
                            <SelectTrigger className="h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                {STATUS_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filtros.atribuido} onValueChange={(value) => handleFiltroChange('atribuido', value)}>
                            <SelectTrigger className="h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                    <SelectValue placeholder="Responsável" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Responsáveis</SelectItem>
                                {usuariosOrganizacao.map((usuario) => (
                                    <SelectItem key={usuario.email} value={usuario.nome}>
                                        {usuario.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filtros.com_anexos} onValueChange={(value) => handleFiltroChange('com_anexos', value)}>
                            <SelectTrigger className="h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                                    <SelectValue placeholder="Anexos" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="sim">Com Anexos</SelectItem>
                                <SelectItem value="nao">Sem Anexos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabs modernos */}
                <Tabs defaultValue="tabela" className="w-full">
                    <TabsList className="inline-flex h-10 p-1 bg-gray-100 rounded-lg mb-4">
                        <TabsTrigger 
                            value="tabela" 
                            className="px-6 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                            Tabela
                        </TabsTrigger>
                        <TabsTrigger 
                            value="kanban"
                            className="px-6 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                            Kanban
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="tabela" className="mt-4">
                        <TabelaServicos 
                            servicos={servicosFiltrados} 
                            isLoading={isLoading}
                            currentUser={currentUser}
                            onDelete={setServicoParaExcluir}
                        />
                    </TabsContent>
                    <TabsContent value="kanban" className="mt-4">
                        <KanbanServicos 
                            servicos={servicosFiltrados} 
                            isLoading={isLoading}
                            currentUser={currentUser}
                            onDelete={setServicoParaExcluir}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmacaoExclusaoServico
                servico={servicoParaExcluir}
                isOpen={!!servicoParaExcluir}
                onClose={() => setServicoParaExcluir(null)}
                onConfirm={() => handleExcluir(servicoParaExcluir)}
                isLoading={excluindo}
            />
        </div>
    );
}