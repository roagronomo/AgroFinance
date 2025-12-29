import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, AlertTriangle, Link as LinkIcon } from "lucide-react";

export default function CorrecaoVinculos() {
  const [carregando, setCarregando] = useState(true);
  const [diagnostico, setDiagnostico] = useState(null);
  const [mapeamento, setMapeamento] = useState({});
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregarDiagnostico();
  }, []);

  const carregarDiagnostico = async () => {
    try {
      setCarregando(true);
      const response = await base44.functions.invoke('corrigirVinculosClientes', {});
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setDiagnostico(response.data);
    } catch (error) {
      console.error("Erro:", error);
      setErro(error.message || "Erro ao carregar diagnóstico");
    } finally {
      setCarregando(false);
    }
  };

  const handleClienteSelect = (clienteIdAntigo, clienteIdNovo) => {
    setMapeamento(prev => ({
      ...prev,
      [clienteIdAntigo]: clienteIdNovo
    }));
  };

  const executarCorrecao = async () => {
    const qtdMapeamentos = Object.keys(mapeamento).length;
    const qtdGrupos = Object.keys(diagnostico.grupos_orfaos).length;

    if (qtdMapeamentos === 0) {
      alert("Selecione pelo menos um cliente para vincular");
      return;
    }

    if (qtdMapeamentos < qtdGrupos) {
      if (!window.confirm(`Você mapeou ${qtdMapeamentos} de ${qtdGrupos} grupos. Deseja continuar mesmo assim?`)) {
        return;
      }
    }

    try {
      setExecutando(true);
      setErro(null);

      const response = await base44.functions.invoke('vincularImoveis', { mapeamento });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResultado(response.data);
      await carregarDiagnostico();
    } catch (error) {
      console.error("Erro:", error);
      setErro(error.message || "Erro ao executar correção");
    } finally {
      setExecutando(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (erro && !diagnostico) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Erro:</strong> {erro}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Correção de Vínculos</h1>
        <p className="text-gray-500 mt-1">
          Vincule os imóveis e planos aos clientes corretos
        </p>
      </div>

      {diagnostico && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Clientes</p>
                <p className="text-2xl font-bold text-blue-600">{diagnostico.diagnostico.total_clientes}</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Imóveis</p>
                <p className="text-2xl font-bold text-green-600">{diagnostico.diagnostico.total_imoveis}</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Planos</p>
                <p className="text-2xl font-bold text-purple-600">{diagnostico.diagnostico.total_planos}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Órfãos</p>
                <p className="text-2xl font-bold text-orange-600">{diagnostico.diagnostico.imoveis_orfaos}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Planos Órfãos</p>
                <p className="text-2xl font-bold text-red-600">{diagnostico.diagnostico.planos_orfaos}</p>
              </CardContent>
            </Card>
          </div>

          {Object.keys(diagnostico.grupos_orfaos).length > 0 ? (
            <>
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800 text-sm">
                  💡 Para cada grupo de imóveis órfãos abaixo, selecione o cliente correto. 
                  Depois clique em "Executar Correção" para vincular todos de uma vez.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Grupos de Imóveis Órfãos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(diagnostico.grupos_orfaos).map(([clienteIdAntigo, imoveis]) => (
                    <div key={clienteIdAntigo} className="p-4 border rounded-lg bg-gray-50">
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 font-mono mb-1">ID Antigo: {clienteIdAntigo}</p>
                        <p className="font-semibold text-gray-900 mb-2">
                          {imoveis.length} imóvel(is):
                        </p>
                        <div className="space-y-1 mb-3">
                          {imoveis.slice(0, 3).map(im => (
                            <p key={im.id} className="text-sm text-gray-600">
                              • {im.nome} ({im.municipio})
                            </p>
                          ))}
                          {imoveis.length > 3 && (
                            <p className="text-sm text-gray-400">... e mais {imoveis.length - 3}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-400" />
                        <Select
                          value={mapeamento[clienteIdAntigo] || ""}
                          onValueChange={(value) => handleClienteSelect(clienteIdAntigo, value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o cliente correto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {diagnostico.clientes_disponiveis.map(cliente => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nome} - {cliente.cpf} ({cliente.cidade}/{cliente.uf})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={executarCorrecao}
                  disabled={executando || Object.keys(mapeamento).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {executando ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Executar Correção ({Object.keys(mapeamento).length} vinculados)
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Todos os imóveis e planos estão corretamente vinculados!
              </AlertDescription>
            </Alert>
          )}

          {resultado && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-semibold mb-2">✅ Correção concluída!</p>
                <ul className="text-sm space-y-1">
                  <li>• {resultado.resumo.imoveis_atualizados} imóveis atualizados</li>
                  <li>• {resultado.resumo.planos_atualizados} planos atualizados</li>
                  {resultado.resumo.erros > 0 && (
                    <li className="text-orange-700">• {resultado.resumo.erros} erros</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {erro && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Erro:</strong> {erro}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}