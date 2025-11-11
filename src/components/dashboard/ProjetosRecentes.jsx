
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Trash2 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela"; // Import Parcela entity
import ConfirmacaoExclusao from "../projetos/ConfirmacaoExclusao";

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
  banco_nordeste: "Banco do Nordeste",
  outros: "Outros"
};

export default function ProjetosRecentes({ projetos, isLoading, onUpdate }) {
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
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      // Optionally, add a toast notification for the error
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg border-green-100">
        <CardHeader className="border-b border-green-100">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-green-900">
            <FileText className="w-6 h-6" />
            Projetos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-green-50">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
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
                </div>
              ))
            ) : projetos.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-green-600 font-medium">Nenhum projeto encontrado</p>
                <p className="text-green-500 text-sm mt-1">Crie seu primeiro projeto de financiamento</p>
              </div>
            ) : (
              projetos.map((projeto) => {
                const StatusIcon = statusConfig[projeto.status]?.icon || Clock;
                const isCancelado = projeto.status === 'cancelado';
                // Vermelho FORTE e INTENSO: #DC0000
                const canceladoClass = 'line-through [text-decoration-color:#DC0000] [text-decoration-thickness:2px]';
                
                return (
                  <div 
                    key={projeto.id} 
                    data-project-id={projeto.id}
                    className={`p-6 hover:bg-green-50 transition-colors duration-200 group ${
                      isCancelado ? 'is-cancelled' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className={`font-semibold text-green-900 text-lg ${
                            isCancelado ? canceladoClass : ''
                          }`}>
                            {projeto.nome_cliente}
                          </h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Link to={createPageUrl("EditarProjeto") + `?id=${projeto.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2 text-green-600 hover:text-green-800 hover:bg-green-100"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setProjetoParaExcluir(projeto)}
                              className={`h-8 px-2 ${
                                isCancelado
                                  ? 'text-[#DC0000] hover:text-[#B80000] hover:bg-[rgba(220,0,0,0.14)]'
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className={`text-green-600 font-medium ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          {projeto.item_financiado}
                        </p>
                      </div>
                      <Badge className={`${statusConfig[projeto.status]?.className} border flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[projeto.status]?.label}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-500" />
                        <span className={`text-green-700 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          {bancoNomes[projeto.banco] || projeto.banco}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span className={`text-green-700 ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          {format(new Date(projeto.data_protocolo), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className={`text-green-700 font-semibold ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          R$ {projeto.valor_financiado?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                      <div className={`text-green-600 font-medium ${
                        isCancelado ? canceladoClass : ''
                      }`}>
                        {projeto.agencia}
                      </div>
                    </div>

                    {projeto.observacoes && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className={`text-green-700 text-sm ${
                          isCancelado ? canceladoClass : ''
                        }`}>
                          <strong>Obs:</strong> {projeto.observacoes}
                        </p>
                      </div>
                    )}
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
