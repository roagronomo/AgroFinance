import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AtualizacaoDocumentos() {
  // Estados CND do ITR
  const [cib, setCib] = useState("");
  const [processandoCND, setProcessandoCND] = useState(false);
  const [resultadoCND, setResultadoCND] = useState(null);

  // Estados CCIR do INCRA
  const [codigoImovel, setCodigoImovel] = useState("");
  const [ufSede, setUfSede] = useState("");
  const [municipioSede, setMunicipioSede] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState("fisica");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [processandoCCIR, setProcessandoCCIR] = useState(false);
  const [resultadoCCIR, setResultadoCCIR] = useState(null);

  const ufs = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

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
        cpfCnpj: cpfCnpj.replace(/\D/g, '')
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
          Gere automaticamente CND do ITR e CCIR do INCRA preenchendo os dados abaixo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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