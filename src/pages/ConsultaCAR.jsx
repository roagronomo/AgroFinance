import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Upload, Search, AlertCircle, CheckCircle2, FileText, Map as MapIcon, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ESTADOS_BRASIL = [
  { value: "ac", label: "AC - Acre" },
  { value: "al", label: "AL - Alagoas" },
  { value: "ap", label: "AP - Amapá" },
  { value: "am", label: "AM - Amazonas" },
  { value: "ba", label: "BA - Bahia" },
  { value: "ce", label: "CE - Ceará" },
  { value: "df", label: "DF - Distrito Federal" },
  { value: "es", label: "ES - Espírito Santo" },
  { value: "go", label: "GO - Goiás" },
  { value: "ma", label: "MA - Maranhão" },
  { value: "mt", label: "MT - Mato Grosso" },
  { value: "ms", label: "MS - Mato Grosso do Sul" },
  { value: "mg", label: "MG - Minas Gerais" },
  { value: "pa", label: "PA - Pará" },
  { value: "pb", label: "PB - Paraíba" },
  { value: "pr", label: "PR - Paraná" },
  { value: "pe", label: "PE - Pernambuco" },
  { value: "pi", label: "PI - Piauí" },
  { value: "rj", label: "RJ - Rio de Janeiro" },
  { value: "rn", label: "RN - Rio Grande do Norte" },
  { value: "rs", label: "RS - Rio Grande do Sul" },
  { value: "ro", label: "RO - Rondônia" },
  { value: "rr", label: "RR - Roraima" },
  { value: "sc", label: "SC - Santa Catarina" },
  { value: "sp", label: "SP - São Paulo" },
  { value: "se", label: "SE - Sergipe" },
  { value: "to", label: "TO - Tocantins" }
];

const extrairCoordenadaKML = (conteudoKML) => {
  // Procurar tag <coordinates> (formato comum em KML)
  const regexCoordinates = /<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i;
  const matchCoordinates = conteudoKML.match(regexCoordinates);
  
  if (matchCoordinates && matchCoordinates[1]) {
    const coordsText = matchCoordinates[1].trim();
    // Formato típico: longitude,latitude,altitude ou longitude,latitude
    // Podem vir múltiplas coordenadas separadas por espaço ou quebra de linha
    const primeiraCoord = coordsText.split(/[\s\n]+/)[0];
    const partes = primeiraCoord.split(',');
    
    if (partes.length >= 2) {
      const longitude = parseFloat(partes[0]);
      const latitude = parseFloat(partes[1]);
      
      if (!isNaN(longitude) && !isNaN(latitude)) {
        return { longitude, latitude };
      }
    }
  }
  
  return null;
};

export default function ConsultaCAR() {
  const [arquivo, setArquivo] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erro, setErro] = useState("");
  const [coordenadas, setCoordenadas] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.kml')) {
        setErro('Por favor, selecione apenas arquivos .kml');
        setArquivo(null);
        setNomeArquivo("");
        e.target.value = '';
        return;
      }
      setArquivo(file);
      setNomeArquivo(file.name);
      setErro("");
    }
  };

  const extrairLocalizacao = async () => {
    setErro("");
    setCoordenadas(null);

    if (!arquivo) {
      setErro("Por favor, selecione um arquivo KML.");
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const conteudoKML = event.target.result;
        const coords = extrairCoordenadaKML(conteudoKML);
        
        if (!coords) {
          setErro("Não foi possível extrair coordenadas do arquivo KML. Verifique se o arquivo contém tags <coordinates>.");
          return;
        }

        setCoordenadas(coords);
      };

      reader.onerror = () => {
        setErro("Erro ao ler o arquivo KML.");
      };

      reader.readAsText(arquivo);

    } catch (error) {
      console.error('Erro geral:', error);
      setErro(`Erro: ${error.message}`);
    }
  };

  const copiarCoordenadas = () => {
    if (coordenadas) {
      const texto = `${coordenadas.latitude.toFixed(6)}, ${coordenadas.longitude.toFixed(6)}`;
      navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const abrirGoogleMaps = () => {
    if (coordenadas) {
      const url = `https://www.google.com/maps/search/?api=1&query=${coordenadas.latitude},${coordenadas.longitude}&t=k`;
      window.open(url, '_blank');
    }
  };

  const abrirSICAR = () => {
    const url = "https://consultapublica.car.gov.br/publico/imoveis/index";
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            Assistente de Localização CAR
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Localize sua área no mapa e consulte o CAR de forma visual
          </p>
        </div>

        {/* Formulário */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Enviar Arquivo KML
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Upload KML */}
              <div className="space-y-2">
                <Label htmlFor="kml-file" className="text-sm font-medium">Arquivo KML da Área *</Label>
                <div className="flex items-center gap-3">
                  <label htmlFor="kml-file" className="flex-1">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
                      <div className="flex items-center justify-center gap-3">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {nomeArquivo || "Clique para selecionar arquivo .kml"}
                        </span>
                      </div>
                    </div>
                  </label>
                  <input
                    id="kml-file"
                    type="file"
                    accept=".kml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {nomeArquivo && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{nomeArquivo}</span>
                  </div>
                )}
              </div>

              {/* Botão Extrair */}
              <div className="pt-2">
                <Button
                  onClick={extrairLocalizacao}
                  disabled={!arquivo}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  <MapIcon className="w-4 h-4 mr-2" />
                  Extrair Localização
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Resultados */}
        {coordenadas && (
          <Card className="mb-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 rounded-xl shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Localização Extraída
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Coordenadas com Botão de Copiar */}
              <div className="bg-white rounded-lg p-6 border-2 border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm uppercase tracking-wide text-gray-500 font-semibold">Coordenadas do Centro</Label>
                  <Button
                    onClick={copiarCoordenadas}
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {copiado ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-700 font-mono">
                    {coordenadas.latitude.toFixed(6)}, {coordenadas.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-3">
                <Button
                  onClick={abrirGoogleMaps}
                  className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
                >
                  <span className="text-2xl mr-2">📍</span>
                  Ver Local no Google Maps
                </Button>

                <Button
                  onClick={abrirSICAR}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg"
                >
                  <span className="text-2xl mr-2">🏛️</span>
                  Consultar no SICAR
                </Button>
              </div>

              {/* Instruções */}
              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="space-y-2">
                    <p className="font-semibold">Como usar:</p>
                    <p><strong>Passo 1:</strong> Clique no botão <span className="font-semibold text-green-700">Verde</span> para ver o desenho da lavoura no satélite.</p>
                    <p><strong>Passo 2:</strong> Clique no botão <span className="font-semibold text-blue-700">Azul</span>, selecione o município e localize visualmente a mesma área para obter o número do CAR.</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Mensagem de Erro */}
        {erro && (
          <Alert className="mb-6 bg-red-50 border-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {erro}
            </AlertDescription>
          </Alert>
        )}


      </div>
    </div>
  );
}