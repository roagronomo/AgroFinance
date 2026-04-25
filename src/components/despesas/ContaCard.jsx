import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, FileText, Check, Trash2, Calendar as CalendarIcon } from "lucide-react";

export default function ContaCard({ conta, getStatusCor, getStatusTexto, calcularDiasRestantes, formatarDataSegura, onEditar, onAnexarRecibo, onMarcarPago, onExcluir, className = "" }) {
  const diasRestantes = calcularDiasRestantes(conta.data_vencimento);
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{conta.descricao}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusCor(diasRestantes)}`}>{getStatusTexto(diasRestantes)}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{formatarDataSegura(conta.data_vencimento)}</span>
              <span className="font-semibold text-red-600">💰 R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              {conta.recorrente && <span className="text-purple-600 font-medium">💳 Recorrente {conta.parcela_atual}/{conta.parcelas_total}</span>}
              {conta.fornecedor && <span>🏢 {conta.fornecedor}</span>}
              {conta.categoria && <span className="text-blue-600">📂 {conta.categoria}</span>}
              {conta.codigo_barras && <span className="text-green-600">🔢 Código extraído</span>}
              {conta.recibo_anexo && <span className="text-purple-600">📄 Recibo anexado</span>}
            </div>
            {conta.observacoes && <p className="text-sm text-gray-500 mt-2">{conta.observacoes}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEditar(conta)} className="text-blue-600 hover:text-blue-700" title="Editar"><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onAnexarRecibo(conta.id)} className="text-purple-600 hover:text-purple-700" title="Anexar recibo"><FileText className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onMarcarPago(conta.id)} className="text-green-600 hover:text-green-700" title="Marcar como pago"><Check className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onExcluir({ id: conta.id, tipo: 'conta' })} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}