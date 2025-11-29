import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Building2, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  MapPin,
  Percent,
  Edit,
  Trash2,
  FileText,
  FileCheck2,
  CalendarDays,
  FileSignature,
  FileX,
  Wallet
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela";

import ConfirmacaoExclusao from "./ConfirmacaoExclusao";
import AnexosBadges from "./AnexosBadges";

const statusConfig = {
  em_analise: {
    label: "Em Análise",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  parado: {
    label: "Parado",
    icon: Pause,
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500"
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400"
  }
};

const bancoNomes = {
  banco_do_brasil: "Banco do Brasil",
  caixa: "Caixa Econômica",
  bradesco: "Bradesco",
  sicoob: "Sicoob",
  sicredi: "Sicredi",
  santander: "Santander",
  outros: "Outros"
};

const statusArtConfig = {
  nao_se_aplica: { label: "Não se aplica", icon: FileX, className: "bg-gray-50 text-gray-500 border-gray-200" },
  a_fazer: { label: "ART a fazer", icon: FileSignature, className: "bg-amber-50 text-amber-700 border-amber-200" },
  feita: { label: "ART feita", icon: FileCheck2, className: "bg-blue-50 text-blue-700 border-blue-200" },
  paga: { label: "ART paga", icon: Wallet, className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

export default function ListaProjetos({ projetos, isLoading, onUpdate, anexosResumo }) {
  const [projetoParaExcluir, setProjetoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluir = async (projeto) => {
    setExcluindo(true);
    try {
      // Primeiro, buscar e excluir todas as parcelas relacionadas ao projeto
      const parcelasRelacionadas = await Parcela.filter({ projeto_id: projeto.id });
      for (const parcela of parcelasRelacionadas) {
        await Parcela.delete(parcela.id);
      }
      
      // Depois excluir o projeto
      await ProjetoFinanciamento.delete(projeto.id);
      setProjetoParaExcluir(null);
      onUpdate(); // Recarrega a lista
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
    }
    setExcluindo(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="w-1 h-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-6">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projetos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6 text-gray-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Nenhum projeto encontrado
        </h3>
        <p className="text-gray-400 text-sm">
          Ajuste os filtros ou crie um novo projeto
        </p>
      </div>
    );
  }

  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0';
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="space-y-3">
        {projetos.map((projeto) => {
          const StatusIcon = statusConfig[projeto.status]?.icon || Clock;
          const artStatus = statusArtConfig[projeto.status_art] || statusArtConfig.nao_se_aplica;
          const ArtIcon = artStatus.icon;
          
          const resumoProjeto = anexosResumo?.get(projeto.id);
          
          const isCancelado = projeto.status === 'cancelado';
          const canceladoClass = 'line-through text-gray-400';

          return (
            <div 
              key={projeto.id} 
              data-project-id={projeto.id}
              data-project-card
              className={`bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden ${
                isCancelado ? 'opacity-60' : ''
              }`}
            >
              <div className="p-5">
                {/* Header com nome, ações e status */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Indicador lateral colorido */}
                  <div className={`w-1 h-20 rounded-full flex-shrink-0 ${statusConfig[projeto.status]?.dot || 'bg-gray-300'}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base font-semibold text-gray-800 truncate ${isCancelado ? canceladoClass : ''}`}>
                          {projeto.nome_cliente}
                        </h3>
                        <p className={`text-sm text-gray-500 truncate ${isCancelado ? canceladoClass : ''}`}>
                          {projeto.item_financiado}
                        </p>
                        {projeto.fonte_recurso && (
                          <p className={`text-xs text-gray-400 mt-0.5 ${isCancelado ? canceladoClass : ''}`}>
                            Fonte: {projeto.fonte_recurso}
                          </p>
                        )}
                      </div>
                      
                      {/* Ações e Status */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link to={createPageUrl("EditarProjeto") + `?id=${projeto.id}`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Editar
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setProjetoParaExcluir(projeto)}
                          className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Excluir
                        </Button>
                        <Badge 
                          variant="outline"
                          className={`${statusConfig[projeto.status]?.className} text-xs px-2.5 py-1 font-medium border`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusConfig[projeto.status]?.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Anexos */}
                    <div className="mt-2">
                      <AnexosBadges projetoId={projeto.id} resumo={resumoProjeto} />
                    </div>
                  </div>
                </div>
                
                {/* Grid de informações principais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-gray-50">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Banco</p>
                      <p className={`text-sm font-medium text-gray-700 ${isCancelado ? canceladoClass : ''}`}>
                        {bancoNomes[projeto.banco] || projeto.banco}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Protocolo</p>
                      <p className={`text-sm font-medium text-gray-700 ${isCancelado ? canceladoClass : ''}`}>
                        {format(new Date(projeto.data_protocolo), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Valor Financiado</p>
                      <p className={`text-sm font-semibold text-gray-800 ${isCancelado ? canceladoClass : ''}`}>
                        {formatarValor(projeto.valor_financiado)}
                      </p>
                    </div>
                  </div>

                  {projeto.safra ? (
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Safra</p>
                        <p className={`text-sm font-medium text-gray-700 ${isCancelado ? canceladoClass : ''}`}>
                          {projeto.safra}
                        </p>
                      </div>
                    </div>
                  ) : projeto.agencia && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Agência</p>
                        <p className={`text-sm font-medium text-gray-700 ${isCancelado ? canceladoClass : ''}`}>
                          {projeto.agencia}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linha inferior com informações extras */}
                {(projeto.agencia && projeto.safra) && (
                  <div className="flex items-center gap-2.5 pt-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className={`text-sm text-gray-600 ${isCancelado ? canceladoClass : ''}`}>
                      {projeto.agencia}
                    </span>
                  </div>
                )}

                {/* Informações adicionais */}
                {(projeto.taxa_juros || projeto.vencimento_final || projeto.valor_receber || projeto.numero_contrato || projeto.status_art) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 mt-2 border-t border-gray-50">
                    {projeto.numero_contrato && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5" />
                        <span className={isCancelado ? canceladoClass : ''}>Contrato: <strong className="text-gray-700">{projeto.numero_contrato}</strong></span>
                      </div>
                    )}
                    
                    {projeto.taxa_juros && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Percent className="w-3.5 h-3.5" />
                        <span className={isCancelado ? canceladoClass : ''}><strong className="text-gray-700">{projeto.taxa_juros}%</strong> a.a.</span>
                      </div>
                    )}

                    {projeto.status_art && (
                      <Badge 
                        variant="outline"
                        className={`${artStatus.className} text-[10px] px-2 py-0.5 font-medium border`}
                      >
                        <ArtIcon className="w-3 h-3 mr-1" />
                        {artStatus.label}
                      </Badge>
                    )}

                    {projeto.valor_receber && (
                      <div className="flex items-center gap-1.5 text-xs ml-auto">
                        <span className={`text-emerald-700 font-medium ${isCancelado ? canceladoClass : ''}`}>
                          {projeto.status === 'concluido' ? 'Recebido' : 'A receber'}: <strong>{formatarValor(projeto.valor_receber)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {projeto.observacoes && (
                  <div className="mt-3 px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-100/50">
                    <p className={`text-xs text-amber-700 ${isCancelado ? 'text-gray-400' : ''}`}>
                      <strong>Obs:</strong> {projeto.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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