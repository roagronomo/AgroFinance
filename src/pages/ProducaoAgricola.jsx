import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FileText } from "lucide-react";
import SeletorCliente from "../components/clientes/SeletorCliente";
import FiltroMunicipio from "../components/producao/FiltroMunicipio";
import SeletorQuantidadeProdutos from "../components/producao/SeletorQuantidadeProdutos";
import FormularioProduto from "../components/producao/FormularioProduto";
import LocalizacaoLavoura from "../components/producao/LocalizacaoLavoura";
import RelatorioProducao from "../components/producao/RelatorioProducao";
import { useAreaFormatter } from "../components/hooks/useAreaFormatter"; // Corrected import path

export default function ProducaoAgricola() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null); // Added for standardized client selection
  const [imoveisCliente, setImoveisCliente] = useState([]);
  const [planosExistentes, setPlanosExistentes] = useState([]);
  const [municipioSelecionado, setMunicipioSelecionado] = useState(null);
  const [imoveisFiltrados, setImoveisFiltrados] = useState([]);
  const [quantidadeProdutos, setQuantidadeProdutos] = useState(null);

  // Estados dinâmicos para múltiplos produtos
  const [produtos, setProdutos] = useState({});
  const [imoveisPorProduto, setImoveisPorProduto] = useState({});

  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ativar formatação automática de áreas
  useAreaFormatter();

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const resetarEstado = useCallback(() => {
    setImoveisCliente([]);
    setPlanosExistentes([]);
    setMunicipioSelecionado(null);
    setImoveisFiltrados([]);
    setQuantidadeProdutos(null);
    setProdutos({});
    setImoveisPorProduto({});
  }, []);

  const carregarDadosPorMunicipio = useCallback(async (clienteId, municipio, quantidade) => {
    try {
      const planosDoMunicipio = planosExistentes.filter(plano =>
        plano.cliente_id === clienteId && plano.municipio_lavoura === municipio
      );

      const produtosCarregados = {};
      const localizacoesCarregadas = {};

      // Carregar dados existentes para cada produto dentro da quantidade selecionada
      for (let i = 1; i <= quantidade; i++) {
        const planoExistente = planosDoMunicipio.find(plano => plano.numero_produto === i);
        
        if (planoExistente) {
          produtosCarregados[i] = planoExistente;
          
          // IMPORTANTE: Carregar apenas as áreas já salvas, SEM preenchimento automático
          if (planoExistente.imoveis_com_area && planoExistente.imoveis_com_area.length > 0) {
            localizacoesCarregadas[i] = planoExistente.imoveis_com_area.map(item => ({
              id: item.id,
              area_utilizada: item.area_utilizada || "" // Manter string vazia se não houver valor salvo
            }));
          } else if (planoExistente.imoveis_ids && planoExistente.imoveis_ids.length > 0) {
            // Se existe imoveis_ids mas não tem imoveis_com_area, criar entradas vazias
            localizacoesCarregadas[i] = planoExistente.imoveis_ids.map(imovelId => ({
              id: imovelId,
              area_utilizada: "" // CAMPO EM BRANCO - sem preenchimento automático
            }));
          } else {
            localizacoesCarregadas[i] = [];
          }
        } else {
          produtosCarregados[i] = null;
          localizacoesCarregadas[i] = []; // Lista vazia para novos produtos
        }
      }

      setProdutos(produtosCarregados);
      setImoveisPorProduto(localizacoesCarregadas);
    } catch (error) {
      console.error("Erro ao carregar dados por município:", error);
    }
  }, [planosExistentes]);

  const handleClienteSelect = useCallback((cliente) => {
    setClienteSelecionado(cliente);
    setSelectedClientId(cliente?.id || null);
    
    // Salvar na URL para persistência
    if (cliente) {
      const url = new URL(window.location);
      url.searchParams.set('cliente', cliente.id);
      window.history.replaceState({}, '', url);
    } else {
      const url = new URL(window.location);
      url.searchParams.delete('cliente');
      window.history.replaceState({}, '', url);
      resetarEstado();
    }
  }, [resetarEstado]);

  useEffect(() => {
    loadClientes();
    
    // Cleanup function
    return () => {
      if (window.cleanupTimers) {
        window.cleanupTimers.forEach(timer => clearTimeout(timer));
      }
    };
  }, []);

  // Restaurar cliente da URL ao carregar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteIdFromUrl = urlParams.get('cliente');
    
    // Only try to restore if there's an ID in the URL, clients are loaded, and no client is currently selected in the state
    if (clienteIdFromUrl && clientes.length > 0 && !selectedClientId) {
      const clienteFromUrl = clientes.find(c => c.id === clienteIdFromUrl);
      if (clienteFromUrl) {
        handleClienteSelect(clienteFromUrl);
      }
    }
  }, [clientes, selectedClientId, handleClienteSelect]); // Added handleClienteSelect to dependencies

  useEffect(() => {
    if (clienteSelecionado) {
      loadDadosCliente(clienteSelecionado.id);
    } else {
      resetarEstado();
    }
  }, [clienteSelecionado, resetarEstado]);

  useEffect(() => {
    if (municipioSelecionado === "todos") {
      setImoveisFiltrados(imoveisCliente);
      setQuantidadeProdutos(null);
      setProdutos({});
      setImoveisPorProduto({});
    } else if (municipioSelecionado && clienteSelecionado) {
      const filtrados = imoveisCliente.filter(i => i.municipio === municipioSelecionado);
      setImoveisFiltrados(filtrados);
      
      // Detectar quantos produtos já existem para este município
      const planosDoMunicipio = planosExistentes.filter(plano =>
        plano.cliente_id === clienteSelecionado.id && plano.municipio_lavoura === municipioSelecionado
      );
      const maxProduto = Math.max(0, ...planosDoMunicipio.map(p => p.numero_produto || 0));
      
      if (maxProduto > 0) {
        setQuantidadeProdutos(maxProduto);
        carregarDadosPorMunicipio(clienteSelecionado.id, municipioSelecionado, maxProduto);
      } else {
        setQuantidadeProdutos(null);
        setProdutos({});
        setImoveisPorProduto({});
      }
    } else {
      setImoveisFiltrados([]);
      setQuantidadeProdutos(null);
      setProdutos({});
      setImoveisPorProduto({});
    }
  }, [municipioSelecionado, imoveisCliente, clienteSelecionado, planosExistentes, carregarDadosPorMunicipio]);

  const loadClientes = async () => {
    try {
      setIsLoadingClientes(true);
      const data = await base44.entities.Cliente.list("nome");
      setClientes(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const loadDadosCliente = async (clienteId) => {
    try {
      setIsLoadingData(true);
      const [imoveisData, planosData] = await Promise.all([
        base44.entities.Imovel.filter({ cliente_id: clienteId }),
        base44.entities.PlanoProducao.filter({ cliente_id: clienteId }, "-created_date")
      ]);
      setImoveisCliente(imoveisData);
      setPlanosExistentes(planosData);
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      setImoveisCliente([]);
      setPlanosExistentes([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getMunicipiosDisponiveis = () => {
    const municipios = [...new Set(imoveisCliente.map(i => i.municipio))];
    return municipios.sort();
  };

  const getImoveisComDados = () => {
    return imoveisFiltrados.map(imovel => {
      const temDados = planosExistentes.some(plano =>
        plano.imoveis_ids && plano.imoveis_ids.includes(imovel.id)
      );
      return { ...imovel, temDadosProducao: temDados };
    });
  };

  const handleQuantidadeChange = (novaQuantidade) => {
    setQuantidadeProdutos(novaQuantidade);
    
    if (municipioSelecionado && municipioSelecionado !== "todos" && clienteSelecionado) {
      carregarDadosPorMunicipio(clienteSelecionado.id, municipioSelecionado, novaQuantidade);
    }
  };

  const handleImovelToggle = (numeroProduto, imovelId) => {
    setImoveisPorProduto(prev => {
      const imoveisAtuais = prev[numeroProduto] || [];
      const isSelected = imoveisAtuais.some(item => item.id === imovelId);
      
      if (isSelected) {
        // Remover imóvel da lista
        return {
          ...prev,
          [numeroProduto]: imoveisAtuais.filter(item => item.id !== imovelId)
        };
      } else {
        // Adicionar imóvel com área em branco (SEM preenchimento automático)
        return {
          ...prev,
          [numeroProduto]: [...imoveisAtuais, { id: imovelId, area_utilizada: "" }]
        };
      }
    });
  };

  const handleAreaChange = (numeroProduto, imovelId, area) => {
    // Manter o valor como string para preservar a digitação do usuário
    setImoveisPorProduto(prev => ({
      ...prev,
      [numeroProduto]: (prev[numeroProduto] || []).map(item => 
        item.id === imovelId ? { ...item, area_utilizada: area } : item
      )
    }));
  };

  const salvarProduto = async (dados, numeroSerie) => {
    const imoveisSelecionados = imoveisPorProduto[numeroSerie] || [];

    // As validações são feitas no FormularioProduto antes de chegar aqui
    setIsSaving(true);
    try {
      const idList = imoveisSelecionados.map(i => i.id);
      
      const dadosParaSalvar = {
        ...dados,
        cliente_id: clienteSelecionado.id,
        imoveis_ids: idList,
        imoveis_com_area: imoveisSelecionados.map(item => ({
          id: item.id,
          area_utilizada: parseFloat(item.area_utilizada) || 0
        })),
        numero_produto: numeroSerie,
      };

      const planoExistente = planosExistentes.find(plano =>
        plano.cliente_id === clienteSelecionado.id &&
        plano.municipio_lavoura === municipioSelecionado &&
        plano.numero_produto === numeroSerie
      );

      let planoSalvo;
      if (planoExistente) {
        planoSalvo = await base44.entities.PlanoProducao.update(planoExistente.id, dadosParaSalvar);
        setPlanosExistentes(prev =>
          prev.map(p => p.id === planoExistente.id ? { ...p, ...dadosParaSalvar } : p)
        );
      } else {
        planoSalvo = await base44.entities.PlanoProducao.create(dadosParaSalvar);
        setPlanosExistentes(prev => [...prev, { id: planoSalvo.id, ...dadosParaSalvar }]);
      }

      const dadosCompletos = { ...dadosParaSalvar, id: planoSalvo.id || planoExistente?.id };
      setProdutos(prev => ({
        ...prev,
        [numeroSerie]: dadosCompletos
      }));

      alert(`Produto ${numeroSerie} e localização da lavoura salvos com sucesso!`);

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar os dados. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar produtos dinamicamente
  const renderProdutos = () => {
    if (!quantidadeProdutos) return null;

    const componentes = [];
    
    for (let i = 1; i <= quantidadeProdutos; i++) {
      componentes.push(
        <div key={`produto-${i}`} className="space-y-4">
          <FormularioProduto
            titulo={`PRODUTO ${i}`}
            numeroSerie={i}
            produto={produtos[i]}
            municipioSelecionado={municipioSelecionado}
            onSave={salvarProduto}
            isSaving={isSaving}
            imoveisSelecionados={imoveisPorProduto[i] || []} // Passa os imóveis selecionados para validação no formulário
          />

          <LocalizacaoLavoura
            titulo={`Localização da Lavoura - Produto ${i}`}
            imoveis={getImoveisComDados()}
            imoveisSelecionados={imoveisPorProduto[i] || []}
            onToggleImovel={(imovelId) => handleImovelToggle(i, imovelId)}
            onAreaChange={(imovelId, area) => handleAreaChange(i, imovelId, area)}
          />
        </div>
      );
    }
    
    return componentes;
  };

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div>
          <p className="text-sm text-gray-500">Gerencie os planos de cultivo por cliente e município</p>
        </div>

          <SeletorCliente
            clientes={clientes}
            onSelect={handleClienteSelect} // Changed to new handler
            selectedClientId={selectedClientId} // Added selectedClientId prop
            isLoading={isLoadingClientes}
            showClearButton={true} // Added showClearButton prop
          />

          {clienteSelecionado && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-4">
                  Produção de: <span className="text-green-600">{clienteSelecionado.nome}</span>
                </h2>

                {isLoadingData ? (
                  <div className="flex justify-center items-center p-6">
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                    <p className="ml-3 text-green-600">Carregando dados do cliente...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FiltroMunicipio
                      municipios={getMunicipiosDisponiveis()}
                      onSelect={setMunicipioSelecionado}
                      municipioSelecionado={municipioSelecionado}
                    />

                    {municipioSelecionado && municipioSelecionado !== "todos" && (
                      <div className="space-y-4">
                        <SeletorQuantidadeProdutos
                          quantidadeSelecionada={quantidadeProdutos}
                          onQuantidadeChange={handleQuantidadeChange}
                        />

                        {quantidadeProdutos && (
                          <div className="space-y-4">
                            {renderProdutos()}

                            {/* Botão Gerar PDF */}
                            {Object.keys(produtos).some(key => produtos[key]) && (
                              <div className="flex justify-center pt-4 border-t border-gray-200">
                                <Button
                                  onClick={handlePrint}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Gerar PDF da Produção
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      <div className="hidden print:block">
        <RelatorioProducao
          cliente={clienteSelecionado}
          municipio={municipioSelecionado}
          produtos={produtos}
          imoveisPorProduto={imoveisPorProduto}
          imoveisCliente={imoveisCliente}
        />
      </div>
    </>
  );
}