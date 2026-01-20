import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ConfiguracaoAniversarios() {
  const [configuracao, setConfiguracao] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const configs = await base44.entities.ConfiguracaoAniversario.list();
      if (configs.length > 0) {
        setConfiguracao(configs[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (configuracao) {
        await base44.entities.ConfiguracaoAniversario.update(configuracao.id, {
          imagem_cartao_url: file_url,
          imagem_cartao_nome: file.name,
          ativo: true
        });
      } else {
        await base44.entities.ConfiguracaoAniversario.create({
          imagem_cartao_url: file_url,
          imagem_cartao_nome: file.name,
          ativo: true
        });
      }

      toast.success("Imagem salva com sucesso!");
      await carregarConfiguracao();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao salvar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleRemover = async () => {
    if (!configuracao) return;
    
    if (!confirm("Deseja remover a imagem do cartão de aniversário?")) return;

    try {
      await base44.entities.ConfiguracaoAniversario.update(configuracao.id, {
        imagem_cartao_url: "",
        imagem_cartao_nome: "",
        ativo: false
      });
      toast.success("Imagem removida!");
      await carregarConfiguracao();
    } catch (error) {
      console.error("Erro ao remover:", error);
      toast.error("Erro ao remover imagem");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Toaster position="top-right" richColors />
      
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            🎂 Configuração de Aniversários
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Imagem do Cartão de Aniversário
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Esta imagem será enviada junto com a mensagem de aniversário no WhatsApp
              </p>

              {configuracao?.imagem_cartao_url ? (
                <div className="space-y-4">
                  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    <div className="flex items-start gap-4">
                      <div className="w-48 h-48 border-2 border-purple-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src={configuracao.imagem_cartao_url}
                          alt="Cartão de aniversário"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {configuracao.imagem_cartao_nome}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(configuracao.imagem_cartao_url, '_blank')}
                            className="text-purple-600"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Ver Imagem
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemover}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center">
                        {uploading ? (
                          <>
                            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
                            <span className="text-sm text-gray-600">Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">
                              Clique para substituir a imagem
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      {uploading ? (
                        <>
                          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-3" />
                          <span className="text-gray-600">Enviando imagem...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-purple-600 mb-3" />
                          <span className="text-lg font-medium text-gray-900 mb-1">
                            Clique para enviar uma imagem
                          </span>
                          <span className="text-sm text-gray-500">
                            PNG, JPG, GIF até 10MB
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Como funciona:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Configure a data de nascimento e ative o lembrete no cadastro de cada cliente</li>
                <li>• Todos os dias às 7h da manhã o sistema verifica aniversariantes</li>
                <li>• A mensagem e a imagem configurada são enviadas automaticamente</li>
                <li>• Você pode escolher enviar para um grupo ou número individual</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}