
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Trash2, Upload, FileText, Paperclip, MapPin } from "lucide-react";
import { UploadPrivateFile, CreateFileSignedUrl } from "@/integrations/Core";
import { ProjetoAnexo } from "@/entities/ProjetoAnexo";
import { format } from "date-fns";

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const CATEGORIAS = {
  contrato: {
    label: "Contrato / Cédula (PDF)",
    accept: ".pdf,application/pdf",
    icon: FileText,
    color: "blue"
  },
  art: {
    label: "ART (PDF)",
    accept: ".pdf,application/pdf",
    icon: Paperclip,
    color: "green"
  },
  geomapa: {
    label: "GeoMapa (KML/KMZ)",
    accept: ".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz",
    icon: MapPin,
    color: "purple"
  }
};

function CategoriaAnexos({ categoria, projetoId, anexos, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const config = CATEGORIAS[categoria];
  const fileListRef = useRef(null); // Ref para a lista de arquivos

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setErro("");

    try {
      for (const file of files) {
        // Validar tipo de arquivo
        const isValidType = config.accept.split(',').some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type);
          }
          return file.type === type;
        });

        if (!isValidType) {
          setErro(`Arquivo ${file.name} não é do tipo aceito nesta categoria.`);
          continue;
        }

        // Upload do arquivo
        const { file_uri } = await UploadPrivateFile({ file });

        // Criar registro no banco
        await ProjetoAnexo.create({
          projeto_id: projetoId,
          categoria: categoria,
          file_id: file_uri,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });
      }

      // Atualizar lista
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro no upload:', error);
      setErro('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (anexo) => {
    try {
      const { signed_url } = await CreateFileSignedUrl({ 
        file_uri: anexo.file_id, 
        expires_in: 300 
      });
      const link = document.createElement('a');
      link.href = signed_url;
      link.download = anexo.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
    }
  };

  const handleDelete = async (anexo) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${anexo.file_name}"?`)) {
      return;
    }

    try {
      await ProjetoAnexo.delete(anexo.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      alert('Erro ao excluir arquivo. Tente novamente.');
    }
  };

  // Scrolla para o final da lista de arquivos sempre que os anexos mudam
  useEffect(() => {
    if (fileListRef.current) {
      fileListRef.current.scrollTop = fileListRef.current.scrollHeight;
    }
  }, [anexos]);

  const IconComponent = config.icon;
  const inputId = `file-upload-${categoria}`;

  return (
    <div className="space-y-4" data-categoria={categoria}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <IconComponent className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-900">
            {anexos.length} arquivo(s)
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(inputId).click()}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Enviando...' : 'Adicionar'}
        </Button>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <input
        id={inputId}
        type="file"
        accept={config.accept}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        disabled={uploading}
      />

      {/* Added max-h-60 and overflow-y-auto for scroll functionality */}
      <div 
        ref={fileListRef} // Aplicando a ref aqui
        className="space-y-2 max-h-60 overflow-y-auto pr-2"
        data-file-list // Adicionando data-file-list conforme o outline
      > 
        {anexos.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg border-green-200">
            <IconComponent className="w-12 h-12 text-green-300 mx-auto mb-2" />
            <p className="text-sm text-green-600">Nenhum arquivo anexado</p>
            <p className="text-xs text-green-500 mt-1">
              Clique em "Adicionar" para enviar arquivos
            </p>
          </div>
        ) : (
          anexos.map((anexo) => (
            <div 
              key={anexo.id} 
              className="border rounded-lg p-3 bg-white hover:bg-green-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <IconComponent className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {anexo.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(anexo.file_size)}
                      </Badge>
                      {anexo.created_date && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(anexo.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100"
                    onClick={() => handleDownload(anexo)}
                    title="Baixar arquivo"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                    onClick={() => handleDelete(anexo)}
                    title="Excluir arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500">
        Formatos aceitos: {config.accept.split(',').map(t => t.replace('application/', '').replace('vnd.google-earth.', '')).join(', ')}
      </p>
    </div>
  );
}

export default function AnexosProjeto({ projetoId, defaultTab = "contrato" }) {
  const [anexos, setAnexos] = useState({
    contrato: [],
    art: [],
    geomapa: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const carregarAnexos = useCallback(async () => {
    if (!projetoId) return;
    
    setIsLoading(true);
    try {
      const todosAnexos = await ProjetoAnexo.filter({ projeto_id: projetoId });
      
      const agrupados = {
        contrato: todosAnexos.filter(a => a.categoria === 'contrato'),
        art: todosAnexos.filter(a => a.categoria === 'art'),
        geomapa: todosAnexos.filter(a => a.categoria === 'geomapa')
      };
      
      setAnexos(agrupados);
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
    }
    setIsLoading(false);
  }, [projetoId]);

  useEffect(() => {
    carregarAnexos();
  }, [carregarAnexos]);

  // Atualizar aba ativa quando defaultTab mudar
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!projetoId) {
    return (
      <Card className="border-green-100">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">
            Salve o projeto primeiro para adicionar anexos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAnexos = anexos.contrato.length + anexos.art.length + anexos.geomapa.length;

  return (
    <Card className="shadow-xl border-green-100">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Paperclip className="w-5 h-5" />
          Anexos do Projeto
          {totalAnexos > 0 && (
            <Badge className="bg-white text-green-600 ml-2">
              {totalAnexos}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Carregando anexos...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-green-50 p-1 rounded-xl">
              <TabsTrigger 
                value="contrato"
                className="
                  data-[state=inactive]:bg-[#ECFFF5] 
                  data-[state=inactive]:text-[#245F44]
                  data-[state=inactive]:font-medium
                  data-[state=active]:bg-[#D8F6E8] 
                  data-[state=active]:text-[#0F5132] 
                  data-[state=active]:font-bold
                  data-[state=active]:shadow-[inset_0_0_0_2px_#1E8E5A]
                  transition-all duration-200 rounded-lg
                "
              >
                <FileText className="w-4 h-4 mr-2" />
                Contrato / Cédula (PDF)
                {anexos.contrato.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-white border-green-600 text-green-600">
                    {anexos.contrato.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="art"
                className="
                  data-[state=inactive]:bg-[#ECFFF5] 
                  data-[state=inactive]:text-[#245F44]
                  data-[state=inactive]:font-medium
                  data-[state=active]:bg-[#D8F6E8] 
                  data-[state=active]:text-[#0F5132] 
                  data-[state=active]:font-bold
                  data-[state=active]:shadow-[inset_0_0_0_2px_#1E8E5A]
                  transition-all duration-200 rounded-lg
                "
              >
                <Paperclip className="w-4 h-4 mr-2" />
                ART (PDF)
                {anexos.art.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-white border-green-600 text-green-600">
                    {anexos.art.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="geomapa"
                className="
                  data-[state=inactive]:bg-[#ECFFF5] 
                  data-[state=inactive]:text-[#245F44]
                  data-[state=inactive]:font-medium
                  data-[state=active]:bg-[#D8F6E8] 
                  data-[state=active]:text-[#0F5132] 
                  data-[state=active]:font-bold
                  data-[state=active]:shadow-[inset_0_0_0_2px_#1E8E5A]
                  transition-all duration-200 rounded-lg
                "
              >
                <MapPin className="w-4 h-4 mr-2" />
                GeoMapa (KML/KMZ)
                {anexos.geomapa.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-white border-green-600 text-green-600">
                    {anexos.geomapa.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contrato" className="mt-4" data-state={activeTab === 'contrato' ? 'active' : 'inactive'}>
              <CategoriaAnexos
                categoria="contrato"
                projetoId={projetoId}
                anexos={anexos.contrato}
                onUpdate={carregarAnexos}
              />
            </TabsContent>

            <TabsContent value="art" className="mt-4" data-state={activeTab === 'art' ? 'active' : 'inactive'}>
              <CategoriaAnexos
                categoria="art"
                projetoId={projetoId}
                anexos={anexos.art}
                onUpdate={carregarAnexos}
              />
            </TabsContent>

            <TabsContent value="geomapa" className="mt-4" data-state={activeTab === 'geomapa' ? 'active' : 'inactive'}>
              <CategoriaAnexos
                categoria="geomapa"
                projetoId={projetoId}
                anexos={anexos.geomapa}
                onUpdate={carregarAnexos}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
