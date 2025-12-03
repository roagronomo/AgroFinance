import React, { useState, useEffect, useCallback } from "react";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { Parcela } from "@/entities/Parcela";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Plus, Printer } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { normalizeContract } from "../components/lib/formatters";

import ListaProjetos from "../components/projetos/ListaProjetos";
import FiltrosProjetos from "../components/projetos/FiltrosProjetos";
import { getAnexosResumoLote } from "../components/projeto/anexosHelpers"; // New import

export default function TodosProjetos() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState([]);
  const [projetosFiltrados, setProjetosFiltrados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anexosResumo, setAnexosResumo] = useState(new Map()); // New state for attachment summaries
  const [filtros, setFiltros] = useState({
    busca: "",
    status: "todos",
    banco: "todos",
    ano: "todos",
    mes: "todos",
    status_art: "todos", // Novo filtro: status da ART
    contrato: "", // Novo filtro: número de contrato
    safra: "todos", // Novo filtro
    cliente: "todos", // Filtro por cliente
    contratos_selecionados: [] // IDs dos contratos selecionados
  });
  const [contratoDebounced, setContratoDebounced] = useState(""); // New state for debounced contract

  useEffect(() => {
    carregarProjetos();
  }, []);

  // Debounce para o filtro de contrato
  useEffect(() => {
    const timer = setTimeout(() => {
      setContratoDebounced(filtros.contrato);
    }, 200);

    return () => clearTimeout(timer);
  }, [filtros.contrato]);

  const carregarProjetos = async () => {
    setIsLoading(true);
    try {
      const data = await ProjetoFinanciamento.list("-created_date");
      setProjetos(data);
      
      // Pré-carregar anexos em lote
      if (data.length > 0) {
        const projetoIds = data.map(p => p.id);
        const resumos = await getAnexosResumoLote(projetoIds);
        setAnexosResumo(resumos);
      } else {
        setAnexosResumo(new Map()); // Clear summaries if no projects
      }
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
      // Adicionar feedback visual ao usuário em caso de erro ao carregar
    }
    setIsLoading(false);
  };

  const aplicarFiltros = useCallback(() => {
    let resultado = [...projetos];

    // Filtro de busca
    if (filtros.busca) {
      resultado = resultado.filter(p =>
        p.nome_cliente.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        (p.item_financiado && p.item_financiado.toLowerCase().includes(filtros.busca.toLowerCase())) ||
        (p.agencia && p.agencia.toLowerCase().includes(filtros.busca.toLowerCase()))
      );
    }

    // Filtro de status
    if (filtros.status !== "todos") {
      resultado = resultado.filter(p => p.status === filtros.status);
    }

    // Filtro de banco
    if (filtros.banco !== "todos") {
      resultado = resultado.filter(p => p.banco === filtros.banco);
    }

    // Filtro de ano da data de protocolo
    if (filtros.ano !== "todos") {
      resultado = resultado.filter(p =>
        // Ensure data_protocolo exists and is a valid date
        p.data_protocolo && !isNaN(new Date(p.data_protocolo)) &&
        new Date(p.data_protocolo).getFullYear().toString() === filtros.ano
      );
    }

    // Filtro de mês da data de protocolo
    if (filtros.mes !== "todos") {
      resultado = resultado.filter(p =>
        // Ensure data_protocolo exists and is a valid date
        p.data_protocolo && !isNaN(new Date(p.data_protocolo)) &&
        (new Date(p.data_protocolo).getMonth() + 1).toString() === filtros.mes
      );
    }

    // Novo filtro de Status ART
    if (filtros.status_art !== "todos") {
        resultado = resultado.filter(p => p.status_art === filtros.status_art);
    }

    // Filtro de Safra
    if (filtros.safra !== "todos") {
      resultado = resultado.filter(p => p.safra === filtros.safra);
    }

    // Filtro de Contrato (normalizado, só dígitos)
    if (contratoDebounced) {
      const contratoNormalizado = normalizeContract(contratoDebounced);
      
      // Só filtrar se tiver pelo menos 2 dígitos
      if (contratoNormalizado.length >= 2) {
        resultado = resultado.filter(p => {
          if (!p.numero_contrato) return false;
          const contratoProjetoNormalizado = normalizeContract(p.numero_contrato);
          return contratoProjetoNormalizado.includes(contratoNormalizado);
        });
      }
    }

    setProjetosFiltrados(resultado);
  }, [projetos, filtros.busca, filtros.status, filtros.banco, filtros.ano, filtros.mes, filtros.status_art, filtros.safra, contratoDebounced]); // Dependencies for useCallback

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]); // Now depends on the memoized callback

  const handleFiltroChange = (tipo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [tipo]: valor
    }));
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.")) {
      try {
        setIsLoading(true); // Ativar estado de carregamento durante a exclusão

        // Primeiro, buscar e excluir todas as parcelas relacionadas ao projeto
        const parcelasRelacionadas = await Parcela.filter({ projeto_id: projectId });
        for (const parcela of parcelasRelacionadas) {
          await Parcela.delete(parcela.id);
        }

        // Depois excluir o projeto
        await ProjetoFinanciamento.delete(projectId);
        await carregarProjetos(); // Recarregar projetos após a exclusão bem-sucedida
        console.log(`Projeto ${projectId} e suas parcelas excluídos com sucesso.`);
        // Adicionar feedback visual de sucesso (ex: toast notification)
      } catch (error) {
        console.error("Erro ao excluir projeto:", error);
        alert("Erro ao excluir projeto. Por favor, tente novamente.");
        // Adicionar feedback visual de erro (ex: toast notification)
      } finally {
        setIsLoading(false); // Desativar estado de carregamento
      }
    }
  };

  const imprimirRelatorio = () => {
    const projetosOrdenados = [...projetosFiltrados].sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente));
    const bancoNomes = {
      banco_do_brasil: "Banco do Brasil",
      caixa: "Caixa Econômica",
      bradesco: "Bradesco",
      sicoob: "Sicoob",
      sicredi: "Sicredi",
      santander: "Santander",
      outros: "Outros"
    };
    const statusNomes = {
      em_analise: "Em Análise",
      parado: "Parado",
      concluido: "Concluido",
      cancelado: "Cancelado"
    };
    const statusArtNomes = {
      nao_se_aplica: "Não se aplica",
      a_fazer: "A fazer",
      feita: "Feita",
      paga: "Paga"
    };

    const mesesNomes = {
      "1": "Janeiro", "2": "Fevereiro", "3": "Março", "4": "Abril",
      "5": "Maio", "6": "Junho", "7": "Julho", "8": "Agosto",
      "9": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };

    // Calcular totais dos projetos filtrados
    const totalProjetos = projetosOrdenados.length;
    // A variável valorTotal foi removida pois não será mais exibida.

    // Criar descrição dos filtros aplicados
    let filtrosAtivos = [];
    if (filtros.busca) {
      filtrosAtivos.push(`Busca: "${filtros.busca}"`);
    }
    if (filtros.status !== "todos") {
      filtrosAtivos.push(`Status: ${statusNomes[filtros.status] || filtros.status}`);
    }
    if (filtros.banco !== "todos") {
      filtrosAtivos.push(`Banco: ${bancoNomes[filtros.banco] || filtros.banco}`);
    }
    if (filtros.ano !== "todos") {
      filtrosAtivos.push(`Ano: ${filtros.ano}`);
    }
    if (filtros.mes !== "todos") {
      filtrosAtivos.push(`Mês: ${mesesNomes[filtros.mes] || filtros.mes}`);
    }
    if (filtros.status_art !== "todos") {
        filtrosAtivos.push(`Status ART: ${statusArtNomes[filtros.status_art] || filtros.status_art}`);
    }
    if (filtros.safra !== "todos") {
      filtrosAtivos.push(`Safra: ${filtros.safra}`);
    }
    if (filtros.contrato) {
      filtrosAtivos.push(`Nº Contrato: "${filtros.contrato}"`);
    }

    const filtrosTexto = filtrosAtivos.length > 0
      ? `Filtros aplicados: ${filtrosAtivos.join(" | ")}`
      : "Mostrando todos os projetos";

    const conteudo = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="text-align: center; color: #059669; margin-bottom: 10px;">Relatório de Projetos</h1>
        <p style="text-align: center; font-size: 14px; color: #666; margin-bottom: 5px;">
          ${filtrosTexto}
        </p>
        <p style="text-align: center; margin-bottom: 30px; font-weight: bold;">
          ${totalProjetos} projeto(s) encontrado(s)
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cliente</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nº Contrato</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Financiado</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Banco</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Protocolo</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; white-space: nowrap; min-width: 90px;">Valor</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status ART</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Safra</th>
            </tr>
          </thead>
          <tbody>
            ${projetosOrdenados.map(p => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.nome_cliente}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.numero_contrato || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.item_financiado}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${bancoNomes[p.banco] || p.banco}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${p.data_protocolo ? format(new Date(p.data_protocolo), "dd/MM/yyyy") : 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; white-space: nowrap;">R$ ${p.valor_financiado ? p.valor_financiado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${statusNomes[p.status] || p.status}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${statusArtNomes[p.status_art] || p.status_art}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.safra || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 30px; padding: 15px; background-color: #f3f4f6; border: 1px solid #ddd; border-radius: 5px;">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 14px;">
              <p style="margin: 0; margin-bottom: 5px;"><strong>Resumo do Relatório</strong></p>
              <p style="margin: 0; color: #666;">Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>
            <div style="text-align: right; font-size: 16px;">
              <p style="margin: 0; margin-bottom: 5px;"><strong>Total de Projetos:</strong> ${totalProjetos}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(conteudo);
      janela.document.close();
      janela.print();
    } else {
      alert("Seu navegador bloqueou a abertura da janela de impressão. Por favor, desative o bloqueador de pop-ups para este site.");
    }
  };


  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header moderno */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="h-9 w-9 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                Todos os Projetos
              </h1>
              <p className="text-gray-500 text-sm">
                {projetosFiltrados.length} projeto(s) encontrado(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={imprimirRelatorio} 
              variant="outline" 
              className="h-10 px-4 border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Link to={createPageUrl("NovoProjeto")}>
              <Button className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </Link>
          </div>
        </div>

        <FiltrosProjetos
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          projetos={projetos} // Passa todos os projetos para o componente de filtros
        />

        <ListaProjetos
          projetos={projetosFiltrados}
          isLoading={isLoading}
          onUpdate={carregarProjetos}
          onDelete={handleDeleteProject}
          anexosResumo={anexosResumo} // New prop: pass pre-loaded attachment summaries
        />
      </div>
    </div>
  );
}