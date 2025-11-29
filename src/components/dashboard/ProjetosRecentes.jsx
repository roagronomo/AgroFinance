import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Building2, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  Trash2,
  ChevronRight,
  Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela";
import ConfirmacaoExclusao from "../projetos/ConfirmacaoExclusao";

const statusConfig = {
  em_analise: {
    label: "Em Análise",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500"
  },
  parado: {
    label: "Parado",
    icon: Pause,
    className: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-500"
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500"
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dotColor: "bg-gray-400"
  }
};

const bancoNomes = {
  banco_do_brasil: "Banco do Brasil",
  caixa: "Caixa Econômica",
  bradesco: "Bradesco",
  sicoob: "Sicoob",
  sicredi: "Sicredi",
  santander: "Santander",
  banco_nordeste: "Banco do Nordeste",
  outros: "Outros"
};

export default function ProjetosRecentes({ projetos, isLoading, onUpdate }) {
  const [projetoParaExcluir, setProjetoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluir = async (projeto) => {
    setExcluindo(true);
    try {
      const parcelasRelacionadas = await Parcela.filter({ projeto_id: projeto.id });
      for (const parcela of parcelasRelacionadas) {
        await Parcela.delete(parcela.id);
      }
      await ProjetoFinanciamento.delete(projeto.id);
      setProjetoParaExcluir(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
    } finally {
      setExcluindo(false);
    }
  };

  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0';
    if (valor >= 1000000) {
      return `R$ ${(valor / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
    } else if (valor >= 1000) {
      return `R$ ${(valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mil`;
    }
    return `R$ ${valor.toLocaleString('pt-BR')}`;
  };

  return (
    <>
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Projetos Recentes</h2>
            </div>
            <Link to={createPageUrl("TodosProjetos")}>
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-emerald-600 gap-1 h-8">
                Ver todos
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))
            ) : projetos.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-600 font-medium text-sm">Nenhum projeto encontrado</p>
                <p className="text-gray-400 text-xs mt-1">Crie seu primeiro projeto</p>
              </div>
            ) : (
              projetos.map((projeto) => {
                const StatusIcon = statusConfig[projeto.status]?.icon || Clock;
                const isCancelado = projeto.status === 'cancelado';
                const canceladoClass = 'line-through text-gray-400';
                
                return (
                  <div 
                    key={projeto.id} 
                    data-project-id={projeto.id}
                    className={`p-4 hover:bg-gray-50/50 transition-all duration-200 group ${
                      isCancelado ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador lateral */}
                      <div className={`w-1 h-12 rounded-full ${statusConfig[projeto.status]?.dotColor || 'bg-gray-300'} flex-shrink-0 mt-1`} />
                      
                      {/* Conteúdo principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium text-gray-800 text-sm truncate ${
                              isCancelado ? canceladoClass : ''
                            }`}>
                              {projeto.nome_cliente}
                            </h3>
                            <p className={`text-xs text-gray-500 truncate ${
                              isCancelado ? canceladoClass : ''
                            }`}>
                              {projeto.item_financiado}
                            </p>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig[projeto.status]?.className} text-[10px] px-2 py-0.5 font-medium border flex-shrink-0`}
                          >
                            {statusConfig[projeto.status]?.label}
                          </Badge>
                        </div>
                        
                        {/* Info grid compacto */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className={`truncate max-w-[80px] ${isCancelado ? canceladoClass : ''}`}>
                              {bancoNomes[projeto.banco]?.split(' ')[0] || projeto.banco}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span className={isCancelado ? canceladoClass : ''}>
                              {format(new Date(projeto.data_protocolo), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-medium text-gray-700">
                            <DollarSign className="w-3 h-3" />
                            <span className={isCancelado ? canceladoClass : ''}>
                              {formatarValor(projeto.valor_financiado)}
                            </span>
                          </div>
                        </div>

                        {projeto.observacoes && (
                          <div className="mt-2 px-2.5 py-1.5 bg-amber-50/50 rounded-md border border-amber-100/50">
                            <p className={`text-[11px] text-amber-700 truncate ${
                              isCancelado ? 'text-gray-400' : ''
                            }`}>
                              {projeto.observacoes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Link to={createPageUrl("EditarProjeto") + `?id=${projeto.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setProjetoParaExcluir(projeto)}
                          className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmacaoExclusao
        projeto={projetoParaExcluir}
        isOpen={!!projetoParaExcluir}
        onClose={() => setProjetoParaExcluir(null)}
        onConfirm={() => handleExcluir(projetoParaExcluir)}
        isLoading={excluindo}
      />
    </>
  );
}