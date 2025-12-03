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
    status_art: "todos", // Filtro de status da ART
    contrato: "", // Filtro: número de contrato
    safra: "todos", // Filtro de safra
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

    // Filtro de Contratos Selecionados (tem prioridade se houver seleção)
    if (filtros.contratos_selecionados && filtros.contratos_selecionados.length > 0) {
      resultado = resultado.filter(p => filtros.contratos_selecionados.includes(p.id));
    }

    setProjetosFiltrados(resultado);
  }, [projetos, filtros.busca, filtros.status, filtros.banco, filtros.ano, filtros.mes, filtros.status_art, filtros.safra, filtros.contratos_selecionados, contratoDebounced]); // Dependencies for useCallback

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
      concluido: "Concluído",
      cancelado: "Cancelado"
    };
    const statusArtNomes = {
      nao_se_aplica: "N/A",
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
    const valorTotal = projetosOrdenados
      .filter(p => p.status !== 'cancelado')
      .reduce((sum, p) => sum + (p.valor_financiado || 0), 0);

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
      ? filtrosAtivos.join(" | ")
      : "Mostrando todos os projetos";

    // Paginação: 15 linhas por página (sem páginas em branco desnecessárias)
    const ROWS_PER_PAGE = 15;
    const pages = [];

    if (projetosOrdenados.length === 0) {
      const filler = Array.from({ length: ROWS_PER_PAGE }, () => ({ __blank: true }));
      pages.push(filler);
    } else {
      for (let i = 0; i < projetosOrdenados.length; i += ROWS_PER_PAGE) {
        const pageItems = projetosOrdenados.slice(i, i + ROWS_PER_PAGE);
        // Só adiciona linhas em branco se não for a última página
        const isLastPage = i + ROWS_PER_PAGE >= projetosOrdenados.length;
        if (isLastPage) {
          pages.push(pageItems); // Última página sem preenchimento
        } else {
          const fillCount = ROWS_PER_PAGE - pageItems.length;
          const filler = Array.from({ length: fillCount }, () => ({ __blank: true }));
          pages.push([...pageItems, ...filler]);
        }
      }
    }

    const conteudo = `
      <html>
        <head>
          <title>Relatório de Projetos</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0.8cm;
            }
            body {
              font-family: 'Calibri Light', Calibri, sans-serif;
              font-size: 11pt;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .page {
              position: relative;
              min-height: 100vh;
              page-break-after: always;
              padding-top: 2.5cm;
              padding-bottom: 1.5cm;
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .header-container {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 2cm;
              background-color: white;
              border-bottom: 2px solid #059669;
              padding: 10px 20px;
              box-sizing: border-box;
              z-index: 1000;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              height: 100%;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .header-left img {
              height: 50px;
              width: auto;
            }
            .header-center {
              text-align: center;
              flex-grow: 1;
            }
            .header-center h1 {
              font-size: 16pt;
              margin: 0 0 5px 0;
              color: #059669;
              font-weight: bold;
            }
            .header-center p {
              font-size: 10pt;
              margin: 0;
              color: #666;
            }
            .header-right {
              text-align: right;
              min-width: 150px;
            }
            .header-right p {
              margin: 0;
              font-size: 11pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 5px 6px;
              text-align: left;
              line-height: 1.1;
            }
            thead th {
              background-color: #e6f4ea;
              font-weight: bold;
              color: #065f46;
              font-size: 10pt;
              text-align: center;
            }
            tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tbody tr:nth-child(odd) {
              background-color: white;
            }
            tbody tr.blank-row td {
              background-color: white;
              border-color: #ddd;
              height: 24px;
            }
            .col-num {
              width: 30px;
              text-align: center;
            }
            .col-cliente {
              width: 90px;
            }
            .col-contrato {
              width: 110px;
            }
            .col-item {
              width: 120px;
            }
            .col-banco {
              width: 100px;
            }
            .col-protocolo {
              width: 75px;
              text-align: center;
            }
            .col-valor {
              width: 95px;
              text-align: right;
            }
            .col-status {
              width: 70px;
              text-align: center;
            }
            .col-art {
              width: 55px;
              text-align: center;
            }
            .col-safra {
              width: 70px;
              text-align: center;
            }
            .status-concluido {
              color: #15803d;
              font-weight: bold;
            }
            .status-em_analise {
              color: #ca8a04;
              font-weight: bold;
            }
            .status-parado {
              color: #dc2626;
              font-weight: bold;
            }
            .status-cancelado {
              color: #6b7280;
              font-weight: bold;
            }
            .art-a_fazer {
              color: #ca8a04;
              font-weight: bold;
            }
            .art-feita {
              color: #2563eb;
              font-weight: bold;
            }
            .art-paga {
              color: #15803d;
              font-weight: bold;
            }

            .footer-container {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 1.2cm;
              background-color: white;
              border-top: 1px solid #e5e7eb;
              padding: 5px 20px;
              font-size: 9pt;
              color: #666;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer-total {
              font-size: 9pt;
              color: #065f46;
              font-weight: 500;
            }

            @media print {
              .page {
                page-break-after: always;
              }
              .page:last-child {
                page-break-after: auto;
              }
              table {
                page-break-inside: avoid;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="header-content">
              <div class="header-left">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c43a9d96ab992732fde594/c21e63e22_LogoSemente2.png" alt="Logo">
                <div>
                  <p style="font-weight: bold; font-size: 12pt; margin: 0; color: #059669;">Cerrado Consultoria</p>
                  <p style="font-size: 10pt; margin: 0; color: #666;">Financiamentos Agrícolas</p>
                </div>
              </div>
              <div class="header-center">
                <h1>Relatório de Projetos</h1>
                <p>${filtrosTexto}</p>
              </div>
              <div class="header-right">
                <p style="font-weight: bold; color: #059669;">Total de Projetos:</p>
                <p style="font-size: 14pt; font-weight: bold; color: #059669;">${totalProjetos}</p>
              </div>
            </div>
          </div>

          ${pages.map((page, pageIndex) => {
            const startIndex = pageIndex * ROWS_PER_PAGE;

            return `
              <div class="page">
                <table>
                  <thead>
                    <tr>
                      <th class="col-num">#</th>
                      <th class="col-cliente">Cliente</th>
                      <th class="col-contrato">Nº Contrato</th>
                      <th class="col-item">Item Financiado</th>
                      <th class="col-banco">Banco</th>
                      <th class="col-protocolo">Protocolo</th>
                      <th class="col-valor">Valor</th>
                      <th class="col-status">Status</th>
                      <th class="col-art">ART</th>
                      <th class="col-safra">Safra</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${page.map((item, idx) => {
                      if (item.__blank) {
                        return `
                          <tr class="blank-row">
                            <td class="col-num"></td>
                            <td class="col-cliente"></td>
                            <td class="col-contrato"></td>
                            <td class="col-item"></td>
                            <td class="col-banco"></td>
                            <td class="col-protocolo"></td>
                            <td class="col-valor"></td>
                            <td class="col-status"></td>
                            <td class="col-art"></td>
                            <td class="col-safra"></td>
                          </tr>
                        `;
                      }

                      const p = item;
                      const statusClass = 'status-' + (p.status || '');
                      const artClass = 'art-' + (p.status_art || '');
                      return `
                        <tr>
                          <td class="col-num">${startIndex + idx + 1}</td>
                          <td class="col-cliente">${p.nome_cliente?.split(' ')[0] || ''}</td>
                          <td class="col-contrato">${p.numero_contrato || 'N/A'}</td>
                          <td class="col-item">${p.item_financiado || 'N/A'}</td>
                          <td class="col-banco">${bancoNomes[p.banco] || p.banco || 'N/A'}</td>
                          <td class="col-protocolo">${p.data_protocolo ? format(new Date(p.data_protocolo), "dd/MM/yyyy") : 'N/A'}</td>
                          <td class="col-valor">R$ ${p.valor_financiado ? p.valor_financiado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                          <td class="col-status ${statusClass}">${statusNomes[p.status] || p.status || 'N/A'}</td>
                          <td class="col-art ${artClass}">${statusArtNomes[p.status_art] || 'N/A'}</td>
                          <td class="col-safra">${p.safra || 'N/A'}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <div class="footer-container">
            <span>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</span>
            <span class="footer-total">Total Geral: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Cerrado Consultoria - Financiamentos Agrícolas</span>
          </div>
        </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(conteudo);
      janela.document.close();
      janela.document.title = `Relatorio_Projetos_${format(new Date(), 'dd-MM-yyyy')}`;
      setTimeout(() => {
        janela.print();
      }, 500);
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