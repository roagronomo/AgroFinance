import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar, FileSignature, Hash, Wheat, User, FileCheck, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const BANCOS = [
  { value: "banco_do_brasil", label: "Banco do Brasil" },
  { value: "caixa", label: "Caixa Econômica" },
  { value: "bradesco", label: "Bradesco" },
  { value: "sicoob", label: "Sicoob" },
  { value: "sicredi", label: "Sicredi" },
  { value: "santander", label: "Santander" },
  { value: "outros", label: "Outros" }
];

const STATUS_OPTIONS = [
  { value: "em_analise", label: "Em Análise" },
  { value: "parado", label: "Parado" },
  { value: "concluido", label: "Concluido" },
  { value: "cancelado", label: "Cancelado" }
];

const ART_STATUS_OPTIONS = [
  { value: "nao_se_aplica", label: "Não se aplica" },
  { value: "a_fazer", label: "A fazer" },
  { value: "feita", label: "Feita" },
  { value: "paga", label: "Paga" }
];

export default function FiltrosProjetos({ filtros, onFiltroChange, projetos = [] }) {
  const [contratosSelecionados, setContratosSelecionados] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Gerar opções de ano baseadas nos projetos
  const anosDisponiveis = [...new Set(projetos
    .map(p => p.data_protocolo ? new Date(p.data_protocolo).getFullYear() : null)
    .filter(Boolean))]
    .sort((a, b) => b - a);

  const yearOptions = anosDisponiveis.map(ano => ({
    value: ano.toString(),
    label: ano.toString()
  }));

  // Gerar opções de safra únicas dos projetos
  const safrasDisponiveis = [...new Set(projetos
    .map(p => p.safra)
    .filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));

  // Contratos filtrados pela busca (quando há texto de busca)
  const contratosDoCliente = useMemo(() => {
    if (!filtros.busca || filtros.busca.length < 2) return [];
    const buscaLower = filtros.busca.toLowerCase();
    return projetos
      .filter(p => 
        p.nome_cliente?.toLowerCase().includes(buscaLower) && 
        p.numero_contrato
      )
      .map(p => ({
        id: p.id,
        numero_contrato: p.numero_contrato,
        item_financiado: p.item_financiado,
        safra: p.safra,
        nome_cliente: p.nome_cliente
      }));
  }, [projetos, filtros.busca]);

  // Toggle de contrato selecionado
  const toggleContrato = (contratoId) => {
    const novos = contratosSelecionados.includes(contratoId)
      ? contratosSelecionados.filter(id => id !== contratoId)
      : [...contratosSelecionados, contratoId];
    setContratosSelecionados(novos);
    onFiltroChange('contratos_selecionados', novos);
  };

  // Selecionar/Desselecionar todos
  const toggleTodos = () => {
    if (contratosSelecionados.length === contratosDoCliente.length) {
      setContratosSelecionados([]);
      onFiltroChange('contratos_selecionados', []);
    } else {
      const todos = contratosDoCliente.map(c => c.id);
      setContratosSelecionados(todos);
      onFiltroChange('contratos_selecionados', todos);
    }
  };

  // Limpar seleção de contratos
  const limparContratos = () => {
    setContratosSelecionados([]);
    onFiltroChange('contratos_selecionados', []);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
      {/* Busca principal */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por cliente, item ou agência..."
          value={filtros.busca}
          onChange={(e) => onFiltroChange('busca', e.target.value)}
          className="pl-10 h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm"
        />
      </div>

      {/* Filtros com labels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <Select
            value={filtros.status}
            onValueChange={(value) => onFiltroChange('status', value)}
          >
            <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Banco</label>
          <Select
            value={filtros.banco}
            onValueChange={(value) => onFiltroChange('banco', value)}
          >
            <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {BANCOS.map((banco) => (
                <SelectItem key={banco.value} value={banco.value}>
                  {banco.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Ano</label>
          <Select
            value={filtros.ano || "todos"}
            onValueChange={(value) => onFiltroChange('ano', value === "todos" ? "todos" : value)}
          >
            <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Safra</label>
          <Select
            value={filtros.safra || "todos"}
            onValueChange={(value) => onFiltroChange('safra', value === "todos" ? "todos" : value)}
          >
            <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {safrasDisponiveis.map((safra) => (
                <SelectItem key={safra} value={safra}>
                  {safra}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nº Contrato</label>
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <Input
              placeholder="Ex: 21"
              value={filtros.contrato}
              onChange={(e) => {
                const valor = e.target.value.replace(/[^0-9/.\-\s]/g, '');
                onFiltroChange('contrato', valor);
              }}
              inputMode="numeric"
              className="h-9 pl-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">ART</label>
          <Button
            variant={filtros.status_art === "a_fazer" ? "default" : "outline"}
            size="sm"
            onClick={() => onFiltroChange('status_art', filtros.status_art === "a_fazer" ? "todos" : "a_fazer")}
            className={`h-9 w-full rounded-lg text-xs ${
              filtros.status_art === "a_fazer" 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            {filtros.status_art === "a_fazer" ? "A fazer" : "Todos"}
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Assistência</label>
          <Select
            value={filtros.assistencia_tecnica || "todos"}
            onValueChange={(value) => onFiltroChange('assistencia_tecnica', value)}
          >
            <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-xs bg-gray-50/50">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sim">Com Assist.</SelectItem>
              <SelectItem value="nao">Sem Assist.</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seleção de Contratos */}
      {filtros.busca && contratosDoCliente.length > 0 && (
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {/* Seleção de Contratos - só aparece quando há busca por cliente */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg text-xs"
              >
                <FileCheck className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                {contratosSelecionados.length === 0 
                  ? "Selecionar Contratos" 
                  : `${contratosSelecionados.length} contrato(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-gray-700">Contratos encontrados</h4>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={toggleTodos}
                    >
                      {contratosSelecionados.length === contratosDoCliente.length ? "Desmarcar" : "Marcar"} todos
                    </Button>
                    {contratosSelecionados.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-gray-500 hover:text-gray-700"
                        onClick={limparContratos}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {contratosDoCliente.map((contrato) => (
                  <div 
                    key={contrato.id}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      contratosSelecionados.includes(contrato.id) 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => toggleContrato(contrato.id)}
                  >
                    <Checkbox 
                      checked={contratosSelecionados.includes(contrato.id)}
                      className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {contrato.numero_contrato}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {contrato.item_financiado}
                        {contrato.safra && <span className="ml-1">• {contrato.safra}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {contratosSelecionados.length > 0 && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                  <Button 
                    className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-sm"
                    onClick={() => setPopoverOpen(false)}
                  >
                    Aplicar ({contratosSelecionados.length})
                  </Button>
                </div>
              )}
          </PopoverContent>
        </Popover>

        {/* Badge mostrando contratos selecionados */}
        {contratosSelecionados.length > 0 && (
          <div className="flex items-center gap-1">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs px-2 py-1">
              {contratosSelecionados.length} contrato(s) selecionado(s)
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => {
                setContratosSelecionados([]);
                onFiltroChange('contratos_selecionados', []);
              }}
            >
              <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        )}
      </div>
      )}
    </div>
  );
}