import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

export default function SeletorQuantidadeProdutos({ quantidadeSelecionada, onQuantidadeChange }) {
  const opcoes = [
    { value: 1, label: "1 produto" },
    { value: 2, label: "2 produtos" },
    { value: 3, label: "3 produtos" },
    { value: 4, label: "4 produtos" },
    { value: 5, label: "5 produtos" }
  ];

  return (
    <Card className="shadow-lg border-green-200 bg-white/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Package className="w-5 h-5" />
          Quantidade de Produtos a Cultivar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select 
          value={quantidadeSelecionada?.toString() || ""} 
          onValueChange={(value) => onQuantidadeChange(parseInt(value))}
        >
          <SelectTrigger className="border-green-200 focus:border-green-500">
            <SelectValue placeholder="Selecione quantos produtos serão cultivados" />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((opcao) => (
              <SelectItem key={opcao.value} value={opcao.value.toString()}>
                {opcao.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {quantidadeSelecionada && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              ✓ Será{'m'} exibido{quantidadeSelecionada > 1 ? 's' : ''} <strong>{quantidadeSelecionada} produto{quantidadeSelecionada > 1 ? 's' : ''}</strong> para preenchimento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}