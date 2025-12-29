import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { diagnosticarVinculos } from "@/functions/diagnosticarVinculos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function CorrecaoVinculos() {
  const [diagnostico, setDiagnostico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [corrigindo, setCorrigindo] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    carregarDiagnostico();
  }, []);

  const carregarDiagnostico = async () => {
    try {
      setCarregando(true);
      const { data } = await diagnosticarVinculos({});
      setDiagnostico(data);
    } catch (error) {
      console.error("Erro ao diagnosticar:", error);
      alert("Erro ao carregar diagnóstico");
    } finally {
      setCarregando(false);
    }
  };

  const corrigirVinculos = async () => {
    if (!window.confirm("Isso irá atualizar os vínculos de todos os imóveis e planos. Continuar?")) {
      return;
    }

    try {
      setCorrigindo(true);
      
      // Criar mapa de CPF → ID novo
      const mapaCpf = {};
      diagnostico.clientes_disponiveis.forEach(c => {
        const cpfLimpo = (c.cpf || '').replace(/\D/g, '');
        if (cpfLimpo) {
          mapaCpf[cpfLimpo] = c.id;
        }
      });

      let imoveisAtualizados = 0;
      let planosAtualizados = 0;
      let erros = [];

      // Para cada grupo de imóveis órfãos
      for (const [clienteIdAntigo, imoveis] of Object.entries(diagnostico.imoveis_por_cliente_antigo)) {
        // Buscar o primeiro imóvel para ter mais contexto
        const primeiroImovel = await base44.entities.Imovel.filter({ id: imoveis[0].id });
        
        if (!primeiroImovel || primeiroImovel.length === 0) {
          console.log(`Imóvel ${imoveis[0].id} não encontrado`);
          continue;
        }

        // Tentar encontrar cliente pelo nome do município ou manualmente
        // Como não temos o nome do cliente no imóvel, vamos precisar de uma estratégia diferente
        // Por ora, vamos apenas reportar o problema
        erros.push({
          cliente_id_antigo: clienteIdAntigo,
          imoveis: imoveis.map(i => i.nome)
        });
      }

      setResultado({
        imoveisAtualizados,
        planosAtualizados,
        erros
      });
    } catch (error) {
      console.error("Erro ao corrigir:", error);
      alert("Erro ao corrigir vínculos: " + error.message);
    } finally {
      setCorrigindo(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Correção de Vínculos</h1>
        <p className="text-gray-500 mt-1">Corrige os vínculos entre clientes, imóveis e planos de produção após importação</p>
      </div>

      {diagnostico && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Clientes</p>
                  <p className="text-2xl font-bold text-blue-600">{diagnostico.diagnostico.total_clientes}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Imóveis</p>
                  <p className="text-2xl font-bold text-green-600">{diagnostico.diagnostico.total_imoveis}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Planos</p>
                  <p className="text-2xl font-bold text-purple-600">{diagnostico.diagnostico.total_planos}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                  <p className="text-sm text-gray-600">Imóveis Órfãos</p>
                  <p className="text-2xl font-bold text-orange-600">{diagnostico.diagnostico.imoveis_orfaos}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
                  <p className="text-sm text-gray-600">Planos Órfãos</p>
                  <p className="text-2xl font-bold text-red-600">{diagnostico.diagnostico.planos_orfaos}</p>
                </div>
              </div>

              {(diagnostico.diagnostico.imoveis_orfaos > 0 || diagnostico.diagnostico.planos_orfaos > 0) && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Problema Identificado:</strong> Existem {diagnostico.diagnostico.imoveis_orfaos} imóveis e {diagnostico.diagnostico.planos_orfaos} planos 
                    com cliente_id de outro aplicativo. Eles precisam ser vinculados aos clientes corretos deste app.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {Object.keys(diagnostico.imoveis_por_cliente_antigo).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>IDs de Cliente Antigos Detectados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(diagnostico.imoveis_por_cliente_antigo).map(([clienteIdAntigo, imoveis]) => (
                    <div key={clienteIdAntigo} className="p-4 bg-gray-50 rounded-lg border">
                      <p className="font-mono text-xs text-gray-500 mb-2">Cliente ID Antigo: {clienteIdAntigo}</p>
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        {imoveis.length} imóvel(is) órfão(s)
                      </p>
                      <div className="space-y-1">
                        {imoveis.slice(0, 3).map(im => (
                          <p key={im.id} className="text-xs text-gray-600">
                            • {im.nome} ({im.municipio})
                          </p>
                        ))}
                        {imoveis.length > 3 && (
                          <p className="text-xs text-gray-400">... e mais {imoveis.length - 3}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Alert className="mt-4 border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>💡 Como corrigir:</strong> Você precisa atualizar manualmente o campo <code className="bg-blue-100 px-1 rounded">cliente_id</code> de cada imóvel órfão 
                    para o ID correto do cliente no novo app. Vá no painel Admin → Dados → Imovel e edite os registros órfãos.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {resultado && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Correção concluída: {resultado.imoveisAtualizados} imóveis e {resultado.planosAtualizados} planos atualizados.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button onClick={carregarDiagnostico} variant="outline" disabled={carregando}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Recarregar Diagnóstico
        </Button>
      </div>
    </div>
  );
}