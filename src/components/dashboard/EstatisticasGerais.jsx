
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

export default function EstatisticasGerais({ stats, isLoading }) {
  const estatisticas = [
    {
      titulo: "Total de Projetos",
      valor: stats.total,
      icone: TrendingUp,
      cor: "bg-blue-500",
      mudanca: "Total acumulado"
    },
    {
      titulo: "A Receber (Análise)",
      valor: `R$ ${stats.valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: Hourglass,
      cor: "bg-yellow-500",
      mudanca: `${stats.emAnalise} projeto(s) em análise`
    },
    {
      titulo: "Recebido (Concluído)",
      valor: `R$ ${stats.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: Wallet,
      cor: "bg-green-500",
      mudanca: `${stats.concluidos} projeto(s) concluídos`
    },
    {
      titulo: "Valor Financiado",
      valor: `R$ ${stats.valorTotalFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: PiggyBank,
      cor: "bg-purple-500",
      mudanca: "Total (exceto cancelados)" // Changed as per request
    },
    {
      titulo: "Taxa Média",
      valor: `${stats.taxaJurosMedia.toFixed(2)}%`,
      icone: DollarSign,
      cor: "bg-orange-500",
      mudanca: "Média de juros a.a."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {estatisticas.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden shadow-lg border-green-100 hover:shadow-xl transition-all duration-300">
          <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 ${stat.cor} rounded-full opacity-10`} />
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
            <p className="text-xs text-green-600">
              {isLoading ? <Skeleton className="h-4 w-16" /> : stat.mudanca}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
