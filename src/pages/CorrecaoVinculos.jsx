import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function CorrecaoVinculos() {
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const executarCorrecao = async () => {
    if (!window.confirm("⚠️ Isso irá atualizar os vínculos de TODOS os imóveis e planos de produção.\n\nDeseja continuar?")) {
      return;
    }

    try {
      setExecutando(true);
      setErro(null);
      setResultado(null);

      const response = await base44.functions.invoke('corrigirVinculosClientes', {});
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResultado(response.data);
    } catch (error) {
      console.error("Erro:", error);
      setErro(error.message || "Erro desconhecido ao executar correção");
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Correção Automática de Vínculos</h1>
        <p className="text-gray-500 mt-1">
          Corrige automaticamente os vínculos entre clientes, imóveis e planos após a importação
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-blue-800">
              <p className="font-semibold">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Busca os clientes do app antigo (Cerrado Consultoria) via API</li>
                <li>Compara os CPFs para mapear IDs antigos → IDs novos</li>
                <li>Atualiza todos os imóveis e planos com os IDs corretos</li>
                <li>Mostra um resumo do que foi corrigido</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executar Correção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={executarCorrecao}
            disabled={executando}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {executando ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Corrigindo vínculos...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Executar Correção Automática
              </>
            )}
          </Button>

          {erro && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Erro:</strong> {erro}
              </AlertDescription>
            </Alert>
          )}

          {resultado && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>✅ Correção concluída com sucesso!</strong>
                </AlertDescription>
              </Alert>

              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Imóveis Atualizados</p>
                      <p className="text-3xl font-bold text-green-600">
                        {resultado.resumo?.imoveis_atualizados || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600">Planos Atualizados</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {resultado.resumo?.planos_atualizados || 0}
                      </p>
                    </div>
                  </div>

                  {(resultado.resumo?.imoveis_nao_encontrados > 0 || resultado.resumo?.planos_nao_encontrados > 0) && (
                    <Alert className="mt-4 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <p className="font-semibold mb-2">Registros não encontrados:</p>
                        <ul className="text-sm space-y-1">
                          {resultado.resumo.imoveis_nao_encontrados > 0 && (
                            <li>• {resultado.resumo.imoveis_nao_encontrados} imóveis sem correspondência</li>
                          )}
                          {resultado.resumo.planos_nao_encontrados > 0 && (
                            <li>• {resultado.resumo.planos_nao_encontrados} planos sem correspondência</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800 text-sm">
                  💡 Você pode agora ir em <strong>Cadastro de Imóveis</strong> para verificar se os imóveis estão aparecendo corretamente vinculados aos clientes.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}