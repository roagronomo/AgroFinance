import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  DollarSign,
  FileText,
  Filter,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  FileSpreadsheet
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  paga: {
    label: "Paga",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  },
  em_atraso: {
    label: "Em Atraso",
    icon: AlertCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500"
  }
};

const bancoNomes = {
  banco_do_brasil: "Banco do Brasil",
  caixa: "Caixa Econômica",
  bradesco: "Banco Bradesco",
  sicoob: "Banco Sicoob",
  sicredi: "Sicredi",
  santander: "Banco Santander",
  banco_nordeste: "Banco do Nordeste",
  outros: "Outros"
};

export default function Vencimentos() {
  const navigate = useNavigate();
  const [parcelas, setParcelas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [parcelasFiltradas, setParcelasFiltradas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: "",
    ano: new Date().getFullYear().toString(),
    mes: "todos",
    status: "todos",
    contrato: "",
    banco: "todos",
    clientesSelecionados: [],
    tipoRelatorio: "detalhado"
  });
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [linhasPorPagina, setLinhasPorPagina] = useState(15);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [parcelasData, projetosData] = await Promise.all([
        base44.entities.Parcela.list("-data_vencimento"),
        base44.entities.ProjetoFinanciamento.list()
      ]);

      const hoje = startOfDay(new Date());
      const parcelasAtualizadas = parcelasData.map(parcela => {
        if (parcela.status === 'pendente' && isBefore(new Date(parcela.data_vencimento), hoje)) {
          return { ...parcela, status: 'em_atraso' };
        }
        return parcela;
      });

      setParcelas(parcelasAtualizadas);
      setProjetos(projetosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const aplicarFiltros = useCallback(() => {
    let resultado = [...parcelas];

    // No relatório geral, ignorar filtro de ano e mês
    if (filtros.tipoRelatorio === "detalhado") {
      if (filtros.ano !== "todos") {
        resultado = resultado.filter(p =>
          new Date(p.data_vencimento).getFullYear().toString() === filtros.ano
        );
      }

      if (filtros.mes !== "todos") {
        resultado = resultado.filter(p =>
          (new Date(p.data_vencimento).getMonth() + 1).toString() === filtros.mes
        );
      }
    }

    if (filtros.status !== "todos") {
      if (filtros.status === "pendente") {
        resultado = resultado.filter(p => p.status === 'pendente' || p.status === 'em_atraso');
      } else {
        resultado = resultado.filter(p => p.status === filtros.status);
      }
    }

    if (filtros.clientesSelecionados.length > 0) {
      const projetosFiltrados = projetos.filter(proj =>
        filtros.clientesSelecionados.includes(proj.nome_cliente)
      );
      const projetosIds = projetosFiltrados.map(p => p.id);
      resultado = resultado.filter(p => projetosIds.includes(p.projeto_id));
    }

    if (filtros.banco !== "todos") {
      const projetosFiltrados = projetos.filter(proj => proj.banco === filtros.banco);
      const projetosIds = projetosFiltrados.map(p => p.id);
      resultado = resultado.filter(p => projetosIds.includes(p.projeto_id));
    }

    if (filtros.contrato) {
      const contratoLimpo = filtros.contrato.replace(/\D/g, '').toLowerCase();
      const projetosComContrato = projetos.filter(p => 
        p.numero_contrato && p.numero_contrato.replace(/\D/g, '').toLowerCase().includes(contratoLimpo)
      );
      const projetosIdsComContrato = projetosComContrato.map(p => p.id);
      resultado = resultado.filter(p => projetosIdsComContrato.includes(p.projeto_id));
    }

    setParcelasFiltradas(resultado);
  }, [parcelas, projetos, filtros]);

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  const handleFiltroChange = (tipo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [tipo]: valor
    }));
  };

  const marcarComoPaga = async (parcelaId) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      await base44.entities.Parcela.update(parcelaId, {
        status: "paga",
        data_pagamento: hoje
      });
      carregarDados();
    } catch (error) {
      console.error("Erro ao atualizar parcela:", error);
    }
  };

  const exportarParaExcel = () => {
    const parcelasComCliente = parcelasFiltradas.filter(parcela => {
      const projeto = projetos.find(p => p.id === parcela.projeto_id);
      return projeto && projeto.nome_cliente && projeto.nome_cliente.trim() !== '';
    });

    const parcelasOrdenadas = [...parcelasComCliente].sort((a, b) =>
      new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
    );

    const valorTotal = parcelasComCliente.reduce((acc, p) => acc + p.valor_parcela, 0);
    const hoje = new Date();

    const periodo = filtros.ano !== 'todos' ? filtros.ano : 'Todos os anos';
    const mesNome = filtros.mes !== 'todos' ? getMonthName(filtros.mes) : 'Todos os meses';

    // BOM UTF-8 para acentos
    let csvContent = '\uFEFF';

    // CABEÇALHO EXATAMENTE IGUAL AO PDF
    csvContent += ';;;CERRADO CONSULTORIA\n';
    csvContent += ';;;Financiamentos Agrícolas\n';
    csvContent += '\n';
    csvContent += ';;;RELATÓRIO DE VENCIMENTOS\n';
    csvContent += `;;;Período: ${periodo}${filtros.mes !== 'todos' ? ` - ${mesNome}` : ''}\n`;
    csvContent += '\n';

    // CABEÇALHO DA TABELA
    csvContent += '#;Cliente;Projeto;Contrato;Parcela;Vencimento;Valor;Status\n';

    // DADOS COM VALOR EM FORMATO DE MOEDA
    parcelasOrdenadas.forEach((parcela, index) => {
      const projeto = projetos.find(p => p.id === parcela.projeto_id);

      // Formatar valor COM o símbolo R$
      const valorFormatado = 'R$ ' + parcela.valor_parcela.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const linha = [
        index + 1,
        `"${projeto.nome_cliente}"`,
        `"${projeto.item_financiado || 'N/A'}"`,
        projeto.numero_contrato || 'N/A',
        parcela.numero_parcela,
        format(new Date(parcela.data_vencimento), "dd/MM/yyyy", { locale: ptBR }),
        valorFormatado,
        statusConfig[parcela.status]?.label || parcela.status
      ];
      csvContent += linha.join(';') + '\n';
    });

    // TOTAL COM FORMATO DE MOEDA
    csvContent += '\n';
    csvContent += `;;;;;TOTAL GERAL;R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    csvContent += '\n';
    csvContent += ';;;Cerrado Consultoria - Financiamentos Agrícolas\n';
    csvContent += `;;;Relatório gerado em ${format(hoje, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const nomeArquivo = `Relatorio_Vencimentos_${format(hoje, 'dd-MM-yyyy')}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getMonthName = (month) => {
    const months = [
      '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[parseInt(month)];
  };

  const salvarPDF = () => {
    const tipoRelatorio = filtros.tipoRelatorio;
    
    if (tipoRelatorio === "geral") {
      // PDF do Relatório Geral - Agrupado por Contrato
      const grupos = agruparPorContrato();
      const valorTotal = grupos.reduce((sum, g) => sum + g.saldoDevedor, 0);
      const totalContratos = grupos.length;

      // Paginação para Relatório Geral
      const ROWS_PER_PAGE = linhasPorPagina;
      const pages = [];

      for (let i = 0; i < grupos.length; i += ROWS_PER_PAGE) {
        const pageItems = grupos.slice(i, i + ROWS_PER_PAGE);
        const isLastPage = (i + ROWS_PER_PAGE) >= grupos.length;
        
        if (!isLastPage) {
          const fillCount = ROWS_PER_PAGE - pageItems.length;
          const filler = Array.from({ length: fillCount }, () => ({ __blank: true }));
          pages.push([...pageItems, ...filler]);
        } else {
          pages.push(pageItems);
        }
      }
      
      if (pages.length === 0 && grupos.length === 0) {
        const filler = Array.from({ length: ROWS_PER_PAGE }, () => ({ __blank: true }));
        pages.push(filler);
      }

      // Filtrar páginas que só tem conteúdo em branco
      const pagesComConteudo = pages.filter(page => page.some(item => !item.__blank));

      const conteudo = `
        <html>
          <head>
            <title>Relatório de Vencimentos - Geral</title>
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
              padding-top: 2.5cm;
              padding-bottom: 1.5cm;
              box-sizing: border-box;
            }
            .page:not(:last-child) {
              page-break-after: always;
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
              font-size: 11pt;
              margin: 0;
              color: #333;
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
              padding: 5px 8px;
              text-align: left;
              line-height: 1.1;
            }
            thead th {
              background-color: #e6f4ea;
              font-weight: bold;
              color: #065f46;
              font-size: 11pt;
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
              width: 35px;
              text-align: center;
            }
            .col-cliente {
              width: 112px;
            }
            .col-banco {
              width: 130px;
              text-align: left;
            }
            .col-projeto {
              width: 144px;
            }
            .col-contrato {
              width: 110px;
            }
            .col-parcela {
              width: 55px;
              text-align: center;
            }
            .col-vencimento {
              width: 85px;
              text-align: center;
            }
            .col-valor {
              width: 100px;
              text-align: left;
            }
            thead .col-valor {
              text-align: center;
            }
            .col-status {
              width: 80px;
              text-align: center;
            }
            .status-paga {
              color: #15803d;
              font-weight: bold;
            }
            .status-pendente {
              color: #ca8a04;
              font-weight: bold;
            }
            .status-em_atraso {
              color: #dc2626;
              font-weight: bold;
            }

            .total-row {
              border-top: 3px double #059669 !important;
              background-color: #f3f4f6 !important;
              font-weight: bold;
              font-size: 12pt;
            }
            .total-row td {
              padding: 12px 8px;
              border: 1px solid #ddd;
              border-top: 3px double #059669 !important;
            }
            .total-label {
              text-align: right;
              color: #059669;
              padding-right: 20px;
            }
            .total-value {
              text-align: right;
              color: #065f46;
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
              .total-row {
                page-break-before: avoid;
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
                <h1>Relatório Geral de Contratos</h1>
                <p>Todos os Contratos e Saldos Devedores</p>
              </div>
              <div class="header-right">
                <p style="font-weight: bold; color: #059669;">Total de Contratos:</p>
                <p style="font-size: 14pt; font-weight: bold; color: #059669;">${totalContratos}</p>
              </div>
            </div>
          </div>

          ${pagesComConteudo.map((page, pageIndex) => {
            const startIndex = pageIndex * ROWS_PER_PAGE;

            return `
              <div class="page">
                <table>
                  <thead>
                    <tr>
                      <th class="col-num">#</th>
                      <th class="col-cliente">Cliente</th>
                      <th class="col-banco">Banco</th>
                      <th class="col-projeto">Projeto</th>
                      <th class="col-contrato">Contrato</th>
                      <th class="col-vencimento">Último Vencimento</th>
                      <th class="col-valor">Saldo Devedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${page.map((item, idx) => {
                      if (item.__blank) {
                        return `
                          <tr class="blank-row">
                            <td class="col-num"></td>
                            <td class="col-cliente"></td>
                            <td class="col-banco"></td>
                            <td class="col-projeto"></td>
                            <td class="col-contrato"></td>
                            <td class="col-vencimento"></td>
                            <td class="col-valor"></td>
                          </tr>
                        `;
                      }

                      const grupo = item;
                      return `
                        <tr>
                          <td class="col-num">${startIndex + idx + 1}</td>
                          <td class="col-cliente">${grupo.cliente?.split(' ')[0] || ''}</td>
                          <td class="col-banco">${bancoNomes[grupo.banco] || grupo.banco || 'N/A'}</td>
                          <td class="col-projeto">${grupo.itemFinanciado || 'N/A'}</td>
                          <td class="col-contrato">${grupo.numeroContrato || 'N/A'}</td>
                          <td class="col-vencimento">${format(grupo.ultimoVencimento, "dd/MM/yyyy", { locale: ptBR })}</td>
                          <td class="col-valor">R$ ${grupo.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <div class="footer-container">
            <span>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span class="footer-total">Saldo Devedor Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Cerrado Consultoria - Financiamentos Agrícolas</span>
          </div>
        </body>
      </html>
      `;

      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(conteudo);
        janela.document.close();
        janela.document.title = `Relatorio_Geral_Contratos_${format(new Date(), 'dd-MM-yyyy')}`;
        setTimeout(() => {
          janela.print();
        }, 500);
      } else {
        alert("Seu navegador bloqueou a abertura da janela de impressão. Por favor, desative o bloqueador de pop-ups para este site.");
      }
    } else {
      // PDF do Relatório Detalhado - Todas as parcelas
      const parcelasComCliente = parcelasFiltradas.filter(parcela => {
        const projeto = projetos.find(p => p.id === parcela.projeto_id);
        return projeto && projeto.nome_cliente && projeto.nome_cliente.trim() !== '';
      });

      const parcelasOrdenadas = [...parcelasComCliente].sort((a, b) =>
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );

      const totalParcelas = parcelasComCliente.length;
      const valorTotal = parcelasComCliente.reduce((sum, p) => sum + p.valor_parcela, 0);
      const periodo = filtros.ano !== 'todos' ? filtros.ano : 'Todos os anos';

      const ROWS_PER_PAGE = linhasPorPagina;
      const pages = [];

      for (let i = 0; i < parcelasOrdenadas.length; i += ROWS_PER_PAGE) {
        const pageItems = parcelasOrdenadas.slice(i, i + ROWS_PER_PAGE);
        const isLastPage = (i + ROWS_PER_PAGE) >= parcelasOrdenadas.length;
        
        if (!isLastPage) {
          const fillCount = ROWS_PER_PAGE - pageItems.length;
          const filler = Array.from({ length: fillCount }, () => ({ __blank: true }));
          pages.push([...pageItems, ...filler]);
        } else {
          pages.push(pageItems);
        }
      }
      
      if (pages.length === 0 && parcelasOrdenadas.length === 0) {
        const filler = Array.from({ length: ROWS_PER_PAGE }, () => ({ __blank: true }));
        pages.push(filler);
      }

      // Filtrar páginas que só tem conteúdo em branco
      const pagesComConteudo = pages.filter(page => page.some(item => !item.__blank));

      const conteudo = `
        <html>
          <head>
            <title>Relatório de Vencimentos</title>
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
                padding-top: 2.5cm;
                padding-bottom: 1.5cm;
                box-sizing: border-box;
              }
              .page:not(:last-child) {
                page-break-after: always;
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
                font-size: 11pt;
                margin: 0;
                color: #333;
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
                padding: 5px 8px;
                text-align: left;
                line-height: 1.1;
              }
              thead th {
                background-color: #e6f4ea;
                font-weight: bold;
                color: #065f46;
                font-size: 11pt;
                text-align: center !important;
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
                width: 35px;
                text-align: center;
              }
              .col-cliente {
                width: 64px;
              }
              .col-banco {
                width: 130px;
                text-align: left;
              }
              .col-projeto {
                width: 144px;
              }
              .col-contrato {
                width: 110px;
              }
              .col-parcela {
                width: 55px;
                text-align: center;
              }
              .col-vencimento {
                width: 85px;
                text-align: center;
              }
              .col-valor {
                width: 117px;
                text-align: left;
              }
              thead .col-valor {
                text-align: center;
              }
              .col-status {
                width: 80px;
                text-align: center;
              }
              .status-paga {
                color: #15803d;
                font-weight: bold;
              }
              .status-pendente {
                color: #ca8a04;
                font-weight: bold;
              }
              .status-em_atraso {
                color: #dc2626;
                font-weight: bold;
              }

              .total-row {
                border-top: 3px double #059669 !important;
                background-color: #f3f4f6 !important;
                font-weight: bold;
                font-size: 12pt;
              }
              .total-row td {
                padding: 12px 8px;
                border: 1px solid #ddd;
                border-top: 3px double #059669 !important;
              }
              .total-label {
                text-align: right;
                color: #059669;
                padding-right: 20px;
              }
              .total-value {
                text-align: right;
                color: #065f46;
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
                .total-row {
                  page-break-before: avoid;
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
                  <h1>Relatório de Vencimentos</h1>
                  <p>Período: ${periodo} ${filtros.mes !== 'todos' ? ` - ${getMonthName(filtros.mes)}` : ''}</p>
                </div>
                <div class="header-right">
                  <p style="font-weight: bold; color: #059669;">Total de Parcelas:</p>
                  <p style="font-size: 14pt; font-weight: bold; color: #059669;">${totalParcelas}</p>
                </div>
              </div>
            </div>

            ${pagesComConteudo.map((page, pageIndex) => {
              const startIndex = pageIndex * ROWS_PER_PAGE;

              return `
                <div class="page">
                  <table>
                    <thead>
                      <tr>
                        <th class="col-num">#</th>
                        <th class="col-cliente">Cliente</th>
                        <th class="col-banco">Banco</th>
                        <th class="col-projeto">Projeto</th>
                        <th class="col-contrato">Contrato</th>
                        <th class="col-parcela">Parcela</th>
                        <th class="col-vencimento">Vencimento</th>
                        <th class="col-valor">Valor</th>
                        <th class="col-status">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${page.map((item, idx) => {
                        if (item.__blank) {
                          return `
                            <tr class="blank-row">
                              <td class="col-num"></td>
                              <td class="col-cliente"></td>
                              <td class="col-banco"></td>
                              <td class="col-projeto"></td>
                              <td class="col-contrato"></td>
                              <td class="col-parcela"></td>
                              <td class="col-vencimento"></td>
                              <td class="col-valor"></td>
                              <td class="col-status"></td>
                            </tr>
                          `;
                        }

                        const parcela = item;
                        const projeto = projetos.find(p => p.id === parcela.projeto_id);
                        return `
                          <tr>
                            <td class="col-num">${startIndex + idx + 1}</td>
                            <td class="col-cliente">${projeto?.nome_cliente?.split(' ')[0] || ''}</td>
                            <td class="col-banco">${bancoNomes[projeto?.banco] || projeto?.banco || 'N/A'}</td>
                            <td class="col-projeto">${projeto?.item_financiado || 'N/A'}</td>
                            <td class="col-contrato">${projeto?.numero_contrato || 'N/A'}</td>
                            <td class="col-parcela">${parcela.numero_parcela}</td>
                            <td class="col-vencimento">${format(new Date(parcela.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</td>
                            <td class="col-valor">R$ ${parcela.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigints: 2 })}</td>
                            <td class="col-status status-${parcela.status}">${statusConfig[parcela.status]?.label || parcela.status}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}

            <div class="footer-container">
              <span>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
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
        janela.document.title = `Relatorio_Vencimentos_${format(new Date(), 'dd-MM-yyyy')}`;
        setTimeout(() => {
          janela.print();
        }, 500);
      } else {
        alert("Seu navegador bloqueou a abertura da janela de impressão. Por favor, desative o bloqueador de pop-ups para este site.");
      }
    }
  };

  const anos = [...new Set(parcelas.map(p => new Date(p.data_vencimento).getFullYear()))].sort();
  const clientesDisponiveis = [...new Set(projetos.map(p => p.nome_cliente))].filter(Boolean).sort();
  const bancosDisponiveis = [...new Set(projetos.map(p => p.banco))].filter(Boolean);

  const toggleCliente = (cliente) => {
    setFiltros(prev => ({
      ...prev,
      clientesSelecionados: prev.clientesSelecionados.includes(cliente)
        ? prev.clientesSelecionados.filter(c => c !== cliente)
        : [...prev.clientesSelecionados, cliente]
    }));
  };

  const agruparPorContrato = () => {
    const grupos = {};
    
    // No relatório geral, aplicar todos os filtros EXCETO ano e mês
    let parcelasParaAgrupar = [...parcelas];
    
    // Aplicar filtros de status
    if (filtros.status !== "todos") {
      if (filtros.status === "pendente") {
        parcelasParaAgrupar = parcelasParaAgrupar.filter(p => p.status === 'pendente' || p.status === 'em_atraso');
      } else {
        parcelasParaAgrupar = parcelasParaAgrupar.filter(p => p.status === filtros.status);
      }
    }

    // Aplicar filtros de clientes
    if (filtros.clientesSelecionados.length > 0) {
      const projetosFiltrados = projetos.filter(proj =>
        filtros.clientesSelecionados.includes(proj.nome_cliente)
      );
      const projetosIds = projetosFiltrados.map(p => p.id);
      parcelasParaAgrupar = parcelasParaAgrupar.filter(p => projetosIds.includes(p.projeto_id));
    }

    // Aplicar filtros de banco
    if (filtros.banco !== "todos") {
      const projetosFiltrados = projetos.filter(proj => proj.banco === filtros.banco);
      const projetosIds = projetosFiltrados.map(p => p.id);
      parcelasParaAgrupar = parcelasParaAgrupar.filter(p => projetosIds.includes(p.projeto_id));
    }

    // Aplicar filtros de contrato
    if (filtros.contrato) {
      const contratoLimpo = filtros.contrato.replace(/\D/g, '').toLowerCase();
      const projetosComContrato = projetos.filter(p => 
        p.numero_contrato && p.numero_contrato.replace(/\D/g, '').toLowerCase().includes(contratoLimpo)
      );
      const projetosIdsComContrato = projetosComContrato.map(p => p.id);
      parcelasParaAgrupar = parcelasParaAgrupar.filter(p => projetosIdsComContrato.includes(p.projeto_id));
    }
    
    parcelasParaAgrupar.forEach(parcela => {
      const projeto = projetos.find(p => p.id === parcela.projeto_id);
      if (!projeto) return;
      
      const contratoKey = `${projeto.id}_${projeto.numero_contrato}`;
      
      if (!grupos[contratoKey]) {
        grupos[contratoKey] = {
          cliente: projeto.nome_cliente,
          banco: projeto.banco,
          itemFinanciado: projeto.item_financiado,
          numeroContrato: projeto.numero_contrato,
          parcelas: [],
          saldoDevedor: 0,
          ultimoVencimento: null
        };
      }
      
      grupos[contratoKey].parcelas.push(parcela);
      grupos[contratoKey].saldoDevedor += parcela.valor_parcela;
      
      const dataVencimento = new Date(parcela.data_vencimento);
      if (!grupos[contratoKey].ultimoVencimento || dataVencimento > grupos[contratoKey].ultimoVencimento) {
        grupos[contratoKey].ultimoVencimento = dataVencimento;
      }
    });
    
    return Object.values(grupos);
  };

  const relatorioPorContrato = filtros.tipoRelatorio === "geral" ? agruparPorContrato() : [];

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
                Controle de Vencimentos
              </h1>
              <p className="text-gray-500 text-sm">
                {parcelasFiltradas.length} parcela(s) encontrada(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={exportarParaExcel}
              variant="outline"
              className="h-10 px-4 border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              onClick={salvarPDF}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Salvar PDF
            </Button>
            <Select
              value={linhasPorPagina.toString()}
              onValueChange={(value) => setLinhasPorPagina(parseInt(value))}
            >
              <SelectTrigger className="h-9 w-16 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="16">16</SelectItem>
                <SelectItem value="17">17</SelectItem>
                <SelectItem value="18">18</SelectItem>
                <SelectItem value="19">19</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros modernos */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Ano</label>
                <Select
                  value={filtros.ano}
                  onValueChange={(value) => handleFiltroChange('ano', value)}
                >
                  <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {anos.map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Mês</label>
                <Select
                  value={filtros.mes}
                  onValueChange={(value) => handleFiltroChange('mes', value)}
                >
                  <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Status</label>
                <Select
                  value={filtros.status}
                  onValueChange={(value) => handleFiltroChange('status', value)}
                >
                  <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente / Atraso</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Banco</label>
                <Select
                  value={filtros.banco}
                  onValueChange={(value) => handleFiltroChange('banco', value)}
                >
                  <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {bancosDisponiveis.map(banco => (
                      <SelectItem key={banco} value={banco}>
                        {bancoNomes[banco] || banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Tipo de Relatório</label>
                <Select
                  value={filtros.tipoRelatorio}
                  onValueChange={(value) => handleFiltroChange('tipoRelatorio', value)}
                >
                  <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detalhado">Detalhado</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Nº Contrato</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Ex: 21"
                    value={filtros.contrato}
                    onChange={(e) => handleFiltroChange('contrato', e.target.value)}
                    className="pl-9 h-9 border-gray-200 focus:border-emerald-500 rounded-lg text-sm bg-gray-50/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarClientes(!mostrarClientes)}
                className="h-9 text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                {mostrarClientes ? 'Ocultar Clientes' : 'Selecionar Clientes'}
                {filtros.clientesSelecionados.length > 0 && (
                  <Badge className="ml-2 bg-emerald-600 text-white">
                    {filtros.clientesSelecionados.length}
                  </Badge>
                )}
              </Button>

              {mostrarClientes && (
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {clientesDisponiveis.map(cliente => (
                      <Badge
                        key={cliente}
                        onClick={() => toggleCliente(cliente)}
                        className={`cursor-pointer transition-all ${
                          filtros.clientesSelecionados.includes(cliente)
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cliente}
                      </Badge>
                    ))}
                  </div>
                  {filtros.clientesSelecionados.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFiltroChange('clientesSelecionados', [])}
                      className="mt-2 h-7 text-xs text-gray-500"
                    >
                      Limpar seleção
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-500 text-sm">Carregando vencimentos...</span>
                </div>
              </div>
          ) : parcelasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                Nenhum vencimento encontrado
              </h3>
              <p className="text-gray-400 text-sm">
                Ajuste os filtros para ver parcelas
              </p>
            </div>
          ) : filtros.tipoRelatorio === "geral" ? (
            // RELATÓRIO GERAL - Agrupado por Contrato
            relatorioPorContrato.map((grupo, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-16 rounded-full flex-shrink-0 bg-emerald-500" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-800">
                            {grupo.cliente}
                          </h3>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Contrato:</span> {grupo.numeroContrato || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Projeto:</span> {grupo.itemFinanciado || 'N/A'}
                          </p>
                          {grupo.banco && (
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">Banco:</span> {bancoNomes[grupo.banco] || grupo.banco}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Último venc: {format(grupo.ultimoVencimento, "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Saldo Devedor:</span>
                          <span className="text-emerald-700 font-bold text-base">
                            R$ {grupo.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // RELATÓRIO DETALHADO - Todas as parcelas
            parcelasFiltradas.map((parcela) => {
              const projeto = projetos.find(p => p.id === parcela.projeto_id);
              const StatusIcon = statusConfig[parcela.status]?.icon || Clock;
              const statusStyle = statusConfig[parcela.status] || statusConfig.pendente;

              return (
                <div 
                  key={parcela.id} 
                  className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      {/* Indicador lateral */}
                      <div className={`w-1 h-16 rounded-full flex-shrink-0 ${statusStyle.dot}`} />

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-800 truncate">
                              {projeto?.nome_cliente || 'Cliente não encontrado'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">Projeto:</span> {projeto?.item_financiado || 'N/A'}
                              {projeto?.numero_contrato && (
                                <span className="text-gray-400 ml-1">(Contrato: {projeto.numero_contrato})</span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant="outline"
                              className={`${statusStyle.className} text-xs px-2.5 py-1 font-medium border`}
                            >
                              <StatusIcon className="w-3 h-3 mr-1.5" />
                              {statusStyle.label}
                            </Badge>
                            {parcela.status !== 'paga' && (
                              <Button
                                onClick={() => marcarComoPaga(parcela.id)}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Marcar como Paga
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Info grid */}
                        <div className="flex items-center gap-6 text-sm mt-3">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Parcela {parcela.numero_parcela}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(parcela.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-700 font-semibold">
                              R$ {parcela.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {parcela.data_pagamento && (
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pago em {format(new Date(parcela.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}