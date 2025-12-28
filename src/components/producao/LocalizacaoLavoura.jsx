
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle2, AlertTriangle, Save, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LocalizacaoLavoura({ 
  titulo, 
  imoveis, 
  imoveisSelecionados, 
  onToggleImovel, 
  onAreaChange 
}) {
  const [salvandoArea, setSalvandoArea] = useState({});
  const [areaSalva, setAreaSalva] = useState({});

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

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "0,00";
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleAreaChange = (imovel, area) => {
    const areaNumerica = parseFloat(area) || 0;
    
    // Determina a área máxima permitida
    const limiteArea = imovel.tipo_propriedade === 'terceiros' 
      ? imovel.area_cedida || 0 
      : imovel.area_agricultavel || 0;

    // Validação
    if (limiteArea > 0 && areaNumerica > limiteArea) {
      const tipoArea = imovel.tipo_propriedade === 'terceiros' ? 'cedida' : 'agricultável';
      alert(`⚠️ Atenção: A área utilizada (${formatNumber(areaNumerica)} ha) excede a área ${tipoArea} disponível para este imóvel (${formatNumber(limiteArea)} ha).`);
    }

    onAreaChange(imovel.id, area);
  };

  const handleAreaBlur = async (imovelId, area) => {
    if (!area || parseFloat(area) === 0) return;
    
    setSalvandoArea(prev => ({ ...prev, [imovelId]: true }));
    
    try {
      // Simula um pequeno delay para mostrar o feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Aqui a área já foi salva via onAreaChange
      setAreaSalva(prev => ({ ...prev, [imovelId]: true }));
      
      // Remove o feedback após 2 segundos
      setTimeout(() => {
        setAreaSalva(prev => ({ ...prev, [imovelId]: false }));
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao salvar área:", error);
    } finally {
      setSalvandoArea(prev => ({ ...prev, [imovelId]: false }));
    }
  };
  
  return (
    <Card className="shadow-lg border-blue-200 bg-white/95">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {imoveis.map((imovel) => {
            const isSelected = imoveisSelecionados.some(item => item.id === imovel.id);
            const areaUtilizada = imoveisSelecionados.find(item => item.id === imovel.id)?.area_utilizada || "";

            return (
              <div key={imovel.id} className={`p-4 border rounded-lg transition-colors ${
                isSelected 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-blue-100 hover:bg-blue-50'
              }`}>
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id={`imovel-${titulo}-${imovel.id}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleImovel(imovel.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    {/* Nome e Matrícula */}
                    <div>
                      <label htmlFor={`imovel-${titulo}-${imovel.id}`} className="cursor-pointer">
                        <div className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                          {imovel.nome_imovel}
                          {imovel.temDadosProducao && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Editando
                            </Badge>
                          )}
                        </div>
                      </label>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Matrícula:</span> {imovel.matricula_numero}
                      </div>
                    </div>

                    {/* INFORMAÇÕES DE ÁREA (VISUALIZAÇÃO) - Nova ordem: Total, Cedida, Agricultável */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm bg-blue-50/50 p-2 rounded-md border border-blue-200">
                      <div>
                        <span className="font-medium text-blue-800">Área Total:</span>
                        <p className="text-gray-700">{formatNumber(imovel.area_total || 0)} ha</p>
                      </div>
                      {imovel.tipo_propriedade === 'terceiros' && (
                        <div>
                          <span className="font-medium text-blue-800">Área Cedida:</span>
                          <p className="text-gray-700">{formatNumber(imovel.area_cedida || 0)} ha</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-blue-800">Área Agricultável:</span>
                        <p className="text-gray-700">{formatNumber(imovel.area_agricultavel || 0)} ha</p>
                      </div>
                      {/* Tipo de Uso */}
                      {imovel.tipo_uso && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-blue-800">Tipo de Uso:</span>
                          <p className="text-gray-700">{imovel.tipo_uso}</p>
                        </div>
                      )}
                    </div>

                    {/* Campo para Área Utilizada com Salvamento Individual */}
                    {isSelected && (
                      <div className="pt-2">
                        <Label htmlFor={`area-${titulo}-${imovel.id}`} className="text-blue-700 font-medium">
                          Área Utilizada (hectares) *
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id={`area-${titulo}-${imovel.id}`}
                            type="number"
                            placeholder="Digite a área utilizada"
                            step="0.01"
                            min="0"
                            value={areaUtilizada}
                            onChange={(e) => onAreaChange(imovel.id, e.target.value)}
                            onBlur={(e) => {
                              handleAreaChange(imovel, e.target.value);
                              handleAreaBlur(imovel.id, e.target.value);
                            }}
                            className="border-blue-200 focus:border-blue-500 flex-1"
                            required
                          />
                          
                          {/* Feedback Visual de Salvamento */}
                          <div className="flex items-center min-w-[100px]">
                            {salvandoArea[imovel.id] && (
                              <div className="flex items-center text-blue-600 text-xs">
                                <Save className="w-3 h-3 mr-1" />
                                Salvando...
                              </div>
                            )}
                            {areaSalva[imovel.id] && (
                              <div className="flex items-center text-green-600 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Salvo!
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 A área será salva automaticamente quando sair do campo
                        </p>
                      </div>
                    )}
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
