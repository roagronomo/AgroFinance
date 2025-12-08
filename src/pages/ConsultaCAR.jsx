import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Upload, Search, AlertCircle, CheckCircle2, FileText, Map as MapIcon } from "lucide-react";
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
  const [uf, setUf] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [coordenadas, setCoordenadas] = useState(null);

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

  const buscarImovel = async () => {
    setErro("");
    setResultado(null);
    setCoordenadas(null);

    if (!uf) {
      setErro("Por favor, selecione um estado (UF).");
      return;
    }

    if (!arquivo) {
      setErro("Por favor, selecione um arquivo KML.");
      return;
    }

    setBuscando(true);

    try {
      // Ler conteúdo do arquivo KML
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const conteudoKML = event.target.result;
        
        // Extrair primeira coordenada
        const coords = extrairCoordenadaKML(conteudoKML);
        
        if (!coords) {
          setErro("Não foi possível extrair coordenadas do arquivo KML. Verifique se o arquivo contém tags <coordinates>.");
          setBuscando(false);
          return;
        }

        setCoordenadas(coords);

        // Construir URL original do GeoServer (HTTP)
        const geoServerUrl = `http://geoserver.car.gov.br/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=sicar:sicar_imoveis_${uf.toLowerCase()}&outputFormat=application/json&cql_filter=INTERSECTS(the_geom,POINT(${coords.longitude} ${coords.latitude}))`;
        
        // Usar corsproxy.io para fazer a ponte segura
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(geoServerUrl);
        
        console.log(proxyUrl);

        try {
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (!data.features || data.features.length === 0) {
            setErro("Nenhum imóvel encontrado nesta coordenada.");
            setBuscando(false);
            return;
          }

          // Pegar primeiro resultado
          const imovel = data.features[0].properties;
          
          setResultado({
            cod_imovel: imovel.cod_imovel || 'N/A',
            municipio: imovel.municipio || imovel.nom_munici || 'N/A',
            area: imovel.num_area || imovel.area_ha || 'N/A',
            status: imovel.des_situacao || imovel.status || 'N/A'
          });

        } catch (fetchError) {
          console.error('Erro ao consultar API:', fetchError);
          alert("Erro: " + fetchError.message);
          setErro(`Erro ao consultar API do SICAR: ${fetchError.message}`);
        } finally {
          setBuscando(false);
        }
      };

      reader.onerror = () => {
        setErro("Erro ao ler o arquivo KML.");
        setBuscando(false);
      };

      reader.readAsText(arquivo);

    } catch (error) {
      console.error('Erro geral:', error);
      setErro(`Erro: ${error.message}`);
      setBuscando(false);
    }
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
            Consulta CAR
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Busque informações de imóveis rurais através de arquivo KML
          </p>
        </div>

        {/* Formulário */}
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Estado */}
              <div className="space-y-2">
                <Label htmlFor="uf" className="text-sm font-medium">Estado (UF) *</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger id="uf" className="h-10">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map(estado => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload KML */}
              <div className="space-y-2">
                <Label htmlFor="kml-file" className="text-sm font-medium">Arquivo KML *</Label>
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

              {/* Botão Pesquisar */}
              <div className="pt-2">
                <Button
                  onClick={buscarImovel}
                  disabled={buscando || !uf || !arquivo}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  {buscando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Pesquisando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Pesquisar Imóvel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coordenadas Extraídas */}
        {coordenadas && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 rounded-xl">
            <MapIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Coordenadas extraídas:</strong> Latitude {coordenadas.latitude.toFixed(6)}, Longitude {coordenadas.longitude.toFixed(6)}
            </AlertDescription>
          </Alert>
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

        {/* Resultado */}
        {resultado && (
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Imóvel Encontrado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Número do Recibo CAR</Label>
                  <p className="text-base font-semibold text-gray-800">{resultado.cod_imovel}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Município</Label>
                  <p className="text-base font-semibold text-gray-800">{resultado.municipio}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Área do Imóvel</Label>
                  <p className="text-base font-semibold text-gray-800">
                    {typeof resultado.area === 'number' ? `${resultado.area.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha` : resultado.area}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Status</Label>
                  <p className="text-base font-semibold text-gray-800">{resultado.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}