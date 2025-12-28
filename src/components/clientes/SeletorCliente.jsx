import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SeletorCliente({ 
  clientes, 
  onSelect, 
  isLoading, 
  selectedClientId = null,
  showClearButton = true 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Função para calcular score de relevância
  const calcularRelevancia = (cliente, termo) => {
    const nome = (cliente.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cpf = (cliente.cpf || '').replace(/\D/g, '');
    const termoCpf = termo.replace(/\D/g, '');
    
    // Se busca por CPF
    if (termoCpf && cpf.includes(termoCpf)) {
      const posicao = cpf.indexOf(termoCpf);
      return 1000 - posicao; // CPF tem prioridade alta
    }
    
    // Se busca por nome
    const termoNome = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const posicao = nome.indexOf(termoNome);
    
    if (posicao === -1) return 0; // Não encontrou
    
    // Quanto mais no início do nome, maior o score
    // Nome começa com o termo = score máximo
    if (posicao === 0) {
      return 10000 - termoNome.length; // Correspondência exata no início
    }
    
    // Termo aparece depois no nome = score menor
    return 5000 - posicao;
  };

  // Usar useMemo para garantir que o filtro seja recalculado IMEDIATAMENTE
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) {
      return clientes;
    }

    const termo = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Filtrar clientes que correspondem à busca
    const correspondentes = clientes.filter(cliente => {
      const nome = (cliente.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cpf = (cliente.cpf || '').replace(/\D/g, '');
      const termoCpf = searchTerm.replace(/\D/g, '');
      
      return nome.includes(termo) || cpf.includes(termoCpf);
    });
    
    // Ordenar por relevância - matches mais relevantes no topo
    return correspondentes.sort((a, b) => {
      const scoreA = calcularRelevancia(a, searchTerm);
      const scoreB = calcularRelevancia(b, searchTerm);
      return scoreB - scoreA; // Ordem decrescente de relevância
    });
  }, [searchTerm, clientes]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Encontrar cliente selecionado
  const selectedCliente = selectedClientId ? clientes.find(c => c.id === selectedClientId) : null;

  const handleClienteClick = (cliente) => {
    onSelect(cliente);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-green-200 bg-white/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <User className="w-5 h-5" />
          Selecione o Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cliente Selecionado */}
        {selectedCliente && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">{selectedCliente.nome}</p>
                <p className="text-sm text-green-700">CPF/CNPJ: {selectedCliente.cpf}</p>
              </div>
              {showClearButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Campo de Busca */}
        {!selectedCliente && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Digite o nome ou CPF do cliente..."
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                className="pl-10 border-green-200 focus:border-green-500 h-12"
                autoComplete="off"
              />
            </div>

            {/* Dropdown de Resultados */}
            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute z-50 w-full mt-2 bg-white border border-green-200 rounded-lg shadow-xl max-h-96 overflow-y-auto"
              >
                {filteredClientes.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                    </p>
                    {searchTerm && (
                      <p className="text-sm text-gray-400 mt-2">
                        Tente buscar por outro nome ou CPF
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                      <p className="text-sm text-gray-600 flex items-center justify-between">
                        <span>
                          {filteredClientes.length === clientes.length 
                            ? `${clientes.length} cliente(s) cadastrado(s)` 
                            : `${filteredClientes.length} de ${clientes.length} resultado(s)`
                          }
                        </span>
                        {searchTerm && (
                          <Badge variant="outline" className="border-green-300 text-green-700">
                            🔍 "{searchTerm}"
                          </Badge>
                        )}
                      </p>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {filteredClientes.map((cliente) => (
                        <div
                          key={cliente.id}
                          onClick={() => handleClienteClick(cliente)}
                          className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{cliente.nome}</p>
                              <p className="text-sm text-gray-600">CPF/CNPJ: {cliente.cpf}</p>
                              {cliente.cidade && cliente.uf && (
                                <p className="text-xs text-gray-500 mt-1">
                                  📍 {cliente.cidade}/{cliente.uf}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center text-green-600">
                              <span className="text-sm font-medium">Selecionar</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instruções */}
        {!selectedCliente && (
          <p className="text-xs text-gray-500 mt-3 flex items-start gap-2">
            <Search className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              A busca ordena por relevância. Resultados que começam com o termo digitado aparecem primeiro.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}