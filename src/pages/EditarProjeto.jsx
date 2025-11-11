
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela";
import { addMonths, addYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Wheat, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FormularioProjeto from "../components/projeto/FormularioProjeto";
import AnexosProjeto from "../components/projeto/AnexosProjeto";

export default function EditarProjeto() {
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjeto, setIsLoadingProjeto] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Pegar ID do projeto e tab da URL
  const urlParams = new URLSearchParams(window.location.search);
  const projetoId = urlParams.get('id');
  const tabParam = urlParams.get('tab'); // 'contrato', 'art', ou 'geomapa'
  const defaultTab = ['contrato', 'art', 'geomapa'].includes(tabParam) ? tabParam : 'contrato';

  // Ref para a seção de anexos
  const anexosSectionRef = useRef(null);
  // Ref para o botão "Atualizar Projeto" (final da página)
  const updateButtonRef = useRef(null);

  const carregarProjeto = useCallback(async () => {
    if (!projetoId) {
      navigate(createPageUrl("TodosProjetos"));
      return;
    }

    setIsLoadingProjeto(true);
    try {
      const projetos = await ProjetoFinanciamento.list();
      const projetoEncontrado = projetos.find(p => p.id === projetoId);
      if (projetoEncontrado) {
        setProjeto(projetoEncontrado);
      } else {
        setErro("Projeto não encontrado");
        setTimeout(() => navigate(createPageUrl("TodosProjetos")), 2000);
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
      setErro("Erro ao carregar projeto");
    }
    setIsLoadingProjeto(false);
  }, [projetoId, navigate]);

  useEffect(() => {
    carregarProjeto();
  }, [carregarProjeto]);

  // Scroll GARANTIDO até o botão quando houver parâmetro tab
  useEffect(() => {
    if (projeto && tabParam && updateButtonRef.current) {
      const scrollToButton = () => {
        const button = updateButtonRef.current;
        if (!button) return false;

        // Calcular posição exata do botão
        const rect = button.getBoundingClientRect();
        const absoluteTop = rect.top + window.pageYOffset;
        
        // Rolar para mostrar o botão no CENTRO da tela (garantia de visibilidade)
        const targetScroll = absoluteTop - (window.innerHeight / 2) + (rect.height / 2);
        
        window.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
        
        return true;
      };

      // Estratégia robusta: múltiplas tentativas com delays crescentes
      // Isso ajuda a garantir que o scroll ocorra após o DOM estar mais estável
      // (ex: imagens carregadas, conteúdo de abas dinâmicas)
      setTimeout(scrollToButton, 400);
      setTimeout(scrollToButton, 800);
      setTimeout(scrollToButton, 1200);
      
      // Observer para reagir a mudanças no DOM da seção de anexos,
      // que podem afetar a posição do botão de atualização.
      let observer;
      if (anexosSectionRef.current) {
        observer = new MutationObserver(() => {
          scrollToButton();
        });
        observer.observe(anexosSectionRef.current, {
          childList: true, // Observa adição/remoção de filhos
          subtree: true,   // Observa mudanças em toda a subárvore
          attributes: true // Observa mudanças em atributos (ex: classes, estilos)
        });
      }
      
      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [projeto, tabParam]); // Dependências: projeto carregado e tabParam presente

  const calcularEGerarParcelas = async (currentProjetoId, dados) => {
    // 1. Deletar parcelas existentes
    const parcelasAntigas = await Parcela.filter({ projeto_id: currentProjetoId });
    for (const parcela of parcelasAntigas) {
      await Parcela.delete(parcela.id);
    }

    // 2. Gerar novas parcelas (mesma lógica do NovoProjeto)
    const { 
      valor_financiado, 
      quantidade_parcelas, 
      tipo_calculo, 
      cronograma_automatico, // Novo campo para cronograma pré-calculado
      parcelas_manuais 
    } = dados;
    
    if (!valor_financiado || !quantidade_parcelas) return;

    const numParcelas = parseInt(quantidade_parcelas, 10);
    const novasParcelas = [];

    if (tipo_calculo === 'manual' && parcelas_manuais) {
      // Cálculo Manual - usar os valores e datas inseridos pelo usuário
      for (let i = 0; i < numParcelas; i++) {
        const parcelaManual = parcelas_manuais[i];
        if (parcelaManual) {
          novasParcelas.push({
            projeto_id: currentProjetoId,
            numero_parcela: i + 1,
            data_vencimento: parcelaManual.data_vencimento || new Date().toISOString().split('T')[0],
            valor_parcela: parseFloat(parcelaManual.valor || 0),
            status: "pendente",
            tipo_parcela: "manual" // Adicionando tipo para parcela manual
          });
        }
      }
    } else if (tipo_calculo === 'automatico' && cronograma_automatico && cronograma_automatico.length > 0) {
      // Usar cronograma já calculado e passado pelo formulário
      for (const item of cronograma_automatico) {
        novasParcelas.push({
          projeto_id: currentProjetoId,
          numero_parcela: item.numero,
          data_vencimento: item.data_vencimento,
          valor_parcela: parseFloat(item.valor),
          status: "pendente",
          tipo_parcela: item.tipo // Tipo de parcela (SAC, PRICE, PÓS-FIXADA)
        });
      }
    }
    // O antigo cálculo automático direto foi removido daqui,
    // pois agora o FormularioProjeto é responsável por gerar o cronograma_automatico
    // e passá-lo para esta função.

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
        p => p.id !== projetoId && p.numero_contrato === dadosProjeto.numero_contrato
      );
      if (contratoExistente) {
        setErro("Já existe outro projeto com este Número de Contrato.");
        setIsLoading(false);
        return;
      }
    }

    try {
      await ProjetoFinanciamento.update(projetoId, dadosProjeto);
      await calcularEGerarParcelas(projetoId, dadosProjeto);
      
      setSucesso(true);
      setTimeout(() => {
        navigate(createPageUrl("TodosProjetos"));
      }, 2000);
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      setErro("Erro ao atualizar o projeto. Tente novamente.");
    }
    
    setIsLoading(false);
  };

  if (isLoadingProjeto) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-green-900 mb-2">Carregando Projeto</h2>
            <p className="text-green-600">
              Aguarde enquanto buscamos os dados...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wheat className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Projeto Atualizado!</h2>
            <p className="text-green-600 mb-4">
              As alterações foram salvas com sucesso.
            </p>
            <p className="text-sm text-gray-500">
              Redirecionando para a lista de projetos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projeto && erro) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate(createPageUrl("TodosProjetos"))}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Projetos
          </Button>
        </div>
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
              onClick={() => navigate(createPageUrl("TodosProjetos"))}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-900">
                Editar Projeto
              </h1>
              <p className="text-green-600 mt-1">
                {projeto?.nome_cliente} - {projeto?.item_financiado}
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {projeto && (
          <div className="space-y-6">
            <Card className="shadow-xl border-green-100">
              {/* Conditional CardHeader styling for 'canceled' projects */}
              <CardHeader className={
                projeto?.status === 'cancelado'
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-lg"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg"
              }>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Edit className="w-5 h-5" />
                  Dados do Projeto
                  {projeto?.status === 'cancelado' && (
                    <span className="ml-2 px-2 py-1 text-xs font-semibold bg-white text-red-700 rounded-full">
                      CANCELADO
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <FormularioProjeto 
                  projeto={projeto}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>

            <div ref={anexosSectionRef} id="secao-anexos">
              <AnexosProjeto projetoId={projetoId} defaultTab={defaultTab} />
            </div>

            {/* Botão "Atualizar Projeto" - final da página */}
            <div 
              ref={updateButtonRef} 
              id="btnAtualizarProjeto"
              className="flex justify-end pt-6 border-t border-green-200 pb-8"
            >
              <Button
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }
                }}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 shadow-lg px-8 py-3 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Atualizar Projeto
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
