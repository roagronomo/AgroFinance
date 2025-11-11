import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Clock, CheckCircle, XCircle, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusDistribuicao({ stats, isLoading }) {
  const distribuicao = [
    {
      status: "Em Análise",
      valor: stats.emAnalise,
      total: stats.total,
      cor: "bg-yellow-500",
      icone: Clock,
      porcentagem: stats.total > 0 ? (stats.emAnalise / stats.total) * 100 : 0
    },
    {
      status: "Concluídos",
      valor: stats.concluidos,
      total: stats.total,
      cor: "bg-green-500",
      icone: CheckCircle,
      porcentagem: stats.total > 0 ? (stats.concluidos / stats.total) * 100 : 0
    },
    {
      status: "Cancelados",
      valor: stats.cancelados,
      total: stats.total,
      cor: "bg-gray-500",
      icone: XCircle,
      porcentagem: stats.total > 0 ? (stats.cancelados / stats.total) * 100 : 0
    }
  ];

  return (
    <Card className="shadow-lg border-green-100">
      <CardHeader className="border-b border-green-100">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-green-900">
          <PieChart className="w-6 h-6" />
          Distribuição por Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {distribuicao.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <item.icone className={`w-4 h-4 ${item.cor.replace('bg-', 'text-')}`} />
                    <span className="font-medium text-green-800">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-green-900">{item.valor}</span>
                    <span className="text-xs text-green-600">
                      ({item.porcentagem.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <Progress 
                  value={item.porcentagem} 
                  className="h-2"
                />
              </div>
            ))}
            
            <div className="pt-4 border-t border-green-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-900">{stats.total}</p>
                <p className="text-green-600 text-sm">Total de Projetos</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}