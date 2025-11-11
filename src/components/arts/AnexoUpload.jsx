import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Download, FileText, Map } from "lucide-react";
import { UploadPrivateFile, CreateFileSignedUrl } from "@/integrations/Core";

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function AnexoUpload({ 
  label, 
  currentFile, 
  onFileChange, 
  accept, 
  maxSize = 20 * 1024 * 1024, // 20MB default
  icon: Icon = FileText 
}) {
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      alert(`Arquivo muito grande. Tamanho máximo: ${formatFileSize(maxSize)}`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_uri } = await UploadPrivateFile({ file });
      
      const fileMetadata = {
        file_id: file_uri,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: file_uri,
        uploaded_at: new Date().toISOString()
      };

      onFileChange(fileMetadata);
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload do arquivo. Tente novamente.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async () => {
    if (!currentFile?.url) return;

    try {
      const { signed_url } = await CreateFileSignedUrl({ 
        file_uri: currentFile.url,
        expires_in: 300 // 5 minutes
      });
      
      // Create a temporary link to download
      const link = document.createElement('a');
      link.href = signed_url;
      link.download = currentFile.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
    }
  };

  const handleRemove = () => {
    if (window.confirm(`Tem certeza que deseja remover o arquivo "${currentFile?.file_name}"?`)) {
      onFileChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </Label>
      
      {currentFile ? (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{currentFile.file_name}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatFileSize(currentFile.file_size)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Baixar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`file-${label.replace(/\s+/g, '-')}`).click()}
              className="text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Substituir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
          <Icon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            {uploading ? 'Fazendo upload...' : `Clique para selecionar ${label.toLowerCase()}`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById(`file-${label.replace(/\s+/g, '-')}`).click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
          </Button>
        </div>
      )}

      <Input
        id={`file-${label.replace(/\s+/g, '-')}`}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <p className="text-xs text-gray-500">
        Formatos aceitos: {accept} (máx. {formatFileSize(maxSize)})
      </p>
    </div>
  );
}