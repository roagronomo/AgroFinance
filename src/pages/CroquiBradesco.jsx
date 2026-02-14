import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, MapPin, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CroquiBradesco() {
  const [formulario, setFormulario] = useState({
    fazendaNome: "",
    matricula: "",
    municipio: "",
    areaHa: ""
  });
  
  const [arquivoKML, setArquivoKML] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [arquivosGerados, setArquivosGerados] = useState(null);
  const [erro, setErro] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.kml')) {
      setArquivoKML(file);
      setErro("");
    } else {
      setErro("Por favor, selecione um arquivo KML válido");
      setArquivoKML(null);
    }
  };

  const handleGerarCroqui = async () => {
    // Validações
    if (!formulario.fazendaNome || !formulario.matricula || !formulario.municipio || !formulario.areaHa) {
      setErro("Por favor, preencha todos os campos");
      return;
    }

    if (!arquivoKML) {
      setErro("Por favor, selecione um arquivo KML");
      return;
    }

    setIsProcessing(true);
    setErro("");
    setArquivosGerados(null);

    try {
      // 1. Upload do arquivo KML
      const { file_url: kmlUrl } = await base44.integrations.Core.UploadFile({ file: arquivoKML });

      // 2. Buscar o conteúdo do KML
      const kmlResponse = await fetch(kmlUrl);
      const kmlContent = await kmlResponse.text();

      // 3. Chamar a backend function
      const resultado = await base44.functions.invoke('gerarCroqui', {
        kmlContent,
        formData: {
          fazendaNome: formulario.fazendaNome,
          matricula: formulario.matricula,
          municipio: formulario.municipio,
          areaHa: parseFloat(formulario.areaHa)
        }
      });

      if (resultado?.data?.success) {
        setArquivosGerados(resultado.data.files);
      } else {
        setErro(resultado?.data?.error || "Erro ao gerar croqui");
      }
    } catch (error) {
      console.error("Erro ao processar croqui:", error);
      setErro(error.message || "Erro ao processar o croqui");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-xl mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Croqui Bradesco
          </h1>
          <p className="text-gray-600">
            Gere croquis de localização automaticamente
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Dados da Propriedade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fazendaNome">Nome da Fazenda *</Label>
                <Input
                  id="fazendaNome"
                  placeholder="Ex: Fazenda Santa Maria"
                  value={formulario.fazendaNome}
                  onChange={(e) => setFormulario({ ...formulario, fazendaNome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Nº da Matrícula *</Label>
                <Input
                  id="matricula"
                  placeholder="Ex: 12345"
                  value={formulario.matricula}
                  onChange={(e) => setFormulario({ ...formulario, matricula: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="municipio">Município/UF *</Label>
                <Input
                  id="municipio"
                  placeholder="Ex: Rio Verde/GO"
                  value={formulario.municipio}
                  onChange={(e) => setFormulario({ ...formulario, municipio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaHa">Área Desejada (ha) *</Label>
                <Input
                  id="areaHa"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 110.00"
                  value={formulario.areaHa}
                  onChange={(e) => setFormulario({ ...formulario, areaHa: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kml">Arquivo KML *</Label>
              <Input
                id="kml"
                type="file"
                accept=".kml"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {arquivoKML && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  ✓ {arquivoKML.name}
                </p>
              )}
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGerarCroqui}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 mr-2" />
                  Gerar Croqui
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {arquivosGerados && (
          <Card className="mt-6 shadow-xl border-2 border-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-green-700">
                ✓ Croqui Gerado com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3">
                <Button
                  onClick={() => handleDownload(arquivosGerados.docx_url, arquivosGerados.docx_filename)}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                >
                  <Download className="w-5 h-5 mr-3 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold">Documento Word (DOCX)</p>
                    <p className="text-sm text-gray-600">{arquivosGerados.docx_filename}</p>
                  </div>
                </Button>

                <Button
                  onClick={() => handleDownload(arquivosGerados.png_url, arquivosGerados.png_filename)}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                >
                  <Download className="w-5 h-5 mr-3 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold">Imagem (PNG)</p>
                    <p className="text-sm text-gray-600">{arquivosGerados.png_filename}</p>
                  </div>
                </Button>

                <Button
                  onClick={() => handleDownload(arquivosGerados.kml_url, arquivosGerados.kml_filename)}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                >
                  <Download className="w-5 h-5 mr-3 flex-shrink-0 text-orange-600" />
                  <div>
                    <p className="font-semibold">Arquivo KML</p>
                    <p className="text-sm text-gray-600">{arquivosGerados.kml_filename}</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}