
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // Import Badge component
import { Save, Package, Loader2, AlertTriangle } from "lucide-react"; // Import Loader2 and AlertTriangle icon
import { Alert, AlertDescription } from "@/components/ui/alert"; // Import Alert components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

export default function FormularioProduto({ titulo, numeroSerie, produto, municipioSelecionado, onSave, isSaving = false, imoveisSelecionados = [], onValidationError }) {
  const getInitialFormData = () => ({
    municipio_lavoura: "",
    microrregional: "",
    codigo: "",
    atividade: "",
    ciclo: "",
    periodo_comercializacao: "",
    produto_principal: "",
    ultimo_ano: new Date().getFullYear() - 1,
    sistema_producao_ultimo: "",
    inicio_plantio_ultimo: "",
    inicio_colheita_ultimo: "",
    produtividade_obtida: 0,
    unidade_produtividade_obtida: "Kg/ha", // New field
    area_plantada: 0,
    preco_unitario_obtido: 0,
    unidade_preco_obtido: "R$/Kg", // New field
    ano_previsto: new Date().getFullYear(),
    sistema_producao_previsto: "",
    inicio_plantio_previsto: "",
    inicio_colheita_previsto: "",
    produtividade_prevista: 0,
    unidade_produtividade_prevista: "Kg/ha", // New field
    area_prevista: 0,
    preco_unitario_previsto: 0, // New field
    unidade_preco_previsto: "R$/Kg", // New field
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // States for display values to allow free typing
  const [prodObtidaStr, setProdObtidaStr] = useState("");
  const [precoObtidoStr, setPrecoObtidoStr] = useState("");
  const [prodPrevistaStr, setProdPrevistaStr] = useState("");
  const [precoPrevistoStr, setPrecoPrevistoStr] = useState(""); // New state
  const [validationError, setValidationError] = useState(""); // State for validation errors

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "";
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const parseNumber = (value) => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 6)}`;
  };

  useEffect(() => {
    // Set município from selected filter
    const municipio = municipioSelecionado && municipioSelecionado !== "todos" ? municipioSelecionado : "";
    const initialData = getInitialFormData(); // Get default values including new units

    if (produto) {
      // Merge existing product data with initial defaults and then with overrides
      const updatedProduto = { 
        ...initialData, // Ensure all new fields have defaults
        ...produto, // Overlay with actual product data
        municipio_lavoura: municipio || produto.municipio_lavoura || "" 
      };
      setFormData(updatedProduto);
      setProdObtidaStr(formatNumber(updatedProduto.produtividade_obtida));
      setPrecoObtidoStr(formatNumber(updatedProduto.preco_unitario_obtido));
      setProdPrevistaStr(formatNumber(updatedProduto.produtividade_prevista));
      setPrecoPrevistoStr(formatNumber(updatedProduto.preco_unitario_previsto)); // Initialize new state
    } else {
      const newData = { ...initialData, municipio_lavoura: municipio };
      setFormData(newData);
      setProdObtidaStr("");
      setPrecoObtidoStr("");
      setProdPrevistaStr("");
      setPrecoPrevistoStr(""); // Clear new state
    }
  }, [produto, municipioSelecionado]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError("");
    }
  };

  const handleDateChange = (field, value) => {
    const formattedValue = formatDate(value);
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    if (validationError) {
      setValidationError("");
    }
  };
  
  const handleNumberBlur = (field, stringValue, setStringValue) => {
    const numericValue = parseNumber(stringValue);
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    setStringValue(formatNumber(numericValue));
    if (validationError) {
      setValidationError("");
    }
  };

  // Validation of areas before saving
  const validateAreas = () => {
    const areaAPlantar = formData.area_prevista || 0;
    const somaAreasUtilizadas = imoveisSelecionados.reduce((soma, imovel) => {
      return soma + (parseFloat(imovel.area_utilizada) || 0);
    }, 0);

    // Tolerate small rounding differences (0.01 ha)
    const diferenca = Math.abs(areaAPlantar - somaAreasUtilizadas);
    
    if (imoveisSelecionados.length === 0) {
      const mensagemErro = "Por favor, selecione pelo menos uma localização da lavoura e informe a área utilizada.";
      setValidationError(mensagemErro);
      // Notify parent if onValidationError prop is provided
      if (onValidationError) onValidationError(mensagemErro);
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      return false;
    }

    if (imoveisSelecionados.some(imovel => !imovel.area_utilizada || parseFloat(imovel.area_utilizada) <= 0)) {
      const mensagemErro = "Por favor, preencha a área utilizada para todas as localizações da lavoura selecionadas com valores positivos.";
      setValidationError(mensagemErro);
      // Notify parent if onValidationError prop is provided
      if (onValidationError) onValidationError(mensagemErro);
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      return false;
    }

    if (diferenca > 0.01) {
      const mensagemErro = `A soma das áreas utilizadas nas localizações da lavoura (${formatNumber(somaAreasUtilizadas)} ha) deve ser igual à Área a Plantar informada (${formatNumber(areaAPlantar)} ha).`;
      setValidationError(mensagemErro);
      // Notify parent if onValidationError prop is provided
      if (onValidationError) onValidationError(mensagemErro);
      
      // Scroll to the top to display the error
      document.querySelector('#validation-error')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(""); // Clear previous errors on submit attempt

    // Validate areas before saving
    if (!validateAreas()) {
      return;
    }

    onSave(formData, numeroSerie);
  };

  return (
    <Card className="shadow-xl border-green-200 bg-white/95">
      <CardHeader className={`${produto ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-emerald-700'} text-white rounded-t-lg`}>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {titulo}
          {produto && (
            <Badge className="bg-white/20 text-white border-white/30">
              Editando Dados Existentes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-8">
        {/* Validation Alert */}
        {validationError && (
          <Alert id="validation-error" className="mb-6 border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">
              <strong>Erro de Validação:</strong><br />
              {validationError}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Localização e Identificação */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-green-100">
              Localização e Identificação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="municipio_lavoura" className="text-green-700 font-medium">Município da Lavoura</Label>
                <Input
                  id="municipio_lavoura"
                  value={formData.municipio_lavoura || ""}
                  onChange={(e) => handleInputChange("municipio_lavoura", e.target.value)}
                  className="border-green-200 focus:border-green-500 bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="microrregional" className="text-green-700 font-medium">Microrregional</Label>
                <Input
                  id="microrregional"
                  value={formData.microrregional}
                  onChange={(e) => handleInputChange("microrregional", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="codigo" className="text-green-700 font-medium">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange("codigo", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Informações do Cultivo */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-green-100">
              Informações do Cultivo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="atividade" className="text-green-700 font-medium">Atividade</Label>
                <Input
                  id="atividade"
                  value={formData.atividade}
                  onChange={(e) => handleInputChange("atividade", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="ciclo" className="text-green-700 font-medium">Ciclo</Label>
                <Input
                  id="ciclo"
                  value={formData.ciclo}
                  onChange={(e) => handleInputChange("ciclo", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="periodo_comercializacao" className="text-green-700 font-medium">Período de Comercialização</Label>
                <Input
                  id="periodo_comercializacao"
                  value={formData.periodo_comercializacao}
                  onChange={(e) => handleInputChange("periodo_comercializacao", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="produto_principal" className="text-green-700 font-medium">Produto Principal</Label>
                <Input
                  id="produto_principal"
                  value={formData.produto_principal}
                  onChange={(e) => handleInputChange("produto_principal", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
            </div>
          </div>
          
          {/* Início da Produção - Último Ano */}
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Início da Produção - Último Ano</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="ultimo_ano" className="text-green-700 font-medium">Ano</Label>
                <Input
                  id="ultimo_ano"
                  type="number"
                  value={formData.ultimo_ano}
                  onChange={(e) => handleInputChange("ultimo_ano", parseInt(e.target.value, 10))}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="sistema_producao_ultimo" className="text-green-700 font-medium">Sistema de Produção (Nº do Empre no RTA)</Label>
                <Input
                  id="sistema_producao_ultimo"
                  value={formData.sistema_producao_ultimo}
                  onChange={(e) => handleInputChange("sistema_producao_ultimo", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="inicio_plantio_ultimo" className="text-green-700 font-medium">Início do Plantio (Mês/Ano)</Label>
                <Input
                  id="inicio_plantio_ultimo"
                  value={formData.inicio_plantio_ultimo}
                  onChange={(e) => handleDateChange("inicio_plantio_ultimo", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                  maxLength={7}
                  placeholder="MM/AAAA"
                />
              </div>
              <div>
                <Label htmlFor="inicio_colheita_ultimo" className="text-green-700 font-medium">Início da Colheita (Mês/Ano)</Label>
                <Input
                  id="inicio_colheita_ultimo"
                  value={formData.inicio_colheita_ultimo}
                  onChange={(e) => handleDateChange("inicio_colheita_ultimo", e.target.value)}
                  className="border-green-200 focus:border-green-500"
                  maxLength={7}
                  placeholder="MM/AAAA"
                />
              </div>
              <div className="lg:col-span-1">
                <Label htmlFor="produtividade_obtida" className="text-green-700 font-medium">Produtividade Obtida</Label>
                <div className="flex gap-1">
                  <Input
                    id="produtividade_obtida"
                    value={prodObtidaStr}
                    onChange={(e) => setProdObtidaStr(e.target.value)}
                    onBlur={(e) => handleNumberBlur('produtividade_obtida', e.target.value, setProdObtidaStr)}
                    className="border-green-200 focus:border-green-500"
                    placeholder="0,00"
                  />
                  <Select value={formData.unidade_produtividade_obtida} onValueChange={(v) => handleInputChange('unidade_produtividade_obtida', v)}>
                    <SelectTrigger className="w-[100px] border-green-200"><SelectValue placeholder="Unidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg/ha">Kg/ha</SelectItem>
                      <SelectItem value="T/ha">T/ha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="area_plantada" className="text-green-700 font-medium">Área Plantada (ha)</Label>
                <Input
                  id="area_plantada"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.area_plantada}
                  onChange={(e) => handleInputChange("area_plantada", parseFloat(e.target.value))}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
              <div>
                <Label htmlFor="preco_unitario_obtido" className="text-green-700 font-medium">Preço Unitário Obtido</Label>
                <div className="flex gap-1">
                  <Input
                    id="preco_unitario_obtido"
                    value={precoObtidoStr}
                    onChange={(e) => setPrecoObtidoStr(e.target.value)}
                    onBlur={(e) => handleNumberBlur('preco_unitario_obtido', e.target.value, setPrecoObtidoStr)}
                    className="border-green-200 focus:border-green-500"
                    placeholder="0,00"
                  />
                  <Select value={formData.unidade_preco_obtido} onValueChange={(v) => handleInputChange('unidade_preco_obtido', v)}>
                    <SelectTrigger className="w-[100px] border-green-200"><SelectValue placeholder="Unidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R$/Kg">R$/Kg</SelectItem>
                      <SelectItem value="R$/T">R$/T</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Início da Produção - Previsto */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Início da Produção - Previsto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="ano_previsto" className="text-blue-700 font-medium">Ano</Label>
                <Input
                  id="ano_previsto"
                  type="number"
                  value={formData.ano_previsto}
                  onChange={(e) => handleInputChange("ano_previsto", parseInt(e.target.value, 10))}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="sistema_producao_previsto" className="text-blue-700 font-medium">Sistema de Produção (Nº do Empre no RTA)</Label>
                <Input
                  id="sistema_producao_previsto"
                  value={formData.sistema_producao_previsto}
                  onChange={(e) => handleInputChange("sistema_producao_previsto", e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="inicio_plantio_previsto" className="text-blue-700 font-medium">Início do Plantio (Mês/Ano)</Label>
                <Input
                  id="inicio_plantio_previsto"
                  value={formData.inicio_plantio_previsto}
                  onChange={(e) => handleDateChange("inicio_plantio_previsto", e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                  maxLength={7}
                  placeholder="MM/AAAA"
                />
              </div>
              <div>
                <Label htmlFor="inicio_colheita_previsto" className="text-blue-700 font-medium">Início da Colheita (Mês/Ano)</Label>
                <Input
                  id="inicio_colheita_previsto"
                  value={formData.inicio_colheita_previsto}
                  onChange={(e) => handleDateChange("inicio_colheita_previsto", e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                  maxLength={7}
                  placeholder="MM/AAAA"
                />
              </div>
              <div>
                <Label htmlFor="produtividade_prevista" className="text-blue-700 font-medium">Produtividade Prevista</Label>
                 <div className="flex gap-1">
                  <Input
                    id="produtividade_prevista"
                    value={prodPrevistaStr}
                    onChange={(e) => setProdPrevistaStr(e.target.value)}
                    onBlur={(e) => handleNumberBlur('produtividade_prevista', e.target.value, setProdPrevistaStr)}
                    className="border-blue-200 focus:border-blue-500"
                    placeholder="0,00"
                  />
                  <Select value={formData.unidade_produtividade_prevista} onValueChange={(v) => handleInputChange('unidade_produtividade_prevista', v)}>
                    <SelectTrigger className="w-[100px] border-blue-200"><SelectValue placeholder="Unidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg/ha">Kg/ha</SelectItem>
                      <SelectItem value="T/ha">T/ha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="area_prevista" className="text-blue-700 font-medium">Área a Plantar (ha) *</Label>
                <Input
                  id="area_prevista"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.area_prevista}
                  onChange={(e) => handleInputChange("area_prevista", parseFloat(e.target.value))}
                  className="border-blue-200 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="preco_unitario_previsto" className="text-blue-700 font-medium">Preço Unitário Previsto</Label>
                <div className="flex gap-1">
                  <Input
                    id="preco_unitario_previsto"
                    value={precoPrevistoStr}
                    onChange={(e) => setPrecoPrevistoStr(e.target.value)}
                    onBlur={(e) => handleNumberBlur('preco_unitario_previsto', e.target.value, setPrecoPrevistoStr)}
                    className="border-blue-200 focus:border-blue-500"
                    placeholder="0,00"
                  />
                  <Select value={formData.unidade_preco_previsto} onValueChange={(v) => handleInputChange('unidade_preco_previsto', v)}>
                    <SelectTrigger className="w-[100px] border-blue-200"><SelectValue placeholder="Unidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R$/Kg">R$/Kg</SelectItem>
                      <SelectItem value="R$/T">R$/T</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Information about area validation */}
            {formData.area_prevista > 0 && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                <p className="text-sm text-blue-700">
                  ℹ️ <strong>Atenção:</strong> A soma das áreas utilizadas nas localizações da lavoura ({formatNumber(imoveisSelecionados.reduce((soma, imovel) => soma + (parseFloat(imovel.area_utilizada) || 0), 0))} ha) deve ser igual à Área a Plantar informada ({formatNumber(formData.area_prevista)} ha).
                  <br />
                  <strong>Preencha manualmente</strong> as áreas nas localizações abaixo - não há preenchimento automático.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t border-green-100">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 shadow-lg px-8"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {produto ? "Atualizar Produto" : "Salvar Produto"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
