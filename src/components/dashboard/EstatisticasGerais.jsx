import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign,
  PiggyBank,
  Wallet,
  Hourglass
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EstatisticasGerais({ stats, isLoading, onCardClick }) {
  const estatisticas = [
    {
      titulo: "Total de Projetos",
      valor: stats.total,
      icone: TrendingUp,
      cor: "bg-blue-500",
      mudanca: "Total acumulado",
      onClick: () => onCardClick('todos'),
      clickable: true
    },
    {
      titulo: "A Receber (Análise)",
      valor: `R$ ${stats.valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: Hourglass,
      cor: "bg-yellow-500",
      mudanca: `${stats.emAnalise} projeto(s) em análise`,
      onClick: () => onCardClick('em_analise'),
      clickable: true
    },
    {
      titulo: "Recebido (Concluído)",
      valor: `R$ ${stats.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: Wallet,
      cor: "bg-green-500",
      mudanca: `${stats.concluidos} projeto(s) concluídos`,
      onClick: () => onCardClick('concluido'),
      clickable: true
    },
    {
      titulo: "Valor Financiado",
      valor: `R$ ${stats.valorTotalFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: PiggyBank,
      cor: "bg-purple-500",
      mudanca: "Total (exceto cancelados)",
      clickable: false
    },
    {
      titulo: "Taxa Média",
      valor: `${stats.taxaJurosMedia.toFixed(2)}%`,
      icone: DollarSign,
      cor: "bg-orange-500",
      mudanca: "Média de juros a.a.",
      clickable: false
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {estatisticas.map((stat, index) => (
        <Card 
          key={index} 
          className={`relative overflow-hidden shadow-lg border-green-100 transition-all duration-300 ${
            stat.clickable 
              ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:border-green-300' 
              : 'hover:shadow-xl'
          }`}
          onClick={stat.clickable && !isLoading ? stat.onClick : undefined}
        >
          <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 ${stat.cor} rounded-full opacity-10`} />
          {stat.clickable && (
            <div className="absolute top-3 right-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
                <svg 
                  className="w-4 h-4 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                  />
                </svg>
              </div>
            </div>
          )}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              {stat.titulo}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.cor} bg-opacity-20`}>
              <stat.icone className={`w-5 h-5 ${stat.cor.replace('bg-', 'text-')}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-900 mb-1">
              {isLoading ? <Skeleton className="h-8 w-20" /> : stat.valor}
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              {isLoading ? <Skeleton className="h-4 w-16" /> : (
                <>
                  {stat.mudanca}
                  {stat.clickable && (
                    <span className="text-green-500 font-semibold ml-1">• Clique para ver</span>
                  )}
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}