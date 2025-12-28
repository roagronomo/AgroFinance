import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Cliente } from "@/entities/Cliente";
import { Imovel } from "@/entities/Imovel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, MapPin, TrendingUp, Users } from "lucide-react";
import FormularioCadastro from "../components/imoveis/FormularioCadastro";
import ListaImoveis from "../components/imoveis/ListaImoveis";
import SeletorCliente from "../components/clientes/SeletorCliente";
import { useAreaFormatter } from "../components/hooks/useAreaFormatter";

export default function CadastroImoveis() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [imoveis, setImoveis] = useState([]);
  const [todosImoveis, setTodosImoveis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingImovel, setEditingImovel] = useState(null);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isLoadingImoveis, setIsLoadingImoveis] = useState(false);

  useAreaFormatter();

  const resetarEstado = useCallback(() => {
    setImoveis([]);
    setShowForm(false);
    setEditingImovel(null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadDadosIniciais = async () => {
      try {
        setIsLoadingClientes(true);
        const [clientesData, imoveisData] = await Promise.all([
          Cliente.list("nome"),
          Imovel.list("-created_date", 500)
        ]);
        if (isMounted) {
          setClientes(clientesData || []);
          setTodosImoveis(imoveisData || []);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        if (isMounted) {
          setClientes([]);
          setTodosImoveis([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingClientes(false);
        }
      }
    };

    loadDadosIniciais();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (clienteSelecionado) {
      const loadImoveisSafe = async (clienteId) => {
        try {
          setIsLoadingImoveis(true);
          const data = await Imovel.filter({ cliente_id: clienteId }, "-created_date");
          if (isMounted) {
            setImoveis(data || []);
          }
        } catch (error) {
          console.error("Erro ao carregar imóveis:", error);
          if (isMounted) {
            setImoveis([]);
          }
        } finally {
          if (isMounted) {
            setIsLoadingImoveis(false);
          }
        }
      };
      
      loadImoveisSafe(clienteSelecionado.id);
    } else {
      setImoveis([]);
      resetarEstado();
    }
    
    return () => {
      isMounted = false;
    };
  }, [clienteSelecionado, resetarEstado]);

  const handleClienteSelect = useCallback((cliente) => {
    setClienteSelecionado(cliente);
    setSelectedClientId(cliente?.id || null);
    
    const url = new URL(window.location.href);
    if (cliente) {
      url.searchParams.set('cliente', cliente.id);
    } else {
      url.searchParams.delete('cliente');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteIdFromUrl = urlParams.get('cliente');
    
    if (clienteIdFromUrl && clientes.length > 0 && !selectedClientId) {
      const clienteFromUrl = clientes.find(c => c.id === clienteIdFromUrl);
      if (clienteFromUrl) {
        handleClienteSelect(clienteFromUrl);
      }
    }
  }, [clientes, selectedClientId, handleClienteSelect]);

  const handleSubmit = async (imovelData) => {
    try {
      const dataToSave = { ...imovelData, cliente_id: clienteSelecionado.id };
      if (editingImovel) {
        await Imovel.update(editingImovel.id, dataToSave);
      } else {
        await Imovel.create(dataToSave);
      }
      setShowForm(false);
      setEditingImovel(null);
      
      const data = await Imovel.filter({ cliente_id: clienteSelecionado.id }, "-created_date");
      setImoveis(data || []);
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      alert("Erro ao salvar imóvel. Tente novamente.");
    }
  };

  const handleEdit = (imovel) => {
    try {
      setEditingImovel(imovel);
      setShowForm(true);
    } catch (error) {
      console.error("Erro ao editar:", error);
    }
  };

  const handleDelete = async (imovel) => {
    try {
      await Imovel.delete(imovel.id);
      const data = await Imovel.filter({ cliente_id: clienteSelecionado.id }, "-created_date");
      setImoveis(data || []);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
      alert("Erro ao excluir imóvel. Verifique se não há planos de produção vinculados a este imóvel.");
    }
  };

  const handleCancel = () => {
    try {
      setShowForm(false);
      setEditingImovel(null);
    } catch (error) {
      console.error("Erro ao cancelar:", error);
    }
  };

  const estatisticas = React.useMemo(() => {
    if (!imoveis.length) return { total: 0, areaTotal: 0, areaAgricultavel: 0 };
    return {
      total: imoveis.length,
      areaTotal: imoveis.reduce((acc, im) => acc + (parseFloat(im.area_total) || 0), 0),
      areaAgricultavel: imoveis.reduce((acc, im) => acc + (parseFloat(im.area_agricultavel) || 0), 0)
    };
  }, [imoveis]);

  const clientesComImoveis = useMemo(() => {
    if (!todosImoveis.length || !clientes.length) return [];
    
    const resumo = {};
    todosImoveis.forEach(imovel => {
      const clienteId = imovel.cliente_id;
      if (!clienteId || clienteId === "sistema_analise_certidao") return;
      
      if (!resumo[clienteId]) {
        resumo[clienteId] = { total: 0, municipios: {} };
      }
      resumo[clienteId].total++;
      
      const municipio = imovel.municipio || "Sem município";
      resumo[clienteId].municipios[municipio] = (resumo[clienteId].municipios[municipio] || 0) + 1;
    });

    return clientes
      .filter(c => resumo[c.id])
      .map(c => ({
        ...c,
        qtdImoveis: resumo[c.id].total,
        municipios: resumo[c.id].municipios
      }))
      .sort((a, b) => b.qtdImoveis - a.qtdImoveis);
  }, [todosImoveis, clientes]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">Gerencie as propriedades rurais dos seus clientes</p>
      </div>

      {/* Seletor de Cliente */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <SeletorCliente
            clientes={clientes}
            onSelect={handleClienteSelect}
            selectedClientId={selectedClientId}
            isLoading={isLoadingClientes}
            showClearButton={true}
          />
        </CardContent>
      </Card>

      {/* Resumo de clientes com imóveis */}
      {!clienteSelecionado && clientesComImoveis.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5" />
            <span>Clientes com imóveis cadastrados</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {clientesComImoveis.map(cliente => (
              <div
                key={cliente.id}
                onClick={() => handleClienteSelect(cliente)}
                className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-green-300 rounded-lg p-3 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-gray-900 text-sm truncate">{cliente.nome}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {cliente.qtdImoveis}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(cliente.municipios).slice(0, 3).map(([mun, qtd]) => (
                    <span key={mun} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {mun}: {qtd}
                    </span>
                  ))}
                  {Object.keys(cliente.municipios).length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{Object.keys(cliente.municipios).length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clienteSelecionado && (
        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">{estatisticas.total}</span>
              <span>imóveis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {estatisticas.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha
              </span>
              <span>total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-600">
                {estatisticas.areaAgricultavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha
              </span>
              <span>agricultável</span>
            </div>
          </div>

          {/* Header da lista */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Imóveis de <span className="text-green-600">{clienteSelecionado.nome}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {estatisticas.total === 0 
                  ? "Nenhum imóvel cadastrado ainda" 
                  : `${estatisticas.total} ${estatisticas.total === 1 ? 'imóvel cadastrado' : 'imóveis cadastrados'}`
                }
              </p>
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-sm h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Imóvel
            </Button>
          </div>

          {/* Conteúdo principal */}
          {showForm ? (
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <FormularioCadastro
                  imovel={editingImovel}
                  clienteSelecionado={clienteSelecionado}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </CardContent>
            </Card>
          ) : (
            <ListaImoveis
              imoveis={imoveis}
              clienteSelecionado={clienteSelecionado}
              isLoading={isLoadingImoveis}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}
