import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusDistribuicao({ stats, isLoading, todosProjetos = [] }) {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth(); // 0-11

  const anoAnterior = anoAtual - 1;

  // Filtrar projetos por ano (baseado em data_protocolo) - excluir cancelados
  const projetosAnoAtual = todosProjetos.filter(p => {
    if (!p.data_protocolo || p.status === 'cancelado') return false;
    const data = new Date(p.data_protocolo);
    return data.getFullYear() === anoAtual;
  });

  const projetosAnoAnterior = todosProjetos.filter(p => {
    if (!p.data_protocolo || p.status === 'cancelado') return false;
    const data = new Date(p.data_protocolo);
    return data.getFullYear() === anoAnterior;
  });

  // Filtrar projetos por mês atual vs mesmo mês do ano anterior - excluir cancelados
  const projetosMesAtualAnoAtual = todosProjetos.filter(p => {
    if (!p.data_protocolo || p.status === 'cancelado') return false;
    const data = new Date(p.data_protocolo);
    return data.getFullYear() === anoAtual && data.getMonth() === mesAtual;
  });

  const projetosMesAtualAnoAnterior = todosProjetos.filter(p => {
    if (!p.data_protocolo || p.status === 'cancelado') return false;
    const data = new Date(p.data_protocolo);
    return data.getFullYear() === anoAnterior && data.getMonth() === mesAtual;
  });

  // Calcular totais em VALORES (R$) ao invés de quantidade - excluir cancelados
  const totalAnoAtual = projetosAnoAtual.reduce((sum, p) => sum + (p.valor_financiado || 0), 0);
  const totalAnoAnterior = projetosAnoAnterior.reduce((sum, p) => sum + (p.valor_financiado || 0), 0);
  const totalMesAnoAtual = projetosMesAtualAnoAtual.reduce((sum, p) => sum + (p.valor_financiado || 0), 0);
  const totalMesAnoAnterior = projetosMesAtualAnoAnterior.reduce((sum, p) => sum + (p.valor_financiado || 0), 0);

  // Calcular diferenças
  const diferencaAnual = totalAnoAtual - totalAnoAnterior;
  const diferencaMensal = totalMesAnoAtual - totalMesAnoAnterior;

  // Calcular percentuais de crescimento
  const percentualAnual = totalAnoAnterior > 0 
    ? ((diferencaAnual / totalAnoAnterior) * 100).toFixed(0) 
    : totalAnoAtual > 0 ? 100 : 0;

  const percentualMensal = totalMesAnoAnterior > 0 
    ? ((diferencaMensal / totalMesAnoAnterior) * 100).toFixed(0) 
    : totalMesAnoAtual > 0 ? 100 : 0;

  // Formatar valores monetários
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  // Nomes dos meses
  const nomesMeses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  const mesNome = nomesMeses[mesAtual];

  const renderIndicador = (diferenca, percentual) => {
    if (diferenca > 0) {
      return (
        <div className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-semibold">+{percentual}%</span>
        </div>
      );
    } else if (diferenca < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-semibold">{percentual}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-semibold">0%</span>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm bg-white overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-50">
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Crescimento</h2>
        </div>
      </div>

      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Comparação Anual */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Comparação Anual
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gray-800">{formatarMoeda(totalAnoAtual)}</span>
                    <span className="text-xs text-gray-400">em {anoAtual}</span>
                  </div>
                  {renderIndicador(diferencaAnual, percentualAnual)}
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-600">{anoAtual}: <strong>{formatarMoeda(totalAnoAtual)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-gray-500">{anoAnterior}: <strong>{formatarMoeda(totalAnoAnterior)}</strong></span>
                  </div>
                  {diferencaAnual !== 0 && (
                    <span className={`ml-auto font-medium ${diferencaAnual > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diferencaAnual > 0 ? '+' : ''}{formatarMoeda(diferencaAnual)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Comparação Mensal */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {mesNome}/{anoAnterior} vs {mesNome}/{anoAtual}
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gray-800">{formatarMoeda(totalMesAnoAtual)}</span>
                    <span className="text-xs text-gray-500">em {mesNome}/{anoAtual}</span>
                  </div>
                  {renderIndicador(diferencaMensal, percentualMensal)}
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-600">{mesNome}/{anoAtual}: <strong>{formatarMoeda(totalMesAnoAtual)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-gray-500">{mesNome}/{anoAnterior}: <strong>{formatarMoeda(totalMesAnoAnterior)}</strong></span>
                  </div>
                  {diferencaMensal !== 0 && (
                    <span className={`ml-auto font-medium ${diferencaMensal > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diferencaMensal > 0 ? '+' : ''}{formatarMoeda(diferencaMensal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total geral */}
            <div className="pt-3 mt-2 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {formatarMoeda(todosProjetos.filter(p => p.status !== 'cancelado').reduce((sum, p) => sum + (p.valor_financiado || 0), 0))}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Geral</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}