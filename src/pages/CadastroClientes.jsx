import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X } from "lucide-react";
import FormularioCliente from "../components/clientes/FormularioCliente";
import ListaClientes from "../components/clientes/ListaClientes";
import { Badge } from "@/components/ui/badge";

export default function CadastroClientes() {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);

  const sortClientesAlphabetically = (clientesData) => {
    return [...clientesData].sort((a, b) => {
      const nomeA = (a.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nomeB = (b.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (nomeA < nomeB) return -1;
      if (nomeA > nomeB) return 1;
      
      const cpfA = (a.cpf || '').replace(/\D/g, '');
      const cpfB = (b.cpf || '').replace(/\D/g, '');
      return cpfA.localeCompare(cpfB);
    });
  };

  const calcularRelevancia = (cliente, termo) => {
    const nome = (cliente.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cpf = (cliente.cpf || '').replace(/\D/g, '');
    const cidade = (cliente.cidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const email = (cliente.email || '').toLowerCase();
    
    const termoCpf = termo.replace(/\D/g, '');
    const termoNormalizado = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (termoCpf && cpf.includes(termoCpf)) {
      const posicao = cpf.indexOf(termoCpf);
      if (posicao === 0) return 100000;
      return 50000 - posicao;
    }
    
    if (nome.startsWith(termoNormalizado)) {
      return 10000 - termoNormalizado.length;
    }
    
    const posicaoNome = nome.indexOf(termoNormalizado);
    if (posicaoNome !== -1) {
      return 5000 - posicaoNome;
    }
    
    if (cidade.startsWith(termoNormalizado)) {
      return 1000;
    }
    
    if (cidade.includes(termoNormalizado)) {
      return 500;
    }
    
    if (email.includes(termoNormalizado)) {
      return 100;
    }
    
    return 0;
  };

  const clientesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) {
      return clientes;
    }

    const termo = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const correspondentes = clientes.filter(cliente => {
      const nome = (cliente.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cpf = (cliente.cpf || '').replace(/\D/g, '');
      const termoCpf = searchTerm.replace(/\D/g, '');
      const cidade = (cliente.cidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const email = (cliente.email || '').toLowerCase();
      
      return nome.includes(termo) || 
             cpf.includes(termoCpf) || 
             cidade.includes(termo) ||
             email.includes(termo);
    });
    
    return correspondentes.sort((a, b) => {
      const scoreA = calcularRelevancia(a, searchTerm);
      const scoreB = calcularRelevancia(b, searchTerm);
      return scoreB - scoreA;
    });
  }, [searchTerm, clientes]);

  const safeDOMCleanup = () => {
    try {
      if (window.safeDOMCleanup && typeof window.safeDOMCleanup === 'function') {
        window.safeDOMCleanup();
      }
    } catch (error) {
      console.warn('Erro durante cleanup:', error);
    }
  };

  useEffect(() => {
    loadClientes();
    
    return () => {
      safeDOMCleanup();
    };
  }, []);

  const loadClientes = async () => {
    try {
      const data = await base44.entities.Cliente.list("-created_date");
      const sortedData = sortClientesAlphabetically(data || []);
      setClientes(sortedData);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
    }
  };

  const handleSubmit = async (clienteData) => {
    try {
      if (editingCliente) {
        await base44.entities.Cliente.update(editingCliente.id, clienteData);
      } else {
        await base44.entities.Cliente.create(clienteData);
      }
      
      setShowForm(false);
      setEditingCliente(null);
      await loadClientes();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente. Tente novamente.");
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDelete = async (cliente) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
      return;
    }

    try {
      await base44.entities.Cliente.delete(cliente.id);
      await loadClientes();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Erro ao excluir cliente. Verifique se não há imóveis cadastrados para este cliente.");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCliente(null);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <FormularioCliente
          cliente={editingCliente}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Gerencie seus clientes e produtores</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-sm h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Cliente
        </Button>
      </div>

      {/* Barra de Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, CPF, cidade ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-200 focus:border-green-500 focus:ring-green-500"
            autoComplete="off"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contador de Resultados */}
      {(searchTerm || clientesFiltrados.length !== clientes.length) && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {clientesFiltrados.length === clientes.length 
              ? `${clientes.length} cliente(s)` 
              : `${clientesFiltrados.length} de ${clientes.length}`
            }
          </Badge>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs font-normal">
              Busca: "{searchTerm}"
            </Badge>
          )}
        </div>
      )}

      {/* Lista de Clientes */}
      <ListaClientes
        clientes={clientesFiltrados}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Empty State */}
      {searchTerm && clientesFiltrados.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Nenhum cliente encontrado
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Tente buscar por outro termo
          </p>
          <Button
            onClick={handleClearSearch}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Limpar Busca
          </Button>
        </div>
      )}
    </div>
  );
}