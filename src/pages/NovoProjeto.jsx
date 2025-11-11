
import React, { useState } from "react";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela";
import { addMonths, addYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Wheat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FormularioProjeto from "../components/projeto/FormularioProjeto";

export default function NovoProjeto() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const calcularEGerarParcelas = async (projetoId, dados) => {
    const {
      valor_financiado,
      taxa_juros,
      quantidade_parcelas,
      tipo_pagamento, // 'mensal' or 'anual'
      data_primeira_parcela,
      tipo_calculo, // 'automatico' or 'manual'
      parcelas_manuais, // array of { valor: number, data_vencimento: string }
      tipo_calculo_auto, // 'price', 'sac', 'pos_fixado'
      carencia_periodos, // number of periods for grace
      pagar_juros_carencia, // boolean
      cronograma_automatico // array of { numero: number, data_vencimento: string, valor: number, tipo: string }
    } = dados;

    if (!valor_financiado || !quantidade_parcelas) {
      console.log("Dados insuficientes para cálculo de parcelas.");
      return;
    }

    const numParcelas = parseInt(quantidade_parcelas, 10);
    const novasParcelas = [];

    // Initialize current date for parcel generation.
    // If data_primeira_parcela is not provided, default to current date.
    let currentParcelDate = data_primeira_parcela ? new Date(data_primeira_parcela + 'T00:00:00') : new Date();

    if (tipo_calculo === 'manual') {
      // Cálculo Manual - usar valores e datas inseridos pelo usuário, com fallback para periodicidade calculada
      for (let i = 0; i < numParcelas; i++) {
        // Ensure parcelaManual is an object even if parcelas_manuais[i] is undefined
        const parcelaManual = parcelas_manuais && parcelas_manuais[i] ? parcelas_manuais[i] : {};

        let dataVencimentoParaParcela;
        if (parcelaManual.data_vencimento) {
          // Se a data manual for fornecida, use-a
          dataVencimentoParaParcela = parcelaManual.data_vencimento;
        } else {
          // Se não houver data manual, use a data calculada automaticamente para esta iteração
          // Formata a data para YYYY-MM-DD
          dataVencimentoParaParcela = currentParcelDate.toISOString().split('T')[0];
        }

        novasParcelas.push({
          projeto_id: projetoId,
          numero_parcela: i + 1,
          data_vencimento: dataVencimentoParaParcela,
          valor_parcela: parseFloat(parcelaManual.valor || 0), // Usa valor manual, padroniza para 0 se não fornecido
          status: "pendente"
        });

        // Avança `currentParcelDate` para a próxima data calculada automaticamente.
        // Isso garante que as datas geradas mantenham a periodicidade, mesmo que algumas datas manuais tenham sido sobrescritas.
        if (tipo_pagamento === 'mensal') {
          currentParcelDate = addMonths(currentParcelDate, 1);
        } else if (tipo_pagamento === 'anual') {
          currentParcelDate = addYears(currentParcelDate, 1);
        } else {
          // Fallback para mensal se tipo_pagamento estiver faltando ou for inválido
          currentParcelDate = addMonths(currentParcelDate, 1);
        }
      }
    } else if (tipo_calculo === 'automatico' && cronograma_automatico && cronograma_automatico.length > 0) {
      // Usar cronograma já calculado e fornecido (para PRICE, SAC, Pós-fixado, com/sem carência)
      for (const item of cronograma_automatico) {
        novasParcelas.push({
          projeto_id: projetoId,
          numero_parcela: item.numero,
          data_vencimento: item.data_vencimento,
          valor_parcela: parseFloat(item.valor),
          status: "pendente",
          tipo_parcela: item.tipo // E.g., "Carência", "Carência (Juros)", "Parcela"
        });
      }
    }
    // The previous simple automatic calculation logic (Tabela Price simplified)
    // has been removed as a more advanced cronograma_automatico is now expected.
    // If tipo_calculo is 'automatico' but cronograma_automatico is not provided,
    // then no parcels will be generated, which is the intended behavior.

    if (novasParcelas.length > 0) {
      await Parcela.bulkCreate(novasParcelas);
    }
  };

  const handleSubmit = async (dadosProjeto) => {
    setIsLoading(true);
    setErro("");
    setSucesso(false);

    // Validação de Duplicidade de Contrato
    if (dadosProjeto.numero_contrato && dadosProjeto.numero_contrato.trim() !== "") {
      const todosProjetos = await ProjetoFinanciamento.list();
      const contratoExistente = todosProjetos.some(
        p => p.numero_contrato === dadosProjeto.numero_contrato
      );
      if (contratoExistente) {
        setErro("Já existe um projeto com este Número de Contrato.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const novoProjeto = await ProjetoFinanciamento.create(dadosProjeto);
      await calcularEGerarParcelas(novoProjeto.id, dadosProjeto);
      
      setSucesso(true);
      setTimeout(() => {
        navigate(createPageUrl("TodosProjetos"));
      }, 2000);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      setErro("Erro ao salvar o projeto. Tente novamente.");
    }
    
    setIsLoading(false);
  };

  if (sucesso) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wheat className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Projeto Criado!</h2>
            <p className="text-green-600 mb-4">
              Seu projeto de financiamento foi registrado com sucesso.
            </p>
            <p className="text-sm text-gray-500">
              Redirecionando para a lista de projetos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-900">
                Novo Projeto de Financiamento
              </h1>
              <p className="text-green-600 mt-1">
                Preencha os dados do projeto para protocolo
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-xl border-green-100">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 /text-xl">
              <Save className="w-5 h-5" />
              Dados do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FormularioProjeto 
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
