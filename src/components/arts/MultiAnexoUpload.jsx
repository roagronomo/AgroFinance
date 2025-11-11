import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Download, File, Plus } from "lucide-react";
import { UploadPrivateFile, CreateFileSignedUrl } from "@/integrations/Core";

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MultiAnexoUpload({
  label,
  currentFiles = [],
  onFilesChange,
  accept,
  maxSize = 20 * 1024 * 1024, // 20MB default
  maxFiles = null, // null = ilimitado
  icon: Icon = File
}) {
  const [uploading, setUploading] = useState(false);
  const inputId = `multi-file-upload-${label.replace(/\s+/g, '-')}`;

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Verificar limite de arquivos
    if (maxFiles && currentFiles.length >= maxFiles) {
      alert(`Você já atingiu o limite de ${maxFiles} arquivo(s) para este grupo.`);
      event.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      alert(`Arquivo muito grande. Tamanho máximo: ${formatFileSize(maxSize)}`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_uri } = await UploadPrivateFile({ file });
      const newFileMetadata = {
        file_id: file_uri,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: file_uri,
        uploaded_at: new Date().toISOString()
      };
      onFilesChange([...currentFiles, newFileMetadata]);
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload do arquivo. Tente novamente.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (file) => {
    if (!file?.url) return;
    try {
      const { signed_url } = await CreateFileSignedUrl({ file_uri: file.url, expires_in: 300 });
      const link = document.createElement('a');
      link.href = signed_url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
    }
  };

  const handleRemove = (fileToRemove) => {
    if (window.confirm(`Tem certeza que deseja remover o arquivo "${fileToRemove.file_name}"?`)) {
      const updatedFiles = currentFiles.filter(f => f.file_id !== fileToRemove.file_id);
      onFilesChange(updatedFiles);
    }
  };

  const isMaxFilesReached = maxFiles && currentFiles.length >= maxFiles;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
          {maxFiles && (
            <span className="text-xs text-gray-500">
              ({currentFiles.length}/{maxFiles})
            </span>
          )}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || isMaxFilesReached}
          onClick={() => document.getElementById(inputId).click()}
        >
          <Plus className="w-4 h-4 mr-2" />
          {uploading ? 'Enviando...' : 'Adicionar'}
        </Button>
      </div>

      <div className="space-y-2">
        {currentFiles.length === 0 ? (
          <div className="text-sm text-center text-gray-500 py-3 px-4 border-2 border-dashed rounded-lg">
            Nenhum arquivo adicionado.
          </div>
        ) : (
          currentFiles.map((file, index) => (
            <div key={index} className="border rounded-lg p-2 bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{file.file_name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                    {formatFileSize(file.file_size)}
                    </Badge>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)}>
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-800" onClick={() => handleRemove(file)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Input
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || isMaxFilesReached}
      />
      <p className="text-xs text-gray-500">
        Formatos: {accept.replaceAll(',', ', ')} (máx. {formatFileSize(maxSize)})
        {maxFiles && ` • Máximo ${maxFiles} arquivo(s)`}
      </p>
    </div>
  );
}