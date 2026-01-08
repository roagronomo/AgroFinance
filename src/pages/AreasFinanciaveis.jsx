import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SeletorCliente from "../components/clientes/SeletorCliente";
import { FileDown, MapPin, Building2, TrendingUp, AlertTriangle, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function AreasFinanciaveis() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [imoveis, setImoveis] = useState([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isLoadingImoveis, setIsLoadingImoveis] = useState(false);
  const [municipioFiltro, setMunicipioFiltro] = useState("todos");
  const [mostrarSomenteFinanciaveis, setMostrarSomenteFinanciaveis] = useState(false);
  const [safraFiltro, setSafraFiltro] = useState("todas");
  const [culturaFiltro, setCulturaFiltro] = useState("todas");
  const [linhaExpandida, setLinhaExpandida] = useState(null);

  // Carregar clientes
  useEffect(() => {
    const loadClientes = async () => {
      try {
        setIsLoadingClientes(true);
        const data = await base44.entities.Cliente.list("nome");
        setClientes(data || []);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        setClientes([]);
      } finally {
        setIsLoadingClientes(false);
      }
    };
    loadClientes();
  }, []);

  // Carregar imóveis do cliente selecionado (apenas financiáveis)
  useEffect(() => {
    if (clienteSelecionado) {
      const loadImoveis = async () => {
        try {
          setIsLoadingImoveis(true);
          const data = await base44.entities.Imovel.filter(
            { 
              cliente_id: clienteSelecionado.id,
              financiavel_banco: "sim"
            },
            "municipio"
          );
          setImoveis(data || []);
        } catch (error) {
          console.error("Erro ao carregar imóveis:", error);
          setImoveis([]);
        } finally {
          setIsLoadingImoveis(false);
        }
      };
      loadImoveis();
    } else {
      setImoveis([]);
    }
  }, [clienteSelecionado]);

  const handleClienteSelect = (cliente) => {
    setClienteSelecionado(cliente);
    setSelectedClientId(cliente?.id || null);
    setMunicipioFiltro("todos");
  };

  // Calcular área financiável (excluindo pastagens)
  const calcularAreaFinanciavel = (imovel) => {
    const tipo = imovel.tipo_propriedade || "proprio";
    
    // Descontar área de pastagens da área agricultável
    const areaAgricultavel = parseFloat(imovel.area_agricultavel) || 0;
    const areaPastagens = parseFloat(imovel.area_pastagens) || 0;
    const areaFinanciavelReal = Math.max(0, areaAgricultavel - areaPastagens);
    
    if (tipo === "terceiros") {
      const areaCedida = parseFloat(imovel.area_cedida) || 0;
      // Aplicar a mesma proporção de desconto de pastagens na área cedida
      const proporcaoPastagens = areaAgricultavel > 0 ? areaPastagens / areaAgricultavel : 0;
      return Math.max(0, areaCedida * (1 - proporcaoPastagens));
    } else if (tipo === "proprio_condominio") {
      // Se for condomínio, usar área cedida se houver, senão usar agricultável (ambos descontando pastagens)
      const areaCedida = parseFloat(imovel.area_cedida) || 0;
      if (areaCedida > 0) {
        const proporcaoPastagens = areaAgricultavel > 0 ? areaPastagens / areaAgricultavel : 0;
        return Math.max(0, areaCedida * (1 - proporcaoPastagens));
      }
      return areaFinanciavelReal;
    } else {
      // Próprio
      return areaFinanciavelReal;
    }
  };

  // Calcular área financiada (com filtros de safra e cultura)
  const calcularAreaFinanciada = (imovel) => {
    if (!imovel.financiamentos || imovel.financiamentos.length === 0) return 0;
    
    let financiamentosFiltrados = imovel.financiamentos;
    
    if (safraFiltro !== "todas") {
      financiamentosFiltrados = financiamentosFiltrados.filter(f => f.safra === safraFiltro);
    }
    
    if (culturaFiltro !== "todas") {
      financiamentosFiltrados = financiamentosFiltrados.filter(f => f.cultura_financiada === culturaFiltro);
    }
    
    return financiamentosFiltrados.reduce((sum, f) => sum + (parseFloat(f.area_financiada) || 0), 0);
  };

  // Processar imóveis com dados calculados
  const imoveisProcessados = useMemo(() => {
    return imoveis.map(imovel => {
      const areaFinanciavel = calcularAreaFinanciavel(imovel);
      const areaFinanciada = calcularAreaFinanciada(imovel);
      const saldoFinanciar = Math.max(0, areaFinanciavel - areaFinanciada);
      const temExcesso = areaFinanciada > areaFinanciavel;
      
      return {
        ...imovel,
        areaFinanciavel,
        areaFinanciada,
        saldoFinanciar,
        temExcesso,
        temPendencia: 
          (imovel.tipo_propriedade === "terceiros" || imovel.tipo_propriedade === "proprio_condominio") && 
          !imovel.data_vencimento_contrato
      };
    });
  }, [imoveis, safraFiltro, culturaFiltro]);

  // Filtrar imóveis
  const imoveisFiltrados = useMemo(() => {
    let resultado = imoveisProcessados;
    
    if (municipioFiltro !== "todos") {
      resultado = resultado.filter(im => im.municipio === municipioFiltro);
    }
    
    if (mostrarSomenteFinanciaveis) {
      resultado = resultado.filter(im => im.saldoFinanciar > 0);
    }
    
    return resultado;
  }, [imoveisProcessados, municipioFiltro, mostrarSomenteFinanciaveis]);

  // Obter lista de municípios únicos
  const municipios = useMemo(() => {
    const unicos = [...new Set(imoveis.map(im => im.municipio).filter(Boolean))];
    return unicos.sort();
  }, [imoveis]);

  // Obter lista de safras únicas
  const safras = useMemo(() => {
    const safrasSet = new Set();
    imoveis.forEach(imovel => {
      if (imovel.financiamentos) {
        imovel.financiamentos.forEach(f => {
          if (f.safra) safrasSet.add(f.safra);
        });
      }
    });
    return Array.from(safrasSet).sort().reverse();
  }, [imoveis]);

  // Obter lista de culturas únicas
  const culturas = useMemo(() => {
    const culturasSet = new Set();
    imoveis.forEach(imovel => {
      if (imovel.financiamentos) {
        imovel.financiamentos.forEach(f => {
          if (f.cultura_financiada) culturasSet.add(f.cultura_financiada);
        });
      }
    });
    return Array.from(culturasSet).sort();
  }, [imoveis]);

  // Resumo por município
  const resumoPorMunicipio = useMemo(() => {
    const resumo = {};
    
    imoveisFiltrados.forEach(imovel => {
      const mun = imovel.municipio || "Sem município";
      if (!resumo[mun]) {
        resumo[mun] = {
          municipio: mun,
          quantidade: 0,
          areaFinanciavel: 0,
          areaFinanciada: 0,
          saldo: 0
        };
      }
      resumo[mun].quantidade++;
      resumo[mun].areaFinanciavel += imovel.areaFinanciavel;
      resumo[mun].areaFinanciada += imovel.areaFinanciada;
      resumo[mun].saldo += imovel.saldoFinanciar;
    });
    
    return Object.values(resumo).sort((a, b) => 
      a.municipio.localeCompare(b.municipio)
    );
  }, [imoveisFiltrados]);

  // Formatar área
  const formatArea = (area) => {
    const num = parseFloat(area) || 0;
    return num.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const [day, month, year] = dateStr.split('/');
      if (day && month && year) {
        return dateStr;
      }
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Formatar matrícula
  const formatarMatricula = (valor) => {
    if (!valor) return "—";
    const numbers = String(valor).replace(/\D/g, '');
    if (!numbers) return "—";
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Obter label de status
  const getStatusLabel = (tipo) => {
    if (tipo === "proprio_condominio") return "Próprio em condomínio";
    if (tipo === "terceiros") return "Terceiros";
    return "Próprio";
  };

  // Obter cor do badge
  const getStatusBadge = (tipo) => {
    if (tipo === "proprio_condominio") {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (tipo === "terceiros") {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }
    return "bg-green-100 text-green-800 border-gray-200";
  };

  // Exportar PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("Relatório de Áreas Financiáveis", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("Relatório considera apenas imóveis marcados como financiáveis pelo banco.", pageWidth / 2, 27, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${clienteSelecionado?.nome || ""}`, 14, 36);
    if (clienteSelecionado?.cpf) {
      doc.text(`CPF/CNPJ: ${clienteSelecionado.cpf}`, 14, 42);
    }
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 48);
    
    // Tabela de imóveis - Desenhada manualmente
    let currentY = 56;
    const colWidths = [26, 40, 18, 24, 22, 22, 19, 21];
    const headers = ['Município', 'Imóvel', 'Matrícula', 'Venc. Contrato', 'Área Financ.', 'Financiada', 'Saldo', 'Status'];
    let startX = 10;
    
    // Cabeçalho da tabela
    doc.setFillColor(34, 139, 34);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 6, 'F');
    let xPos = startX;
    headers.forEach((header, i) => {
      doc.text(header, xPos + colWidths[i] / 2, currentY + 4, { align: 'center' });
      xPos += colWidths[i];
    });
    currentY += 6;
    
    // Dados da tabela
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    imoveisFiltrados.forEach((imovel, idx) => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      
      const rowData = [
        imovel.municipio || "—",
        imovel.nome_imovel || "—",
        formatarMatricula(imovel.matricula_numero),
        (imovel.tipo_propriedade === "terceiros" || imovel.tipo_propriedade === "proprio_condominio") 
          ? formatDate(imovel.data_vencimento_contrato) 
          : "—",
        formatArea(imovel.areaFinanciavel) + " ha",
        formatArea(imovel.areaFinanciada) + " ha",
        formatArea(imovel.saldoFinanciar) + " ha",
        getStatusLabel(imovel.tipo_propriedade)
      ];
      
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 5, 'F');
      }
      
      doc.setDrawColor(220, 220, 220);
      xPos = startX;
      rowData.forEach((data, i) => {
        const align = (i === 2 || i === 3) ? 'center' : 'left';
        const textX = align === 'center' ? xPos + colWidths[i] / 2 : xPos + 1;
        doc.text(String(data).substring(0, 25), textX, currentY + 3.5, { align });
        doc.rect(xPos, currentY, colWidths[i], 5, 'S');
        xPos += colWidths[i];
      });
      currentY += 5;
    });
    
    // Histórico de Financiamentos
    let finalY = currentY + 10;
    const imoveisComFinanciamentos = imoveisFiltrados.filter(im => 
      im.financiamentos && im.financiamentos.length > 0
    );
    
    if (imoveisComFinanciamentos.length > 0) {
      if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("Histórico de Financiamentos", 14, finalY);
      
      imoveisComFinanciamentos.forEach(imovel => {
        const financiamentosFiltrados = (imovel.financiamentos || []).filter(f => {
          const safraMatch = safraFiltro === "todas" || f.safra === safraFiltro;
          const culturaMatch = culturaFiltro === "todas" || f.cultura_financiada === culturaFiltro;
          return safraMatch && culturaMatch;
        });
        
        if (financiamentosFiltrados.length > 0) {
          finalY += 7;
          if (finalY > pageHeight - 30) {
            doc.addPage();
            finalY = 20;
          }
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text(`${imovel.nome_imovel} (Matrícula: ${formatarMatricula(imovel.matricula_numero)}):`, 14, finalY);
          
          finalY += 4;
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          
          financiamentosFiltrados.forEach(f => {
            if (finalY > pageHeight - 20) {
              doc.addPage();
              finalY = 20;
            }
            doc.text(`  • ${f.safra || "—"} - ${f.cultura_financiada || "—"}: ${formatArea(f.area_financiada)} ha`, 20, finalY);
            finalY += 4;
          });
          
          finalY += 2;
        }
      });
      
      finalY += 5;
    }
    
    // Resumo por município
    if (finalY > pageHeight - 40) {
      doc.addPage();
      finalY = 20;
    }
    
    finalY += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo por Município", 14, finalY);
    finalY += 7;
    
    const resumoColWidths = [50, 25, 35, 35, 35];
    const resumoHeaders = ['Município', 'Nº Imóveis', 'Financiável', 'Financiada', 'Saldo'];
    startX = 14;
    
    // Cabeçalho resumo
    doc.setFillColor(34, 139, 34);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.rect(startX, finalY, resumoColWidths.reduce((a, b) => a + b, 0), 7, 'F');
    xPos = startX;
    resumoHeaders.forEach((header, i) => {
      doc.text(header, xPos + resumoColWidths[i] / 2, finalY + 4.5, { align: 'center' });
      xPos += resumoColWidths[i];
    });
    finalY += 7;
    
    // Dados resumo
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    resumoPorMunicipio.forEach((res, idx) => {
      if (finalY > pageHeight - 20) {
        doc.addPage();
        finalY = 20;
      }
      
      const rowData = [
        res.municipio,
        res.quantidade.toString(),
        formatArea(res.areaFinanciavel) + " ha",
        formatArea(res.areaFinanciada) + " ha",
        formatArea(res.saldo) + " ha"
      ];
      
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(startX, finalY, resumoColWidths.reduce((a, b) => a + b, 0), 6, 'F');
      }
      
      doc.setDrawColor(220, 220, 220);
      xPos = startX;
      rowData.forEach((data, i) => {
        const textX = xPos + resumoColWidths[i] / 2;
        doc.text(String(data), textX, finalY + 4, { align: 'center' });
        doc.rect(xPos, finalY, resumoColWidths[i], 6, 'S');
        xPos += resumoColWidths[i];
      });
      finalY += 6;
    });
    
    // Alertas (se houver)
    const pendencias = imoveisFiltrados.filter(im => im.temPendencia || im.temExcesso);
    if (pendencias.length > 0) {
      finalY += 10;
      if (finalY > pageHeight - 30) {
        doc.addPage();
        finalY = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("⚠️ Alertas", 14, finalY);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      finalY += 7;
      pendencias.forEach((imovel) => {
        if (finalY > pageHeight - 15) {
          doc.addPage();
          finalY = 20;
        }
        
        if (imovel.temPendencia) {
          doc.text(`• ${imovel.nome_imovel}: Contrato sem vencimento informado`, 14, finalY);
          finalY += 5;
        }
        if (imovel.temExcesso) {
          doc.text(`• ${imovel.nome_imovel}: Financiamento acima da área financiável`, 14, finalY);
          finalY += 5;
        }
      });
    }
    
    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        'Gerado pelo sistema Cerrado Consultoria – Gestão de Propriedades Rurais',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }
    
    doc.save(`${clienteSelecionado?.nome || 'relatorio'} - Áreas Financiáveis.pdf`);
  };

  // Navegar para imóvel
  const irParaImovel = (imovel) => {
    navigate(createPageUrl("CadastroImoveis") + `?cliente=${imovel.cliente_id}`);
  };

  return (
    <div className="space-y-4">
      <div className=" space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent">
            Áreas Financiáveis
          </h1>
          <p className="text-gray-500 mt-1">
            Visualize e consolide as áreas aptas a financiamento por cliente e município
          </p>
        </div>

        {/* Seletor de Cliente */}
        <Card className="border-0  bg-white/80 backdrop-blur-sm">
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

        {clienteSelecionado && (
          <>
            {/* Filtros */}
            <Card className="border-0 shadow-sm bg-white/70">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <Select value={municipioFiltro} onValueChange={setMunicipioFiltro}>
                      <SelectTrigger className="w-48 h-9 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os municípios</SelectItem>
                        {municipios.map(mun => (
                          <SelectItem key={mun} value={mun}>{mun}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={safraFiltro} onValueChange={setSafraFiltro}>
                    <SelectTrigger className="w-40 h-9 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as safras</SelectItem>
                      {safras.map(safra => (
                        <SelectItem key={safra} value={safra}>{safra}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={culturaFiltro} onValueChange={setCulturaFiltro}>
                    <SelectTrigger className="w-48 h-9 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as culturas</SelectItem>
                      {culturas.map(cultura => (
                        <SelectItem key={cultura} value={cultura}>{cultura}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mostrarSomenteFinanciaveis}
                      onChange={(e) => setMostrarSomenteFinanciaveis(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Apenas com saldo &gt; 0
                    </span>
                  </label>

                  <div className="ml-auto">
                    <Button
                      onClick={exportarPDF}
                      disabled={imoveisFiltrados.length === 0}
                      className="bg-green-600 hover:bg-green-700 h-9"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo rápido */}
            {imoveisProcessados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-white/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total de Imóveis</p>
                        <p className="text-base font-semibold text-gray-900">{imoveisFiltrados.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Área Financiável</p>
                        <p className="text-base font-semibold text-green-600">
                          {formatArea(imoveisFiltrados.reduce((sum, im) => sum + im.areaFinanciavel, 0))} ha
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Área Financiada</p>
                        <p className="text-base font-semibold text-orange-600">
                          {formatArea(imoveisFiltrados.reduce((sum, im) => sum + im.areaFinanciada, 0))} ha
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Saldo a Financiar</p>
                        <p className="text-base font-semibold text-purple-600">
                          {formatArea(imoveisFiltrados.reduce((sum, im) => sum + im.saldoFinanciar, 0))} ha
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabela principal */}
            {isLoadingImoveis ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center text-gray-500">
                  Carregando imóveis...
                </CardContent>
              </Card>
            ) : imoveisFiltrados.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center text-gray-500">
                  <Building2 className="w-12 h-9 mx-auto mb-3 text-gray-300" />
                  <p>
                    {imoveis.length === 0 
                      ? "Este cliente não possui imóveis marcados como financiáveis pelo banco."
                      : "Nenhum imóvel encontrado com os filtros aplicados"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-3 text-left font-medium text-gray-700 w-8"></th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Município</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Imóvel</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Matrícula</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Venc. Contrato</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Área Financ. (ha)</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Financiada (ha)</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Saldo (ha)</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {imoveisFiltrados.map((imovel) => {
                        const financiamentosFiltrados = (imovel.financiamentos || []).filter(f => {
                          const safraMatch = safraFiltro === "todas" || f.safra === safraFiltro;
                          const culturaMatch = culturaFiltro === "todas" || f.cultura_financiada === culturaFiltro;
                          return safraMatch && culturaMatch;
                        });
                        const temFinanciamentos = financiamentosFiltrados.length > 0;
                        const expandido = linhaExpandida === imovel.id;

                        return (
                          <React.Fragment key={imovel.id}>
                            <tr
                              className={`hover:bg-gray-50 transition-colors ${
                                imovel.temPendencia ? 'bg-orange-50/30' : ''
                              } ${imovel.temExcesso ? 'bg-red-50/30' : ''}`}
                            >
                              <td className="px-2 py-3">
                                {temFinanciamentos && (
                                  <button
                                    onClick={() => setLinhaExpandida(expandido ? null : imovel.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {expandido ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-900">{imovel.municipio || "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{imovel.nome_imovel}</span>
                                  {imovel.temPendencia && (
                                    <AlertTriangle className="w-4 h-4 text-orange-500" title="Contrato sem vencimento" />
                                  )}
                                  {imovel.temExcesso && (
                                    <AlertTriangle className="w-4 h-4 text-red-500" title="Financiamento acima da área financiável" />
                                  )}
                                  {(parseFloat(imovel.area_pastagens) || 0) > 0 && (
                                    <div className="group relative">
                                      <span className="text-sm" title="Área de pastagens">🐄</span>
                                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                                        <div className="font-semibold mb-1">Área de Pastagens</div>
                                        <div className="text-gray-300">
                                          {formatArea(imovel.area_pastagens)} ha de pastagens foram descontados da área financiável
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{formatarMatricula(imovel.matricula_numero)}</td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {(imovel.tipo_propriedade === "terceiros" || imovel.tipo_propriedade === "proprio_condominio")
                                  ? formatDate(imovel.data_vencimento_contrato)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-green-600">
                                  {formatArea(imovel.areaFinanciavel)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-orange-600">
                                  {formatArea(imovel.areaFinanciada)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold ${
                                  imovel.saldoFinanciar === 0 ? 'text-gray-400' : 'text-purple-600'
                                }`}>
                                  {formatArea(imovel.saldoFinanciar)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline" className={`text-xs ${getStatusBadge(imovel.tipo_propriedade)}`}>
                                  {getStatusLabel(imovel.tipo_propriedade)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => irParaImovel(imovel)}
                                  className="h-7 px-2"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                            {expandido && temFinanciamentos && (
                              <tr>
                                <td colSpan="12" className="px-4 py-0 bg-slate-50/50">
                                  <div className="p-4 border-l-4 border-blue-400">
                                    <p className="text-xs font-semibold text-gray-700 mb-3">
                                      Histórico de Financiamentos
                                    </p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="py-2 text-left text-gray-600 font-medium">Safra</th>
                                          <th className="py-2 text-left text-gray-600 font-medium">Cultura</th>
                                          <th className="py-2 text-right text-gray-600 font-medium">Área Financiada (ha)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {financiamentosFiltrados.map((fin, idx) => (
                                          <tr key={idx} className="border-b border-gray-100">
                                            <td className="py-2 text-gray-700">{fin.safra || "—"}</td>
                                            <td className="py-2 text-gray-700">{fin.cultura_financiada || "—"}</td>
                                            <td className="py-2 text-right text-gray-900 font-medium">
                                              {formatArea(fin.area_financiada)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="mt-3 pt-2 border-t border-gray-200 flex justify-end gap-4 text-xs">
                                      <div>
                                        <span className="text-gray-500">Total financiado no filtro: </span>
                                        <span className="font-bold text-orange-600">{formatArea(imovel.areaFinanciada)} ha</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Saldo a financiar: </span>
                                        <span className="font-bold text-purple-600">{formatArea(imovel.saldoFinanciar)} ha</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Resumo por Município */}
            {resumoPorMunicipio.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Resumo por Município
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resumoPorMunicipio.map((res) => (
                      <button
                        key={res.municipio}
                        onClick={() => setMunicipioFiltro(res.municipio)}
                        className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                          municipioFiltro === res.municipio
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900">{res.municipio}</span>
                          <Badge variant="outline" className="text-xs">
                            {res.quantidade} {res.quantidade === 1 ? 'imóvel' : 'imóveis'}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Financiável:</span>
                            <span className="text-lg font-bold text-green-600">
                              {formatArea(res.areaFinanciavel)} ha
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-500">Financiada:</span>
                            <span className="text-sm font-semibold text-orange-600">
                              {formatArea(res.areaFinanciada)} ha
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
                            <span className="text-xs text-gray-600 font-medium">Saldo:</span>
                            <span className="text-lg font-bold text-purple-600">
                              {formatArea(res.saldo)} ha
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}