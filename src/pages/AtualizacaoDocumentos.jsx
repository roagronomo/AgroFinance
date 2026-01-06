import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, CheckCircle, AlertCircle, ExternalLink, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AtualizacaoDocumentos() {
  // Estado de busca por matrícula
  const [matriculaBusca, setMatriculaBusca] = useState("");
  const [buscandoImovel, setBuscandoImovel] = useState(false);

  // Estados CND do ITR
  const [cib, setCib] = useState("");
  const [processandoCND, setProcessandoCND] = useState(false);
  const [resultadoCND, setResultadoCND] = useState(null);

  // Estados CND de CPF
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [processandoCNDCpf, setProcessandoCNDCpf] = useState(false);
  const [resultadoCNDCpf, setResultadoCNDCpf] = useState(null);

  // Estados CND de CNPJ
  const [cnpj, setCnpj] = useState("");
  const [processandoCNDCnpj, setProcessandoCNDCnpj] = useState(false);
  const [resultadoCNDCnpj, setResultadoCNDCnpj] = useState(null);

  // Estados CCIR do INCRA
  const [codigoImovel, setCodigoImovel] = useState("");
  const [ufSede, setUfSede] = useState("");
  const [municipioSede, setMunicipioSede] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState("fisica");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [naturezaJuridica, setNaturezaJuridica] = useState("Sociedade Empresária Limitada");
  const [processandoCCIR, setProcessandoCCIR] = useState(false);
  const [resultadoCCIR, setResultadoCCIR] = useState(null);

  const ufs = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const formatarMatricula = (valor) => {
    if (!valor) return "";
    const numbers = String(valor).replace(/\D/g, '');
    if (!numbers) return "";
    return new Intl.NumberFormat('pt-BR').format(parseInt(numbers, 10));
  };

  const buscarImovelPorMatricula = async () => {
    if (!matriculaBusca.trim()) {
      toast.error("Digite o número da matrícula");
      return;
    }

    try {
      setBuscandoImovel(true);
      
      // Normalizar matrícula para busca (remover formatação)
      const matriculaNormalizada = matriculaBusca.replace(/\D/g, '');
      
      // Buscar todos os imóveis
      const todosImoveis = await base44.entities.Imovel.list("-created_date", 500);
      
      // Encontrar imóvel com matrícula correspondente
      const imovelEncontrado = todosImoveis.find(imovel => {
        const matriculaImovel = String(imovel.matricula_numero || "").replace(/\D/g, '');
        return matriculaImovel === matriculaNormalizada;
      });

      if (!imovelEncontrado) {
        toast.error("Imóvel não encontrado com esta matrícula");
        return;
      }

      toast.success("Imóvel encontrado! Preenchendo dados...");

      // Preencher CIB (Receita Federal)
      if (imovelEncontrado.receita_federal) {
        setCib(imovelEncontrado.receita_federal);
      }

      // Preencher dados do CCIR
      if (imovelEncontrado.numero_incra) {
        setCodigoImovel(imovelEncontrado.numero_incra);
      }

      // Extrair UF e município
      if (imovelEncontrado.municipio) {
        const partes = imovelEncontrado.municipio.split('/');
        if (partes.length === 2) {
          setMunicipioSede(partes[0].trim());
          setUfSede(partes[1].trim());
        }
      }

      // Buscar dados do proprietário nos dados da análise
      let proprietarioPrincipal = null;
      
      if (imovelEncontrado.dados_analise_certidao) {
        try {
          const dadosAnalise = JSON.parse(imovelEncontrado.dados_analise_certidao);
          if (dadosAnalise.proprietarios && dadosAnalise.proprietarios.length > 0) {
            proprietarioPrincipal = dadosAnalise.proprietarios[0];
          }
        } catch (e) {
          console.error("Erro ao parsear dados da análise:", e);
        }
      }

      if (proprietarioPrincipal) {
        const cpfCnpjLimpo = proprietarioPrincipal.cpf?.replace(/\D/g, '') || "";
        
        // Determinar se é pessoa física (11 dígitos) ou jurídica (14 dígitos)
        if (cpfCnpjLimpo.length === 11) {
          // Pessoa Física
          setTipoPessoa("fisica");
          setCpfCnpj(cpfCnpjLimpo);
          setCpf(cpfCnpjLimpo);
          setCnpj(""); // Limpar CNPJ
          toast.info("Proprietário: Pessoa Física");
        } else if (cpfCnpjLimpo.length === 14) {
          // Pessoa Jurídica
          setTipoPessoa("juridica");
          setCpfCnpj(cpfCnpjLimpo);
          setCnpj(cpfCnpjLimpo);
          setCpf(""); // Limpar CPF
          setNaturezaJuridica("Sociedade Empresária Limitada"); // Padrão
          toast.info("Proprietário: Pessoa Jurídica");
        }
      } else {
        toast.warning("Dados do proprietário não encontrados. Preencha manualmente.");
      }

    } catch (error) {
      console.error("Erro ao buscar imóvel:", error);
      toast.error("Erro ao buscar imóvel. Tente novamente.");
    } finally {
      setBuscandoImovel(false);
    }
  };

  const handleGerarCNDCpf = async () => {
    if (!cpf || !dataNascimento) {
      toast.error("Preencha CPF e data de nascimento");
      return;
    }

    try {
      setProcessandoCNDCpf(true);
      setResultadoCNDCpf(null);
      
      console.log('🚀 Invocando função gerarCndCpf...', { cpf, dataNascimento });

      const resultado = await base44.functions.invoke('gerarCndCpf', {
        cpf: cpf.trim(),
        dataNascimento: dataNascimento.trim()
      });
      
      console.log('📥 Resultado recebido:', resultado);

      if (resultado?.data?.success) {
        setResultadoCNDCpf(resultado.data);
        toast.success("CND de CPF gerada com sucesso!");
      } else {
        console.error('❌ Erro na resposta:', resultado);
        toast.error(resultado?.data?.error || "Erro ao gerar CND de CPF. Verifique o console para detalhes.");
      }
    } catch (error) {
      console.error("❌ Erro ao gerar CND de CPF:", error);
      console.error("Stack:", error?.stack);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessandoCNDCpf(false);
    }
  };

  const handleGerarCNDCnpj = async () => {
    if (!cnpj || !cnpj.trim()) {
      toast.error("Digite o CNPJ");
      return;
    }

    try {
      setProcessandoCNDCnpj(true);
      setResultadoCNDCnpj(null);
      
      console.log('🚀 Invocando função gerarCndCnpj...', { cnpj });

      const resultado = await base44.functions.invoke('gerarCndCnpj', {
        cnpj: cnpj.trim()
      });
      
      console.log('📥 Resultado recebido:', resultado);

      if (resultado?.data?.success) {
        setResultadoCNDCnpj(resultado.data);
        toast.success("CND de CNPJ gerada com sucesso!");
      } else {
        console.error('❌ Erro na resposta:', resultado);
        toast.error(resultado?.data?.error || "Erro ao gerar CND de CNPJ. Verifique o console para detalhes.");
      }
    } catch (error) {
      console.error("❌ Erro ao gerar CND de CNPJ:", error);
      console.error("Stack:", error?.stack);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessandoCNDCnpj(false);
    }
  };

  const handleGerarCND = async () => {
    if (!cib || !cib.trim()) {
      toast.error("Digite o número do CIB");
      return;
    }

    try {
      setProcessandoCND(true);
      setResultadoCND(null);

      const resultado = await base44.functions.invoke('gerarCndItr', {
        cib: cib.trim()
      });

      if (resultado.data.success) {
        setResultadoCND(resultado.data);
        toast.success("CND do ITR gerada com sucesso!");
      } else {
        toast.error(resultado.data.error || "Erro ao gerar CND");
      }
    } catch (error) {
      console.error("Erro ao gerar CND:", error);
      toast.error("Erro ao gerar CND do ITR");
    } finally {
      setProcessandoCND(false);
    }
  };

  const handleGerarCCIR = async () => {
    if (!codigoImovel || !ufSede || !municipioSede || !cpfCnpj) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setProcessandoCCIR(true);
      setResultadoCCIR(null);

      const resultado = await base44.functions.invoke('gerarCcirIncra', {
        codigoImovel: codigoImovel.trim(),
        ufSede,
        municipioSede: municipioSede.trim(),
        tipoPessoa,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        naturezaJuridica: tipoPessoa === 'juridica' ? naturezaJuridica : null
      });

      if (resultado.data.success) {
        setResultadoCCIR(resultado.data);
        toast.success("CCIR gerado com sucesso!");
      } else {
        toast.error(resultado.data.error || "Erro ao gerar CCIR");
      }
    } catch (error) {
      console.error("Erro ao gerar CCIR:", error);
      toast.error("Erro ao gerar CCIR do INCRA");
    } finally {
      setProcessandoCCIR(false);
    }
  };

  const handleBaixarDocumento = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Atualização de Documentos</h1>
        <p className="text-sm text-gray-600">
          Gere automaticamente documentos oficiais preenchendo os dados abaixo
        </p>
      </div>

      {/* Campo de busca por matrícula */}
      <Card className="border-blue-200 bg-blue-50/30 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-blue-900">
            <Search className="w-4 h-4" />
            Busca Rápida por Matrícula
          </CardTitle>
          <p className="text-xs text-blue-700 mt-1">
            Digite a matrícula do imóvel para preencher automaticamente todos os campos
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={matriculaBusca}
              onChange={(e) => setMatriculaBusca(formatarMatricula(e.target.value))}
              placeholder="Ex: 7.969"
              disabled={buscandoImovel}
              className="flex-1 text-sm border-blue-300 focus:border-blue-500"
            />
            <Button
              onClick={buscarImovelPorMatricula}
              disabled={buscandoImovel || !matriculaBusca}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {buscandoImovel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CND de CPF (Pessoa Física) */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-700" />
              CND de CPF (Pessoa Física)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                CPF
              </Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                disabled={processandoCNDCpf}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Data de Nascimento
              </Label>
              <Input
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                placeholder="DD/MM/AAAA"
                disabled={processandoCNDCpf}
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleGerarCNDCpf}
              disabled={processandoCNDCpf || !cpf || !dataNascimento}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {processandoCNDCpf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando CND...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar CND de CPF
                </>
              )}
            </Button>

            {resultadoCNDCpf && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Documento gerado com sucesso
                </div>
                {resultadoCNDCpf.pdfUrl && (
                  <Button
                    onClick={() => handleBaixarDocumento(resultadoCNDCpf.pdfUrl, `CND_CPF_${cpf}.pdf`)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CND de CNPJ (Pessoa Jurídica) */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-700" />
              CND de CNPJ (Pessoa Jurídica)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                CNPJ
              </Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                disabled={processandoCNDCnpj}
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleGerarCNDCnpj}
              disabled={processandoCNDCnpj || !cnpj}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {processandoCNDCnpj ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando CND...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar CND de CNPJ
                </>
              )}
            </Button>

            {resultadoCNDCnpj && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Documento gerado com sucesso
                </div>
                {resultadoCNDCnpj.pdfUrl && (
                  <Button
                    onClick={() => handleBaixarDocumento(resultadoCNDCnpj.pdfUrl, `CND_CNPJ_${cnpj}.pdf`)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CND do ITR */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-700" />
              CND do Imóvel Rural (ITR)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Número do CIB/NIRF
              </Label>
              <Input
                value={cib}
                onChange={(e) => setCib(e.target.value)}
                placeholder="Ex: 1.944.692-6"
                disabled={processandoCND}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite o código do imóvel rural (CIB ou NIRF)
              </p>
            </div>

            <Button
              onClick={handleGerarCND}
              disabled={processandoCND || !cib}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {processandoCND ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando CND...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar CND do ITR
                </>
              )}
            </Button>

            {resultadoCND && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Documento gerado com sucesso
                </div>
                {resultadoCND.pdfUrl && (
                  <Button
                    onClick={() => handleBaixarDocumento(resultadoCND.pdfUrl, `CND_ITR_${cib}.pdf`)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Este serviço acessa automaticamente o site da Receita Federal para gerar a certidão
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CCIR do INCRA */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-700" />
              CCIR do INCRA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Código do Imóvel Rural
              </Label>
              <Input
                value={codigoImovel}
                onChange={(e) => setCodigoImovel(e.target.value)}
                placeholder="Ex: 936.103.000.787-0"
                disabled={processandoCCIR}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  UF Sede
                </Label>
                <Select value={ufSede} onValueChange={setUfSede} disabled={processandoCCIR}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ufs.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Município Sede
                </Label>
                <Input
                  value={municipioSede}
                  onChange={(e) => setMunicipioSede(e.target.value)}
                  placeholder="Ex: Goiatuba"
                  disabled={processandoCCIR}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Tipo de Pessoa
              </Label>
              <Select value={tipoPessoa} onValueChange={setTipoPessoa} disabled={processandoCCIR}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {tipoPessoa === "fisica" ? "CPF" : "CNPJ"} do Titular
              </Label>
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder={tipoPessoa === "fisica" ? "000.000.000-00" : "00.000.000/0000-00"}
                disabled={processandoCCIR}
                className="text-sm"
              />
            </div>

            {tipoPessoa === "juridica" && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Natureza Jurídica
                </Label>
                <Select value={naturezaJuridica} onValueChange={setNaturezaJuridica} disabled={processandoCCIR}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sociedade Empresária Limitada">Sociedade Empresária Limitada</SelectItem>
                    <SelectItem value="Sociedade Simples Limitada">Sociedade Simples Limitada</SelectItem>
                    <SelectItem value="Sociedade Empresária">Sociedade Empresária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleGerarCCIR}
              disabled={processandoCCIR || !codigoImovel || !ufSede || !municipioSede || !cpfCnpj}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {processandoCCIR ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando CCIR...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar CCIR do INCRA
                </>
              )}
            </Button>

            {resultadoCCIR && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Documento gerado com sucesso
                </div>
                {resultadoCCIR.pdfUrl && (
                  <Button
                    onClick={() => handleBaixarDocumento(resultadoCCIR.pdfUrl, `CCIR_${codigoImovel}.pdf`)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Este serviço tenta resolver automaticamente o CAPTCHA. Se falhar, será necessário acessar manualmente o site do INCRA.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}