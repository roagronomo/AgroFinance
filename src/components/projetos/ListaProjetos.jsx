
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
    className: "bg-yellow-100 text-yellow-800 border-yellow-200"
  },
  parado: {
    label: "Parado",
    icon: Pause,
    className: "bg-red-100 text-red-800 border-red-200"
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200"
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-gray-100 text-gray-800 border-gray-200"
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
  nao_se_aplica: { label: "Não se aplica", icon: FileX, className: "bg-gray-100 text-gray-700" },
  a_fazer: { label: "ART a fazer", icon: FileSignature, className: "bg-yellow-100 text-yellow-800" },
  feita: { label: "ART feita", icon: FileCheck2, className: "bg-blue-100 text-blue-800" },
  paga: { label: "ART paga", icon: Wallet, className: "bg-green-100 text-green-800" }
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
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-18" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (projetos.length === 0) {
    return (
      <Card className="p-12 text-center shadow-lg border-green-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          Nenhum projeto encontrado
        </h3>
        <p className="text-green-600">
          Não há projetos que correspondam aos filtros aplicados.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {projetos.map((projeto) => {
          const StatusIcon = statusConfig[projeto.status]?.icon || Clock;
          const artStatus = statusArtConfig[projeto.status_art] || statusArtConfig.nao_se_aplica;
          const ArtIcon = artStatus.icon;
          
          const resumoProjeto = anexosResumo?.get(projeto.id);
          
          // Detectar se é cancelado para aplicar estilos
          const isCancelado = projeto.status === 'cancelado';
          // Vermelho FORTE e INTENSO: #DC0000
          const canceladoClass = 'line-through [text-decoration-color:#DC0000] [text-decoration-thickness:2px]';

          return (
            <Card 
              key={projeto.id} 
              data-project-id={projeto.id}
              data-project-card
              className={`shadow-lg border-green-100 hover:shadow-xl transition-all duration-300 ${
                isCancelado ? 'opacity-75 is-cancelled' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-xl font-bold text-green-900 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        {projeto.nome_cliente}
                      </h3>
                      <div className="flex gap-2">
                        <Link to={createPageUrl("EditarProjeto") + `?id=${projeto.id}`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setProjetoParaExcluir(projeto)}
                          className={`transition-all ${
                            isCancelado 
                              ? 'border-[#DC0000] text-[#DC0000] bg-[rgba(220,0,0,0.08)] hover:border-[#B80000] hover:text-[#B80000] hover:bg-[rgba(220,0,0,0.16)]'
                              : 'border-red-300 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                    <p className={`text-green-700 font-medium mb-1 ${
                      isCancelado ? canceladoClass : ''
                    }`}>
                      {projeto.item_financiado}
                    </p>
                    {projeto.fonte_recurso && (
                      <p className={`text-green-600 text-sm mb-3 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        Fonte: {projeto.fonte_recurso}
                      </p>
                    )}
                    
                    <div className="mb-3">
                      <p className={`text-sm text-green-700 font-medium mb-2 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        Anexos:
                      </p>
                      <AnexosBadges projetoId={projeto.id} resumo={resumoProjeto} />
                    </div>
                  </div>
                  <Badge className={`${statusConfig[projeto.status]?.className} border flex items-center gap-2 px-4 py-2`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig[projeto.status]?.label}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className={`text-sm text-green-600 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        Banco
                      </p>
                      <p className={`font-semibold text-green-800 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        {bancoNomes[projeto.banco] || projeto.banco}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <div>
                      <p className={`text-sm text-green-600 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        Data Protocolo
                      </p>
                      <p className={`font-semibold text-green-800 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        {format(new Date(projeto.data_protocolo), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <p className={`text-sm text-green-600 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        Valor Financiado
                      </p>
                      <p className={`font-bold text-green-800 ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        R$ {projeto.valor_financiado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </p>
                    </div>
                  </div>

                  {projeto.safra && (
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-green-500" />
                      <div>
                        <p className={`text-sm text-green-600 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          Safra
                        </p>
                        <p className={`font-semibold text-green-800 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          {projeto.safra}
                        </p>
                      </div>
                    </div>
                  )}

                  {projeto.agencia && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-500" />
                      <div>
                        <p className={`text-sm text-green-600 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          Agência
                        </p>
                        <p className={`font-semibold text-green-800 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          {projeto.agencia}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(projeto.taxa_juros || projeto.vencimento_final || projeto.valor_receber || projeto.numero_contrato || projeto.status_art || projeto.data_pagamento_astec) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-green-100">
                    {projeto.taxa_juros && (
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-green-500" />
                        <span className={`text-sm text-green-700 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          Taxa: <strong>{projeto.taxa_juros}% a.a.</strong>
                        </span>
                      </div>
                    )}
                    
                    {projeto.vencimento_final && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span className={`text-sm text-green-700 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          Vencimento: <strong>{format(new Date(projeto.vencimento_final), "dd/MM/yyyy", { locale: ptBR })}</strong>
                        </span>
                      </div>
                    )}

                    {projeto.numero_contrato && (
                       <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-500" />
                        <span className={`text-sm text-green-700 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          Contrato: <strong>{projeto.numero_contrato}</strong>
                        </span>
                      </div>
                    )}

                    {projeto.status_art && (
                       <div className="flex items-center gap-2">
                         <Badge className={`${artStatus.className} border flex items-center gap-2`}>
                          <ArtIcon className="w-4 h-4" />
                          {artStatus.label}
                         </Badge>
                      </div>
                    )}

                    {projeto.valor_receber && (
                      <div className="flex items-center gap-2 md:col-start-3">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <div className="flex flex-col">
                          <span className={`text-sm text-green-700 ${
                            isCancelado ? canceladoClass : ''
                          }`}>
                            {projeto.status === 'concluido' ? 'Recebido' : 'A receber'}: <strong>R$ {projeto.valor_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </span>
                          {projeto.data_pagamento_astec && (
                            <span className={`text-xs text-green-600 ${
                              isCancelado ? canceladoClass : ''
                            }`}>
                              Pag. ASTEC: {format(new Date(projeto.data_pagamento_astec), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {projeto.observacoes && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                    <p className={`text-green-700 text-sm ${
                      isCancelado ? canceladoClass : ''
                    }`}>
                      <strong className="text-green-800">Observações:</strong> {projeto.observacoes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
