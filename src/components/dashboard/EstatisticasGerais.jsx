import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign,
  PiggyBank,
  Wallet,
  Hourglass,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EstatisticasGerais({ stats, isLoading, onCardClick }) {
  const formatarValorCompleto = (valor) => {
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const estatisticas = [
    {
      titulo: "Total de Projetos",
      valor: stats.total,
      icone: TrendingUp,
      gradiente: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      mudanca: "Total acumulado",
      onClick: () => onCardClick('todos'),
      clickable: true,
      isMonetary: false
    },
    {
      titulo: "A Receber",
      subtitulo: "Em Análise",
      valor: stats.valorAReceber,
      icone: Hourglass,
      gradiente: "from-amber-400 to-yellow-500",
      bgLight: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      mudanca: `${stats.emAnalise} projeto(s)`,
      onClick: () => onCardClick('em_analise'),
      clickable: true,
      isMonetary: true
    },
    {
      titulo: "Recebido",
      subtitulo: "Pagamentos ASTEC",
      valor: stats.valorRecebido,
      icone: Wallet,
      gradiente: "from-green-500 to-emerald-600",
      bgLight: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      mudanca: stats.quantidadeRecebidosTexto || `${stats.quantidadeRecebidos || 0} item(s)`,
      onClick: () => onCardClick('recebido'),
      clickable: true,
      isMonetary: true
    },
    {
      titulo: "Valor Financiado",
      valor: stats.valorTotalFinanciado,
      icone: PiggyBank,
      gradiente: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      mudanca: "Exceto cancelados",
      clickable: false,
      isMonetary: true
    },
    {
      titulo: "Taxa Média",
      valor: `${stats.taxaJurosMedia.toFixed(2)}%`,
      icone: DollarSign,
      gradiente: "from-orange-400 to-amber-500",
      bgLight: "bg-orange-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      mudanca: "Juros a.a.",
      clickable: false,
      isMonetary: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {estatisticas.map((stat, index) => (
        <Card 
          key={index} 
          className={`relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 ${stat.bgLight} ${
            stat.clickable ? 'cursor-pointer hover:scale-[1.02]' : ''
          }`}
          onClick={stat.clickable && !isLoading ? stat.onClick : undefined}
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradiente}`} />
          
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                <stat.icone className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              {stat.clickable && (
                <div className="opacity-40 hover:opacity-70 transition-opacity">
                  <Eye className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {stat.titulo}
              </p>
              {stat.subtitulo && (
                <p className="text-[10px] text-gray-400 -mt-0.5">{stat.subtitulo}</p>
              )}
              
              <div className="font-semibold text-gray-800 text-base">
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  stat.isMonetary ? formatarValorCompleto(stat.valor) : stat.valor
                )}
              </div>
              
              <p className="text-[11px] text-gray-400 pt-1">
                {isLoading ? <Skeleton className="h-3 w-16" /> : stat.mudanca}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}