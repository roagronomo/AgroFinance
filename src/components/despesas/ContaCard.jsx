import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, FileText, Check, Trash2, Calendar as CalendarIcon, Copy, Download, Undo2 } from "lucide-react";

export default function ContaCard({
  conta,
  getStatusCor,
  getStatusTexto,
  calcularDiasRestantes,
  formatarDataSegura,
  onEditar,
  onAnexarRecibo,
  onMarcarPago,
  onExcluir,
  // Props para modo "paga"
  paga = false,
  onReutilizar,
  onDesmarcarPago,
  onDownloadAnexo,
  className = ""
}) {
  const diasRestantes = calcularDiasRestantes(conta.data_vencimento);

  if (paga) {
    return (
      <Card className={`hover:shadow-md transition-shadow bg-white ${className}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {conta.recorrente && <span className="text-xs text-purple-600 font-medium">💳 Parcela {conta.parcela_atual}/{conta.parcelas_total}</span>}
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Pago</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>📅 Vencimento: {formatarDataSegura(conta.data_vencimento)}</span>
                {conta.data_pagamento && <span>✅ Pago em: {formatarDataSegura(conta.data_pagamento)}</span>}
                <span className="font-semibold text-green-700">💰 R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                {conta.fornecedor && <span>🏢 {conta.fornecedor}</span>}
                {conta.categoria && <span className="text-blue-600">📂 {conta.categoria}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {onReutilizar && <Button variant="ghost" size="icon" onClick={() => onReutilizar(conta)} className="text-green-600 hover:text-green-700" title="Usar como rascunho"><Copy className="w-4 h-4" /></Button>}
              {conta.boleto_anexo && onDownloadAnexo && <Button variant="ghost" size="icon" onClick={() => onDownloadAnexo(conta.boleto_anexo.url, conta.boleto_anexo.file_name)} className="text-blue-600 hover:text-blue-700" title="Baixar boleto"><Download className="w-4 h-4" /></Button>}
              {conta.recibo_anexo && onDownloadAnexo && <Button variant="ghost" size="icon" onClick={() => onDownloadAnexo(conta.recibo_anexo.url, conta.recibo_anexo.file_name)} className="text-purple-600 hover:text-purple-700" title="Baixar recibo"><FileText className="w-4 h-4" /></Button>}
              {onDesmarcarPago && <Button variant="ghost" size="icon" onClick={() => onDesmarcarPago(conta.id)} className="text-orange-600 hover:text-orange-700" title="Retornar para a pagar"><Undo2 className="w-4 h-4" /></Button>}
              {onExcluir && <Button variant="ghost" size="icon" onClick={() => onExcluir({ id: conta.id, tipo: 'conta' })} className="text-red-600 hover:text-red-700" title="Excluir"><Trash2 className="w-4 h-4" /></Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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