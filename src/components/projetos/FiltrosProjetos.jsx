import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar, FileSignature, Hash, Wheat } from "lucide-react";

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

      {/* Filtros em linha */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filtros.status}
          onValueChange={(value) => onFiltroChange('status', value)}
        >
          <SelectTrigger className="h-9 min-w-[140px] border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.banco}
          onValueChange={(value) => onFiltroChange('banco', value)}
        >
          <SelectTrigger className="h-9 min-w-[140px] border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="Banco" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Bancos</SelectItem>
            {BANCOS.map((banco) => (
              <SelectItem key={banco.value} value={banco.value}>
                {banco.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={filtros.status_art}
          onValueChange={(value) => onFiltroChange('status_art', value)}
        >
          <SelectTrigger className="h-9 min-w-[150px] border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="Status ART" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status ART</SelectItem>
            {ART_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={filtros.ano || "todos"}
          onValueChange={(value) => onFiltroChange('ano', value === "todos" ? "todos" : value)}
        >
          <SelectTrigger className="h-9 min-w-[130px] border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="Ano" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Anos</SelectItem>
            {yearOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.safra || "todos"}
          onValueChange={(value) => onFiltroChange('safra', value === "todos" ? "todos" : value)}
        >
          <SelectTrigger className="h-9 min-w-[140px] border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <Wheat className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue placeholder="Safra" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Safras</SelectItem>
            {safrasDisponiveis.map((safra) => (
              <SelectItem key={safra} value={safra}>
                {safra}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px]">
          <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
          <Input
            placeholder="Contrato (ex.: 21)"
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
    </div>
  );
}