import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertCircle, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AlertasVencimentos() {
  const [alertas, setAlertas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    try {
      setIsLoading(true);
      const [servicos, contas] = await Promise.all([
        base44.entities.OutroServico.list("-data_vencimento_boleto"),
        base44.entities.ContaPagar.list("-data_vencimento")
      ]);
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const proximos7Dias = new Date(hoje);
      proximos7Dias.setDate(proximos7Dias.getDate() + 7);
      
      // Alertas de serviços (a receber)
      const servicosComAlerta = servicos
        .filter(s => {
          if (!s.boleto_emitido || !s.data_vencimento_boleto) return false;
          if (s.status === 'concluido' || s.status === 'cancelado') return false;
          
          const dataVencimento = new Date(s.data_vencimento_boleto + 'T00:00:00');
          return dataVencimento <= proximos7Dias;
        })
        .map(s => ({
          tipo: 'receita',
          titulo: s.cliente_nome,
          descricao: s.descricao_servico,
          valor: s.valor_receber,
          data_vencimento: s.data_vencimento_boleto
        }));

      // Alertas de contas a pagar (despesas)
      const contasComAlerta = contas
        .filter(c => {
          if (c.pago || c.ativo === false || !c.data_vencimento) return false;
          
          const dataVencimento = new Date(c.data_vencimento + 'T00:00:00');
          return dataVencimento <= proximos7Dias;
        })
        .map(c => ({
          tipo: 'despesa',
          titulo: c.descricao,
          descricao: c.fornecedor ? `Fornecedor: ${c.fornecedor}` : c.categoria || '',
          valor: c.valor,
          data_vencimento: c.data_vencimento
        }));

      // Combinar e ordenar todos os alertas por data
      const todosAlertas = [...servicosComAlerta, ...contasComAlerta].sort((a, b) => {
        const dataA = new Date(a.data_vencimento);
        const dataB = new Date(b.data_vencimento);
        return dataA - dataB;
      });
      
      setAlertas(todosAlertas);
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calcularDiasRestantes = (dataVencimento) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento + 'T00:00:00');
    const diff = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCorAlerta = (diasRestantes) => {
    if (diasRestantes < 0) return "text-red-600 bg-red-50 border-red-200";
    if (diasRestantes === 0) return "text-orange-600 bg-orange-50 border-orange-200";
    if (diasRestantes <= 3) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getTextoAlerta = (diasRestantes) => {
    if (diasRestantes < 0) return `Atrasado ${Math.abs(diasRestantes)} dia(s)`;
    if (diasRestantes === 0) return "Vence HOJE";
    if (diasRestantes === 1) return "Vence amanhã";
    return `Vence em ${diasRestantes} dia(s)`;
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-600" />
            Alertas de Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (alertas.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-600" />
            Alertas de Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Nenhum vencimento próximo</p>
            <p className="text-xs text-gray-400 mt-1">Todos os boletos estão em dia! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-600" />
            Alertas de Vencimento
          </div>
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {alertas.map((alerta, idx) => {
            const diasRestantes = calcularDiasRestantes(alerta.data_vencimento);
            const corAlerta = getCorAlerta(diasRestantes);
            const textoAlerta = getTextoAlerta(diasRestantes);
            const isReceita = alerta.tipo === 'receita';
            
            return (
              <div 
                key={idx} 
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx === 0 ? 'border-t-0' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alerta.titulo}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isReceita ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isReceita ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                    {alerta.descricao && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {alerta.descricao}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(alerta.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${isReceita ? 'text-green-700' : 'text-red-700'}`}>
                        <DollarSign className="w-3 h-3" />
                        R$ {alerta.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-1 rounded-md border text-xs font-semibold ${corAlerta}`}>
                    {textoAlerta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}