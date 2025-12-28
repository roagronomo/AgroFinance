import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SeletorImoveis({ imoveis, imoveisSelecionados, onToggleImovel, onAreaChange }) {
  if (imoveis.length === 0) {
    return (
      <Card className="shadow-lg border-green-200">
        <CardContent className="text-center py-8">
          <Home className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum imóvel encontrado para os filtros selecionados</p>
        </CardContent>
      </Card>
    );
  }

  const handleAreaChange = (imovel, area) => {
    const areaNumerica = parseFloat(area) || 0;
    const areaDisponivel = imovel.tipo_propriedade === 'terceiros' ? imovel.area_cedida : imovel.area_agricultavel;
    
    if (areaDisponivel > 0 && areaNumerica > areaDisponivel) {
      const tipoArea = imovel.tipo_propriedade === 'terceiros' ? 'cedida' : 'agricultável';
      alert(`Atenção: A área utilizada (${areaNumerica} ha) é maior que a área ${tipoArea} cadastrada (${areaDisponivel} ha). Por favor, confira o cadastro do imóvel.`);
    }

    onAreaChange(imovel.id, areaNumerica);
  };
  
  return (
    <Card className="shadow-lg border-green-200 bg-white/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Home className="w-5 h-5" />
          Localização das Lavouras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto p-1">
          {imoveis.map((imovel) => {
            const isSelected = imoveisSelecionados.some(item => item.id === imovel.id);
            const areaUtilizada = imoveisSelecionados.find(item => item.id === imovel.id)?.area_utilizada || "";

            return (
              <div key={imovel.id} className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                isSelected 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-green-100 hover:bg-green-50'
              }`}>
                <Checkbox 
                  id={`imovel-${imovel.id}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggleImovel(imovel.id)}
                  className="mt-1"
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-1">
                    <label htmlFor={`imovel-${imovel.id}`} className="cursor-pointer">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {imovel.nome_imovel}
                        {imovel.temDadosProducao && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Editando
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Matrícula:</span> {imovel.matricula_numero}
                      </div>
                    </label>
                  </div>
                  
                  <div className="md:col-span-2">
                    {isSelected && (
                      <div>
                        <Label htmlFor={`area-${imovel.id}`} className="text-green-700 font-medium text-sm">
                          Área Utilizada (ha) *
                        </Label>
                        <Input
                          id={`area-${imovel.id}`}
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={areaUtilizada}
                          onChange={(e) => onAreaChange(imovel.id, e.target.value)}
                          onBlur={(e) => handleAreaChange(imovel, e.target.value)}
                          className="border-green-200 focus:border-green-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  );
}