import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusDistribuicao({ stats, isLoading }) {
  const distribuicao = [
    {
      status: "Em Análise",
      valor: stats.emAnalise,
      total: stats.total,
      cor: "bg-amber-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
      icone: Clock,
      porcentagem: stats.total > 0 ? (stats.emAnalise / stats.total) * 100 : 0
    },
    {
      status: "Concluídos",
      valor: stats.concluidos,
      total: stats.total,
      cor: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
      icone: CheckCircle,
      porcentagem: stats.total > 0 ? (stats.concluidos / stats.total) * 100 : 0
    },
    {
      status: "Cancelados",
      valor: stats.cancelados,
      total: stats.total,
      cor: "bg-gray-400",
      bgLight: "bg-gray-50",
      textColor: "text-gray-500",
      icone: XCircle,
      porcentagem: stats.total > 0 ? (stats.cancelados / stats.total) * 100 : 0
    }
  ];

  return (
    <Card className="border-0 shadow-sm bg-white overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-50">
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Status</h2>
        </div>
      </div>

      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {distribuicao.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgLight}`}>
                  <item.icone className={`w-4 h-4 ${item.textColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{item.status}</span>
                    <span className="text-xs text-gray-400">{item.porcentagem.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.cor} rounded-full transition-all duration-500`}
                      style={{ width: `${item.porcentagem}%` }}
                    />
                  </div>
                </div>
                
                <span className="text-sm font-semibold text-gray-800 min-w-[28px] text-right">
                  {item.valor}
                </span>
              </div>
            ))}
            
            {/* Total central elegante */}
            <div className="pt-4 mt-2 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total de Projetos</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}