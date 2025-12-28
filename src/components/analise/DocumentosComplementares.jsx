import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2, Eye, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function DocumentosComplementares({ imovel, onAtualizar }) {
  const [arquivos, setArquivos] = useState({
    cnd: null,
    ccir: null,
    car: null
  });
  
  const [processando, setProcessando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState(null);

  const handleFileUpload = (tipo, file) => {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande", {
        description: `O arquivo deve ter no máximo 10MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        duration: 4000
      });
      return;
    }
    
    setArquivos(prev => ({ ...prev, [tipo]: file }));
  };

  const analisarDocumentos = async () => {
    const arquivosParaProcessar = Object.entries(arquivos).filter(([_, file]) => file !== null);
    
    if (arquivosParaProcessar.length === 0) {
      toast.error("Selecione pelo menos um documento para analisar");
      return;
    }

    try {
      setProcessando(true);
      const resultados = {
        nirf_cib: null,
        numero_incra: null,
        car_numero: null
      };

      // Processar cada arquivo
      for (const [tipo, file] of arquivosParaProcessar) {
        toast.info(`Analisando ${tipo.toUpperCase()}...`, { duration: 2000 });
        
        // Upload do arquivo
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult?.file_url) continue;

        let prompt = "";
        let campo = "";

        if (tipo === "cnd") {
          campo = "nirf_cib";
          prompt = `Analise este documento CND (Certidão Negativa de Débitos) do Imóvel Rural.

TAREFA: Extrair o valor do CIB (Cadastro de Imóvel Rural).

Procure por:
- "CIB:" ou "CIB N°" ou "Código CIB" 
- O número geralmente está no formato: 1.944.692-6 (ou sem pontuação)

REGRAS:
- Manter pontos e hífen se houver
- Remover espaços extras
- Se não encontrar, retornar null

Responda APENAS com o número do CIB ou null.`;
        } else if (tipo === "ccir") {
          campo = "numero_incra";
          prompt = `Analise este documento CCIR (Certificado de Cadastro de Imóvel Rural).

TAREFA: Extrair o "Código do Imóvel Rural" emitido pelo INCRA.

Procure por:
- "CÓDIGO DO IMÓVEL RURAL" ou "Código do Imóvel" ou "NIRF"
- O número geralmente está no formato: 936.103.000.787-0 (13 dígitos)

REGRAS:
- Manter pontos e hífen se houver
- Remover espaços extras
- Se não encontrar, retornar null

Responda APENAS com o código do INCRA ou null.`;
        } else if (tipo === "car") {
          campo = "car_numero";
          prompt = `Analise este Recibo de Inscrição no CAR (Cadastro Ambiental Rural).

TAREFA: Extrair o número de registro no CAR.

Procure por:
- "Registro no CAR:" ou "Código CAR" ou "Número CAR"
- O registro é uma string longa com letras, números e hífens

REGRAS:
- Capturar a linha completa do registro
- Manter formato original
- Se não encontrar, retornar null

Responda APENAS com o código CAR ou null.`;
        }

        try {
          const resultado = await base44.integrations.Core.InvokeLLM({
            prompt,
            file_urls: [uploadResult.file_url]
          });

          if (resultado && resultado !== "null" && resultado.trim() !== "") {
            resultados[campo] = resultado.trim();
          }
        } catch (error) {
          console.error(`Erro ao processar ${tipo}:`, error);
        }
      }

      setDadosExtraidos(resultados);
      toast.success("Análise concluída", {
        description: "Revise os dados identificados abaixo",
        duration: 3000
      });
    } catch (error) {
      console.error("Erro ao analisar documentos:", error);
      toast.error("Erro ao analisar documentos", {
        description: error.message,
        duration: 4000
      });
    } finally {
      setProcessando(false);
    }
  };

  const substituirDados = async () => {
    if (!dadosExtraidos) return;

    const camposParaAtualizar = {};
    let camposAtualizados = [];

    if (dadosExtraidos.nirf_cib) {
      camposParaAtualizar.receita_federal = dadosExtraidos.nirf_cib;
      camposAtualizados.push("NIRF/CIB");
    }

    if (dadosExtraidos.numero_incra) {
      camposParaAtualizar.numero_incra = dadosExtraidos.numero_incra;
      camposAtualizados.push("Número INCRA");
    }

    if (dadosExtraidos.car_numero) {
      camposParaAtualizar.car_numero = dadosExtraidos.car_numero;
      camposAtualizados.push("CAR Nº");
    }

    if (Object.keys(camposParaAtualizar).length === 0) {
      toast.error("Nenhum dado foi identificado para atualizar");
      return;
    }

    try {
      await base44.entities.Imovel.update(imovel.id, camposParaAtualizar);
      
      toast.success("Dados substituídos com sucesso", {
        description: `Campos atualizados: ${camposAtualizados.join(", ")}`,
        duration: 4000
      });

      // Resetar estados
      setArquivos({ cnd: null, ccir: null, car: null });
      setDadosExtraidos(null);

      // Notificar componente pai para atualizar
      if (onAtualizar) {
        onAtualizar();
      }
    } catch (error) {
      console.error("Erro ao atualizar imóvel:", error);
      toast.error("Erro ao substituir dados", {
        description: error.message,
        duration: 4000
      });
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
          📎 Documentos Complementares (CND/CCIR/CAR)
        </h3>

        {/* Valores Atuais */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-purple-200">
          <p className="text-xs font-semibold text-purple-800 mb-3">Valores Atuais no Cadastro</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-sm">
            <div className="md:col-span-3">
              <Label className="text-xs text-gray-500">NIRF/CIB</Label>
              <p className="font-medium text-gray-900 truncate">{imovel.receita_federal || "—"}</p>
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs text-gray-500">Número INCRA</Label>
              <p className="font-medium text-gray-900 truncate">{imovel.numero_incra || "—"}</p>
            </div>
            <div className="md:col-span-6">
              <Label className="text-xs text-gray-500">CAR Nº</Label>
              <p className="font-medium text-gray-900 break-all text-xs">{imovel.car_numero || "—"}</p>
            </div>
          </div>
        </div>

        {/* Upload de Arquivos */}
        <div className="space-y-3 mb-6">
          {/* CND */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">CND do Imóvel Rural (CIB)</Label>
              <Badge variant="outline" className={arquivos.cnd ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}>
                {arquivos.cnd ? "Enviado" : "Não enviado"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {arquivos.cnd ? arquivos.cnd.name : "Selecionar PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload('cnd', e.target.files[0])}
                  className="hidden"
                />
              </label>
              {arquivos.cnd && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = URL.createObjectURL(arquivos.cnd);
                    window.open(url, '_blank');
                  }}
                  className="h-10"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* CCIR */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">CCIR (Certificado INCRA)</Label>
              <Badge variant="outline" className={arquivos.ccir ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}>
                {arquivos.ccir ? "Enviado" : "Não enviado"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {arquivos.ccir ? arquivos.ccir.name : "Selecionar PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload('ccir', e.target.files[0])}
                  className="hidden"
                />
              </label>
              {arquivos.ccir && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = URL.createObjectURL(arquivos.ccir);
                    window.open(url, '_blank');
                  }}
                  className="h-10"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* CAR */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">Recibo do CAR</Label>
              <Badge variant="outline" className={arquivos.car ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}>
                {arquivos.car ? "Enviado" : "Não enviado"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {arquivos.car ? arquivos.car.name : "Selecionar PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('car', e.target.files[0])}
                  className="hidden"
                />
              </label>
              {arquivos.car && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = URL.createObjectURL(arquivos.car);
                    window.open(url, '_blank');
                  }}
                  className="h-10"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Botão Analisar */}
        <div className="mb-6">
          <Button
            onClick={analisarDocumentos}
            disabled={processando || Object.values(arquivos).every(f => f === null)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {processando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando documentos...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Analisar Documentos
              </>
            )}
          </Button>
        </div>

        {/* Dados Identificados */}
        {dadosExtraidos && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <p className="text-sm font-semibold text-blue-900 mb-4">✨ Dados Identificados</p>
              <div className="space-y-3">
                {/* NIRF/CIB */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 block mb-1">NIRF/CIB</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{imovel.receita_federal || "—"}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-blue-700">
                        {dadosExtraidos.nirf_cib || (
                          <span className="text-orange-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Não identificado
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {dadosExtraidos.nirf_cib && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>

                {/* Número INCRA */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 block mb-1">Número INCRA</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{imovel.numero_incra || "—"}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-blue-700">
                        {dadosExtraidos.numero_incra || (
                          <span className="text-orange-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Não identificado
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {dadosExtraidos.numero_incra && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>

                {/* CAR Nº */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 block mb-1">CAR Nº</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 truncate max-w-[200px]">
                        {imovel.car_numero || "—"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-blue-700 truncate">
                        {dadosExtraidos.car_numero || (
                          <span className="text-orange-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Não identificado
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {dadosExtraidos.car_numero && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Avisos */}
            {(!dadosExtraidos.nirf_cib || !dadosExtraidos.numero_incra || !dadosExtraidos.car_numero) && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800">
                  ⚠️ Alguns campos não foram identificados automaticamente. Apenas os campos identificados serão atualizados.
                </p>
              </div>
            )}

            {/* Botão Substituir */}
            <Button
              onClick={substituirDados}
              disabled={!dadosExtraidos.nirf_cib && !dadosExtraidos.numero_incra && !dadosExtraidos.car_numero}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Substituir Dados no Imóvel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}