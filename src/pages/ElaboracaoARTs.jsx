import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Trash2, FileSignature, FileText, Map, Upload, X, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatarNomeProprio, validarCPF, validarCNPJ, formatarCPF, formatarCNPJ } from '@/components/lib/formatters';
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

const CULTURAS_OPTIONS = [
  { value: "soja_sequeiro", label: "Soja Sequeiro" },
  { value: "milho_safrinha", label: "Milho Safrinha" },
  { value: "sorgo_safrinha", label: "Sorgo Safrinha" },
  { value: "milheto", label: "Milheto" },
  { value: "forrageiras", label: "Forrageiras" },
  { value: "cana_de_acucar", label: "Cana de Açúcar" }
];

const formatarCEP = (valor) => {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5, 8)}`;
};

const formatarMatricula = (valor) => {
  const digitos = String(valor).replace(/\D/g, '');
  if (!digitos) return '';
  const numero = parseInt(digitos, 10);
  if (isNaN(numero)) return '';
  return new Intl.NumberFormat('pt-BR').format(numero);
};

const formatarMultiplasMatriculas = (valor) => {
  // Remover tudo exceto números, espaços e vírgulas
  const limpo = valor.replace(/[^\d\s,]/g, '');
  
  // Dividir por vírgulas ou espaços múltiplos
  const partes = limpo.split(/[\s,]+/).filter(p => p.length > 0);
  
  if (partes.length === 0) return '';
  
  // Formatar cada número com pontos de milhar
  const formatados = partes.map(p => {
    const num = parseInt(p, 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR').format(num);
  }).filter(Boolean);
  
  if (formatados.length === 0) return '';
  if (formatados.length === 1) return formatados[0];
  
  // Juntar com vírgulas e "e" antes do último
  const ultimos = formatados.slice(0, -1).join(', ');
  return `${ultimos} e ${formatados[formatados.length - 1]}`;
};

const formatarArea = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = parseFloat(valor);
  if (isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parsearArea = (valorFormatado) => {
  if (!valorFormatado) return null;
  const valorLimpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? null : numero;
};

const calcularCustoMedio = (areaHa) => {
  if (!areaHa || areaHa <= 0) return 0;
  const calculo = areaHa * 56;
  return calculo < 15000 ? 103.03 : 271.47;
};

const gerarArgumentacao = (cultura, area, safra) => {
  if (!cultura || !area || !safra) return '';
  
  const culturaLabel = CULTURAS_OPTIONS.find(c => c.value === cultura)?.label || cultura;
  const areaFormatada = formatarArea(area);
  
  return `Atuação na assistência técnica, plantio e condução da lavoura de ${culturaLabel} com área de ${areaFormatada} ha na safra ${safra}.`;
};

const buscarEnderecoPorCEP = async (cep) => {
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) {
    return null;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return {
      endereco: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

const MultiAnexoUpload = ({ label, accept, currentFiles = [], onFilesChange, icon: Icon }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxSize = 20 * 1024 * 1024;
    const invalidFiles = files.filter(f => f.size > maxSize);
    
    if (invalidFiles.length > 0) {
      alert(`${invalidFiles.length} arquivo(s) muito grande(s). Tamanho máximo: 20MB`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    
    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        uploadedFiles.push({
          file_id: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          url: file_url,
          uploaded_at: new Date().toISOString(),
        });
      }
      
      onFilesChange([...currentFiles, ...uploadedFiles]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload dos arquivos. Tente novamente.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = (index) => {
    if (window.confirm(`Remover arquivo "${currentFiles[index]?.file_name}"?`)) {
      const newFiles = currentFiles.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    }
  };

  const handleDownload = async (file) => {
    try {
      const fileUrl = file.url || file.file_id;
      const fileName = file.file_name || file.name;
      
      if (!fileUrl || fileUrl.startsWith('blob:')) {
        alert('⚠️ Este arquivo foi anexado anteriormente e não pode ser baixado.\n\nPor favor, remova este arquivo e adicione novamente para fazer o upload correto.');
        return;
      }

      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Erro ao buscar arquivo');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Verifique se o arquivo ainda existe no servidor.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isArquivoAntigo = (file) => {
    const fileUrl = file.url || file.file_id;
    return !fileUrl || fileUrl.startsWith('blob:');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-700 flex items-center gap-2 font-medium">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </Label>

      <div className="space-y-2">
        {currentFiles.map((file, index) => {
          const arquivoAntigo = isArquivoAntigo(file);
          
          return (
            <div key={`${file.file_name || file.name}-${index}`} className={`flex items-center gap-3 p-2.5 rounded border ${arquivoAntigo ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
              <FileText className={`w-4 h-4 flex-shrink-0 ${arquivoAntigo ? 'text-yellow-600' : 'text-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name || file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size || file.size)}
                  {arquivoAntigo && <span className="ml-2 text-yellow-600 font-semibold">⚠️ Requer re-upload</span>}
                </p>
              </div>
              {!arquivoAntigo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-800 flex-shrink-0"
                  onClick={() => handleDownload(file)}
                  title="Baixar arquivo"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-800 flex-shrink-0"
                onClick={() => handleRemove(index)}
                title="Remover arquivo"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor={`file-${label.replace(/\s+/g, '-')}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => document.getElementById(`file-${label.replace(/\s+/g, '-')}`).click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Enviando...' : 'Adicionar Arquivo'}
          </Button>
        </label>
        {currentFiles.length === 0 && (
          <span className="text-sm text-gray-400 italic">Nenhum arquivo selecionado</span>
        )}
        {currentFiles.length > 0 && (
          <span className="text-sm text-green-600 font-medium">{currentFiles.length} arquivo(s)</span>
        )}
      </div>

      <input
        id={`file-${label.replace(/\s+/g, '-')}`}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
    </div>
  );
};

const FormularioART = ({ artInicial = null, onSalvar, onCancelar }) => {
  const [dados, setDados] = useState({
    contratante_nome: '',
    contratante_cpf_cnpj: '',
    contratante_email: '',
    contratante_cep: '',
    contratante_endereco: '',
    contratante_bairro: '',
    contratante_cidade: '',
    contratante_uf: '',
    obra_cep: '',
    obra_cidade: '',
    obra_uf: '',
    obra_imovel: '',
    obra_matricula: '',
    obra_car: '',
    obra_latitude: '',
    obra_longitude: '',
    obra_area_ha: '',
    obra_area_ha_display: '',
    obra_cultura: '',
    obra_safra: '',
    obra_proprietario_nome: '',
    obra_proprietario_cpf_cnpj: '',
    obra_argumentacao: '',
    obra_custo_medio: 0,
    anexos_kml: [],
    anexos_car_pdf: [],
    ...artInicial,
    anexos_kml: artInicial?.anexos_kml || [],
    anexos_car_pdf: artInicial?.anexos_car_pdf || [],
  });
  
  const [erros, setErros] = useState({
    contratante_cpf_cnpj: '',
    contratante_cep: '',
    obra_cep: '',
    obra_proprietario_cpf_cnpj: '',
  });
  
  const [buscandoCEPContratante, setBuscandoCEPContratante] = useState(false);
  const [buscandoCEPObra, setBuscandoCEPObra] = useState(false);
  
  const [contratantesSugeridos, setContratantesSugeridos] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [buscandoContratantes, setBuscandoContratantes] = useState(false);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (artInicial) {
      setDados(prev => ({
        ...prev,
        obra_area_ha_display: artInicial.obra_area_ha ? formatarArea(artInicial.obra_area_ha) : '',
        obra_matricula: artInicial.obra_matricula ? formatarMatricula(artInicial.obra_matricula) : '',
        anexos_kml: artInicial.anexos_kml || [],
        anexos_car_pdf: artInicial.anexos_car_pdf || [],
      }));
    }
  }, [artInicial]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setMostrarSugestoes(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field, value) => {
    setDados(prev => ({ ...prev, [field]: value }));
  };

  const buscarContratantes = async (busca) => {
    if (!busca || busca.length < 2) {
      setContratantesSugeridos([]);
      setMostrarSugestoes(false);
      return;
    }

    setBuscandoContratantes(true);
    try {
      const todosContratantes = await base44.entities.Contratante.list('-ultima_utilizacao');
      const filtrados = todosContratantes.filter(c => 
        c.nome?.toLowerCase().includes(busca.toLowerCase())
      ).slice(0, 5);
      
      setContratantesSugeridos(filtrados);
      setMostrarSugestoes(filtrados.length > 0);
    } catch (error) {
      console.error('Erro ao buscar contratantes:', error);
      setContratantesSugeridos([]);
    }
    setBuscandoContratantes(false);
  };

  const handleContratanteNomeChange = (value) => {
    handleInputChange('contratante_nome', value);
    buscarContratantes(value);
  };

  const selecionarContratante = (contratante) => {
    setDados(prev => ({
      ...prev,
      contratante_nome: contratante.nome || '',
      contratante_cpf_cnpj: contratante.cpf_cnpj || '',
      contratante_email: contratante.email || '',
      contratante_cep: contratante.cep || '',
      contratante_endereco: contratante.endereco || '',
      contratante_bairro: contratante.bairro || '',
      contratante_cidade: contratante.cidade || '',
      contratante_uf: contratante.uf || '',
    }));
    setMostrarSugestoes(false);
    setErros(prev => ({ ...prev, contratante_cpf_cnpj: '' }));
  };

  const salvarOuAtualizarContratante = async () => {
    if (!dados.contratante_nome) return;

    try {
      const todosContratantes = await base44.entities.Contratante.list();
      const contratanteExistente = todosContratantes.find(c => 
        c.nome?.toLowerCase() === dados.contratante_nome.toLowerCase() &&
        c.cpf_cnpj === dados.contratante_cpf_cnpj
      );

      const dadosContratante = {
        nome: dados.contratante_nome,
        cpf_cnpj: dados.contratante_cpf_cnpj,
        email: dados.contratante_email,
        cep: dados.contratante_cep,
        endereco: dados.contratante_endereco,
        bairro: dados.contratante_bairro,
        cidade: dados.contratante_cidade,
        uf: dados.contratante_uf,
        ultima_utilizacao: new Date().toISOString(),
      };

      if (contratanteExistente) {
        await base44.entities.Contratante.update(contratanteExistente.id, dadosContratante);
      } else {
        await base44.entities.Contratante.create(dadosContratante);
      }
    } catch (error) {
      console.error('Erro ao salvar contratante:', error);
    }
  };

  const handleNomeBlur = (field, value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleInputChange(field, nomeFormatado);
    if (field === 'contratante_nome') {
      setTimeout(() => setMostrarSugestoes(false), 200);
    }
  };

  const handleDocumentoBlur = (field, value) => {
    const digitos = (value || '').replace(/\D/g, '');
    let erro = '';
    let valorFinal = value;

    if (digitos.length === 11) {
      if (validarCPF(digitos)) {
        valorFinal = formatarCPF(digitos);
      } else {
        erro = 'CPF inválido.';
        valorFinal = digitos;
      }
    } else if (digitos.length === 14) {
      if (validarCNPJ(digitos)) {
        valorFinal = formatarCNPJ(digitos);
      } else {
        erro = 'CNPJ inválido.';
        valorFinal = digitos;
      }
    } else if (digitos.length > 0) {
      erro = 'Informe CPF (11 dígitos) ou CNPJ (14).';
      valorFinal = digitos;
    } else {
      valorFinal = '';
    }

    setDados(prev => ({...prev, [field]: valorFinal}));
    setErros(prev => ({...prev, [field]: erro}));
  };

  const handleMatriculaChange = (value) => {
    // Permitir apenas números, espaços e vírgulas
    const valorLimpo = value.replace(/[^\d\s,]/g, '');
    handleInputChange('obra_matricula', valorLimpo);
  };

  const handleMatriculaBlur = (value) => {
    const valorFormatado = formatarMultiplasMatriculas(value);
    handleInputChange('obra_matricula', valorFormatado);
  };

  const handleCEPContratanteBlur = async (value) => {
    const cepFormatado = formatarCEP(value);
    handleInputChange('contratante_cep', cepFormatado);
    
    const cepLimpo = value.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCEPContratante(true);
      const endereco = await buscarEnderecoPorCEP(cepLimpo);
      setBuscandoCEPContratante(false);
      
      if (endereco) {
        setDados(prev => ({
          ...prev,
          contratante_endereco: endereco.endereco,
          contratante_bairro: endereco.bairro,
          contratante_cidade: endereco.cidade,
          contratante_uf: endereco.uf,
        }));
        setErros(prev => ({ ...prev, contratante_cep: '' }));
      } else {
        setErros(prev => ({ ...prev, contratante_cep: 'CEP não encontrado.' }));
      }
    } else if (cepLimpo.length > 0) {
      setErros(prev => ({ ...prev, contratante_cep: 'CEP deve ter 8 dígitos.' }));
    }
  };

  const handleCEPObraBlur = async (value) => {
    const cepFormatado = formatarCEP(value);
    handleInputChange('obra_cep', cepFormatado);
    
    const cepLimpo = value.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCEPObra(true);
      const endereco = await buscarEnderecoPorCEP(cepLimpo);
      setBuscandoCEPObra(false);
      
      if (endereco) {
        setDados(prev => ({
          ...prev,
          obra_cidade: endereco.cidade,
          obra_uf: endereco.uf,
        }));
        setErros(prev => ({ ...prev, obra_cep: '' }));
      } else {
        setErros(prev => ({ ...prev, obra_cep: 'CEP não encontrado.' }));
      }
    } else if (cepLimpo.length > 0) {
      setErros(prev => ({ ...prev, obra_cep: 'CEP deve ter 8 dígitos.' }));
    }
  };

  const handleAreaBlur = (value) => {
    const areaNumerica = parsearArea(value);
    if (areaNumerica !== null) {
      const areaFormatada = formatarArea(areaNumerica);
      setDados(prev => ({
        ...prev,
        obra_area_ha: areaNumerica,
        obra_area_ha_display: areaFormatada
      }));
    } else {
      setDados(prev => ({
        ...prev,
        obra_area_ha: null,
        obra_area_ha_display: value
      }));
    }
  };

  useEffect(() => {
    if (dados.obra_cultura && dados.obra_area_ha && dados.obra_safra) {
      const novaArgumentacao = gerarArgumentacao(dados.obra_cultura, dados.obra_area_ha, dados.obra_safra);
      setDados(prev => ({ ...prev, obra_argumentacao: novaArgumentacao }));
    }
  }, [dados.obra_cultura, dados.obra_area_ha, dados.obra_safra]);

  useEffect(() => {
    if (dados.obra_area_ha) {
      const novoCusto = calcularCustoMedio(dados.obra_area_ha);
      setDados(prev => ({ ...prev, obra_custo_medio: novoCusto }));
    }
  }, [dados.obra_area_ha]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasErrors = Object.values(erros).some(error => error !== '');
    if (hasErrors) {
      alert('Por favor, corrija os erros antes de salvar.');
      return;
    }
    
    await salvarOuAtualizarContratante();
    onSalvar(dados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-green-900 border-b pb-2">Dados do Contratante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5 lg:col-span-2 relative" ref={autocompleteRef}>
            <Label htmlFor="contratante_nome" className="text-sm">Contratante *</Label>
            <Input
              id="contratante_nome"
              value={dados.contratante_nome}
              onChange={e => handleContratanteNomeChange(e.target.value)}
              onBlur={e => handleNomeBlur('contratante_nome', e.target.value)}
              onFocus={() => {
                if (dados.contratante_nome.length >= 2) {
                  buscarContratantes(dados.contratante_nome);
                }
              }}
              required
              placeholder="Nome completo"
              className="h-9"
              autoComplete="off"
            />
            {buscandoContratantes && (
              <p className="text-xs text-green-600">Buscando contratantes...</p>
            )}
            {mostrarSugestoes && contratantesSugeridos.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-green-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {contratantesSugeridos.map((contratante) => (
                  <button
                    key={contratante.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selecionarContratante(contratante)}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 border-b border-green-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-green-900">{contratante.nome}</div>
                    {contratante.cpf_cnpj && (
                      <div className="text-sm text-gray-600">{contratante.cpf_cnpj}</div>
                    )}
                    {contratante.cidade && contratante.uf && (
                      <div className="text-xs text-gray-500 mt-1">
                        {contratante.cidade}/{contratante.uf}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="contratante_cpf_cnpj" className="text-sm">CPF/CNPJ *</Label>
            <Input
              id="contratante_cpf_cnpj"
              value={dados.contratante_cpf_cnpj}
              onChange={e => handleInputChange('contratante_cpf_cnpj', e.target.value)}
              onBlur={e => handleDocumentoBlur('contratante_cpf_cnpj', e.target.value)}
              required
              placeholder="000.000.000-00"
              className="h-9"
            />
            {erros.contratante_cpf_cnpj && <p className="text-xs text-red-600">{erros.contratante_cpf_cnpj}</p>}
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="contratante_email" className="text-sm">E-mail</Label>
            <Input
              id="contratante_email"
              type="email"
              value={dados.contratante_email}
              onChange={e => handleInputChange('contratante_email', e.target.value)}
              placeholder="email@exemplo.com"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="contratante_cep" className="text-sm">CEP *</Label>
            <Input
              id="contratante_cep"
              value={dados.contratante_cep}
              onChange={e => handleInputChange('contratante_cep', e.target.value)}
              onBlur={e => handleCEPContratanteBlur(e.target.value)}
              required
              placeholder="00000-000"
              disabled={buscandoCEPContratante}
              className="h-9"
            />
            {buscandoCEPContratante && <p className="text-xs text-green-600">Buscando...</p>}
            {erros.contratante_cep && <p className="text-xs text-red-600">{erros.contratante_cep}</p>}
          </div>
          
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="contratante_endereco" className="text-sm">Endereço *</Label>
            <Input
              id="contratante_endereco"
              value={dados.contratante_endereco}
              onChange={e => handleInputChange('contratante_endereco', e.target.value)}
              required
              placeholder="Rua, número"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contratante_bairro" className="text-sm">Bairro *</Label>
            <Input
              id="contratante_bairro"
              value={dados.contratante_bairro}
              onChange={e => handleInputChange('contratante_bairro', e.target.value)}
              required
              placeholder="Bairro"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="contratante_cidade" className="text-sm">Cidade *</Label>
            <Input
              id="contratante_cidade"
              value={dados.contratante_cidade}
              onChange={e => handleInputChange('contratante_cidade', e.target.value)}
              required
              placeholder="Cidade"
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="contratante_uf" className="text-sm">UF *</Label>
            <Input
              id="contratante_uf"
              value={dados.contratante_uf}
              onChange={e => handleInputChange('contratante_uf', e.target.value.toUpperCase())}
              required
              placeholder="GO"
              maxLength={2}
              className="h-9"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-green-900 border-b pb-2">Dados da Obra/Serviço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="obra_cep" className="text-sm">CEP *</Label>
            <Input
              id="obra_cep"
              value={dados.obra_cep}
              onChange={e => handleInputChange('obra_cep', e.target.value)}
              onBlur={e => handleCEPObraBlur(e.target.value)}
              required
              placeholder="00000-000"
              disabled={buscandoCEPObra}
              className="h-9"
            />
            {buscandoCEPObra && <p className="text-xs text-green-600">Buscando...</p>}
            {erros.obra_cep && <p className="text-xs text-red-600">{erros.obra_cep}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_cidade" className="text-sm">Cidade *</Label>
            <Input
              id="obra_cidade"
              value={dados.obra_cidade}
              onChange={e => handleInputChange('obra_cidade', e.target.value)}
              required
              placeholder="Cidade"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_uf" className="text-sm">UF *</Label>
            <Input
              id="obra_uf"
              value={dados.obra_uf}
              onChange={e => handleInputChange('obra_uf', e.target.value.toUpperCase())}
              required
              placeholder="GO"
              maxLength={2}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_imovel" className="text-sm">Imóvel *</Label>
            <Input
              id="obra_imovel"
              value={dados.obra_imovel}
              onChange={e => handleInputChange('obra_imovel', e.target.value)}
              required
              placeholder="Nome do imóvel"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_matricula" className="text-sm">Matrícula nº</Label>
            <Input
              id="obra_matricula"
              value={dados.obra_matricula}
              onChange={e => handleMatriculaChange(e.target.value)}
              onBlur={e => handleMatriculaBlur(e.target.value)}
              placeholder="Ex: 2560, 21250, 7890"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="obra_car" className="text-sm">CAR nº</Label>
            <Input
              id="obra_car"
              value={dados.obra_car}
              onChange={e => handleInputChange('obra_car', e.target.value)}
              placeholder="GO-XXXXXXXX-XXXXXXXX"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_latitude" className="text-sm">Latitude</Label>
            <Input
              id="obra_latitude"
              value={dados.obra_latitude}
              onChange={e => handleInputChange('obra_latitude', e.target.value)}
              placeholder="-17.798641"
              type="number"
              step="any"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_longitude" className="text-sm">Longitude</Label>
            <Input
              id="obra_longitude"
              value={dados.obra_longitude}
              onChange={e => handleInputChange('obra_longitude', e.target.value)}
              placeholder="-49.637768"
              type="number"
              step="any"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_area_ha" className="text-sm">Área Cultivada (ha) *</Label>
            <Input
              id="obra_area_ha"
              value={dados.obra_area_ha_display || ''}
              onChange={e => handleInputChange('obra_area_ha_display', e.target.value)}
              onBlur={e => handleAreaBlur(e.target.value)}
              required
              placeholder="125,36"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="obra_cultura" className="text-sm">Cultura *</Label>
            <Select 
              value={dados.obra_cultura} 
              onValueChange={v => handleInputChange('obra_cultura', v)}
              required
            >
              <SelectTrigger id="obra_cultura" className="h-9">
                <SelectValue placeholder="Selecione a cultura" />
              </SelectTrigger>
              <SelectContent>
                {CULTURAS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_safra" className="text-sm">Safra *</Label>
            <Input
              id="obra_safra"
              value={dados.obra_safra}
              onChange={e => handleInputChange('obra_safra', e.target.value)}
              required
              placeholder="2025/2026"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_custo_medio" className="text-sm">Custo Médio (R$)</Label>
            <Input
              id="obra_custo_medio"
              value={dados.obra_custo_medio ? dados.obra_custo_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
              disabled
              className="h-9 bg-gray-50 text-gray-700 font-semibold"
            />
          </div>
          
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="obra_proprietario_nome" className="text-sm">Nome do Proprietário</Label>
            <Input
              id="obra_proprietario_nome"
              value={dados.obra_proprietario_nome || ''}
              onChange={e => handleInputChange('obra_proprietario_nome', e.target.value)}
              onBlur={e => handleNomeBlur('obra_proprietario_nome', e.target.value)}
              placeholder="Nome completo do proprietário"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obra_proprietario_cpf_cnpj" className="text-sm">CPF/CNPJ do Proprietário</Label>
            <Input
              id="obra_proprietario_cpf_cnpj"
              value={dados.obra_proprietario_cpf_cnpj || ''}
              onChange={e => handleInputChange('obra_proprietario_cpf_cnpj', e.target.value)}
              onBlur={e => handleDocumentoBlur('obra_proprietario_cpf_cnpj', e.target.value)}
              placeholder="000.000.000-00"
              className="h-9"
            />
            {erros.obra_proprietario_cpf_cnpj && <p className="text-xs text-red-600">{erros.obra_proprietario_cpf_cnpj}</p>}
          </div>

          <div className="space-y-1.5 lg:col-span-4">
            <Label htmlFor="obra_argumentacao" className="text-sm">Argumentação</Label>
            <Textarea
              id="obra_argumentacao"
              value={dados.obra_argumentacao}
              onChange={e => handleInputChange('obra_argumentacao', e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="A argumentação será gerada automaticamente..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700">Anexos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiAnexoUpload
            label="Área Cultivada (KML/KMZ)"
            accept=".kml,.kmz"
            currentFiles={dados.anexos_kml}
            onFilesChange={(files) => handleInputChange('anexos_kml', files)}
            icon={Map}
          />
          <MultiAnexoUpload
            label="CAR (PDF)"
            accept=".pdf"
            currentFiles={dados.anexos_car_pdf}
            onFilesChange={(files) => handleInputChange('anexos_car_pdf', files)}
            icon={FileText}
          />
        </div>
      </div>
      
      <div className="flex gap-3 justify-end pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          <FileSignature className="w-4 h-4 mr-2" />
          {artInicial ? 'Atualizar ART' : 'Salvar ART'}
        </Button>
      </div>
    </form>
  );
};

// Componente Nível 3: Detalhes da Cultura com ARTs individuais
const CulturaDetalhes = ({ cultura, arts, onEditarART, onExcluirART, getCulturaLabel }) => {
  const [expandido, setExpandido] = useState(false);

  const areaTotal = arts.reduce((sum, art) => sum + (parseFloat(art.obra_area_ha) || 0), 0);
  const custoTotal = arts.reduce((sum, art) => sum + (parseFloat(art.obra_custo_medio) || 0), 0);
  const totalKML = arts.reduce((sum, art) => sum + (art.anexos_kml?.length || 0), 0);
  const totalPDF = arts.reduce((sum, art) => sum + (art.anexos_car_pdf?.length || 0), 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-amber-50/30 transition-colors flex items-center gap-3"
        onClick={() => setExpandido(!expandido)}
      >
        <button className="flex-shrink-0 text-amber-600">
          {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">🌾</span>
            <div>
              <h4 className="font-semibold text-gray-800">{getCulturaLabel(cultura)}</h4>
              <p className="text-xs text-gray-500">{arts.length} imóvel(is)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-gray-500 text-xs">Área Total</p>
              <p className="font-medium text-gray-800">{formatarArea(areaTotal)} ha</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Custo Total</p>
              <p className="font-semibold text-emerald-700">R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            {(totalKML > 0 || totalPDF > 0) && (
              <div className="flex gap-1.5">
                {totalKML > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-100 rounded text-xs text-sky-600">
                    <Map className="w-3 h-3" />
                    {totalKML}
                  </div>
                )}
                {totalPDF > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-xs text-rose-600">
                    <FileText className="w-3 h-3" />
                    {totalPDF}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-200 bg-gray-50/50 p-3 space-y-2">
          {arts.map((art, index) => (
            <div key={art.id} className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex flex-col lg:flex-row justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    <h5 className="font-semibold text-gray-800 text-sm">{art.obra_imovel}</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    {art.obra_matricula && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Matrícula:</span>
                        <span className="font-medium text-gray-800">{art.obra_matricula}</span>
                      </div>
                    )}
                    {art.obra_car && (
                      <div className="flex items-center gap-1 lg:col-span-2">
                        <span className="text-gray-500">CAR:</span>
                        <span className="font-medium text-gray-800 truncate">{art.obra_car}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Área:</span>
                      <span className="font-medium text-gray-800">{formatarArea(art.obra_area_ha)} ha</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Custo:</span>
                      <span className="font-semibold text-emerald-700">
                        R$ {art.obra_custo_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Local:</span>
                      <span className="font-medium text-gray-800">{art.obra_cidade}/{art.obra_uf}</span>
                    </div>
                    {art.obra_proprietario_nome && (
                      <div className="flex items-center gap-1 md:col-span-2 lg:col-span-3">
                        <span className="text-gray-500">Proprietário:</span>
                        <span className="font-medium text-gray-800">{art.obra_proprietario_nome}</span>
                        {art.obra_proprietario_cpf_cnpj && (
                          <span className="text-gray-400">({art.obra_proprietario_cpf_cnpj})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {(art.anexos_kml?.length > 0 || art.anexos_car_pdf?.length > 0) && (
                    <div className="flex gap-1.5 pt-1">
                      {art.anexos_kml?.length > 0 && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 border border-sky-100 rounded text-xs text-sky-600">
                          <Map className="w-3 h-3" />
                          {art.anexos_kml.length}
                        </div>
                      )}
                      {art.anexos_car_pdf?.length > 0 && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-xs text-rose-600">
                          <FileText className="w-3 h-3" />
                          {art.anexos_car_pdf.length}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex lg:flex-col gap-2 lg:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditarART(art)}
                    className="flex-1 lg:flex-none h-8 px-2 text-xs border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExcluirART(art.id)}
                    className="flex-1 lg:flex-none h-8 px-2 text-xs border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente Nível 2: Safra com culturas aninhadas
const SafraCard = ({ safra, culturas, onEditarART, onExcluirART, getCulturaLabel }) => {
  const [expandido, setExpandido] = useState(false);

  const todasArts = Object.values(culturas).flat();
  const areaTotal = todasArts.reduce((sum, art) => sum + (parseFloat(art.obra_area_ha) || 0), 0);
  const custoTotal = todasArts.reduce((sum, art) => sum + (parseFloat(art.obra_custo_medio) || 0), 0);

  return (
    <div className="bg-blue-50/30 rounded-lg border border-blue-200 overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-blue-50/50 transition-colors flex items-center gap-3"
        onClick={() => setExpandido(!expandido)}
      >
        <button className="flex-shrink-0 text-blue-600">
          {expandido ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        
        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{safra}</h3>
              <p className="text-xs text-gray-500">{Object.keys(culturas).length} cultura(s) • {todasArts.length} imóvel(is)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-gray-500 text-xs">Área Total</p>
              <p className="font-medium text-gray-800">{formatarArea(areaTotal)} ha</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Custo Total</p>
              <p className="font-semibold text-emerald-700">R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-blue-200 bg-white/50 p-3 space-y-3">
          {Object.entries(culturas).sort(([a], [b]) => a.localeCompare(b)).map(([cultura, arts]) => (
            <CulturaDetalhes
              key={cultura}
              cultura={cultura}
              arts={arts}
              onEditarART={onEditarART}
              onExcluirART={onExcluirART}
              getCulturaLabel={getCulturaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente Nível 1: Cliente com safras aninhadas
const ClienteCard = ({ cliente, safras, onEditarART, onExcluirART, getCulturaLabel }) => {
  const [expandido, setExpandido] = useState(false);

  const todasArts = Object.values(safras).flatMap(culturas => Object.values(culturas).flat());
  const areaTotal = todasArts.reduce((sum, art) => sum + (parseFloat(art.obra_area_ha) || 0), 0);
  const custoTotal = todasArts.reduce((sum, art) => sum + (parseFloat(art.obra_custo_medio) || 0), 0);
  const totalKML = todasArts.reduce((sum, art) => sum + (art.anexos_kml?.length || 0), 0);
  const totalPDF = todasArts.reduce((sum, art) => sum + (art.anexos_car_pdf?.length || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div 
        className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-start gap-4">
          <div className="w-1 h-20 rounded-full bg-emerald-500 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-bold text-gray-800 truncate">{cliente}</h2>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2 py-0.5 font-medium">
                {todasArts.length} ART{todasArts.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs font-bold">📅</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Safras</p>
                  <p className="font-medium text-gray-700">{Object.keys(safras).length}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 text-xs font-bold">🌾</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Culturas</p>
                  <p className="font-medium text-gray-700">{Object.values(safras).reduce((sum, c) => sum + Object.keys(c).length, 0)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-xs font-bold">📐</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Área Total</p>
                  <p className="font-medium text-gray-700">{formatarArea(areaTotal)} ha</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 text-xs font-bold">💰</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Custo Total</p>
                  <p className="font-semibold text-emerald-700">R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {(totalKML > 0 || totalPDF > 0) && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                {totalKML > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-700 font-medium">
                    <Map className="w-3.5 h-3.5" />
                    {totalKML} KML
                  </div>
                )}
                {totalPDF > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    {totalPDF} PDF
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpandido(!expandido);
            }}
          >
            {expandido ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-gray-50/30 p-4 space-y-3">
          {Object.entries(safras).sort(([a], [b]) => b.localeCompare(a)).map(([safra, culturas]) => (
            <SafraCard
              key={safra}
              safra={safra}
              culturas={culturas}
              onEditarART={onEditarART}
              onExcluirART={onExcluirART}
              getCulturaLabel={getCulturaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ElaboracaoARTs() {
  const [arts, setArts] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [artEditando, setArtEditando] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarARTs();
  }, []);

  const carregarARTs = async () => {
    setCarregando(true);
    try {
      const data = await base44.entities.ElaboracaoART.list('-created_date');
      console.log('✅ ARTs carregadas do banco:', data.length);
      setArts(data);
    } catch (error) {
      console.error('❌ Erro ao carregar ARTs:', error);
      setArts([]);
      setMensagem('Erro ao carregar ARTs. Por favor, tente novamente.');
      setTimeout(() => setMensagem(''), 5000);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarART = async (dados) => {
    try {
      if (artEditando) {
        await base44.entities.ElaboracaoART.update(artEditando.id, dados);
        setMensagem('ART atualizada com sucesso!');
      } else {
        await base44.entities.ElaboracaoART.create(dados);
        setMensagem('ART cadastrada com sucesso!');
      }
      
      await carregarARTs();
      setMostrarFormulario(false);
      setArtEditando(null);
      setTimeout(() => setMensagem(''), 3000);
    } catch (error) {
      console.error('❌ Erro ao salvar ART:', error);
      alert('Erro ao salvar ART. Tente novamente.');
      setMensagem('Erro ao salvar ART. Por favor, tente novamente.');
      setTimeout(() => setMensagem(''), 5000);
    }
  };

  const handleEditarART = (art) => {
    setArtEditando(art);
    setMostrarFormulario(true);
  };

  const handleExcluirART = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta ART?')) {
      try {
        await base44.entities.ElaboracaoART.delete(id);
        await carregarARTs();
        setMensagem('ART excluída com sucesso!');
        setTimeout(() => setMensagem(''), 3000);
      } catch (error) {
        console.error('❌ Erro ao excluir ART:', error);
        alert('Erro ao excluir ART. Tente novamente.');
        setMensagem('Erro ao excluir ART. Por favor, tente novamente.');
        setTimeout(() => setMensagem(''), 5000);
      }
    }
  };

  const handleNovaART = () => {
    setArtEditando(null);
    setMostrarFormulario(true);
  };

  const artsFiltradas = arts.filter(a => {
    if (!filtro) return true;
    
    const busca = filtro.toLowerCase();
    return (
      a.contratante_nome?.toLowerCase().includes(busca) ||
      a.contratante_cpf_cnpj?.includes(busca) ||
      a.obra_imovel?.toLowerCase().includes(busca) ||
      a.obra_car?.toLowerCase().includes(busca) ||
      a.obra_matricula?.includes(busca) ||
      a.obra_proprietario_nome?.toLowerCase().includes(busca) ||
      a.obra_proprietario_cpf_cnpj?.includes(busca)
    );
  });

  // Agrupamento hierárquico: Cliente → Safra → Cultura
  const hierarquia = artsFiltradas.reduce((grupos, art) => {
    const cliente = art.contratante_nome;
    const safra = art.obra_safra;
    const cultura = art.obra_cultura;
    
    if (!grupos[cliente]) {
      grupos[cliente] = {};
    }
    if (!grupos[cliente][safra]) {
      grupos[cliente][safra] = {};
    }
    if (!grupos[cliente][safra][cultura]) {
      grupos[cliente][safra][cultura] = [];
    }
    
    grupos[cliente][safra][cultura].push(art);
    return grupos;
  }, {});

  // Ordenar clientes alfabeticamente
  const clientesOrdenados = Object.keys(hierarquia).sort((a, b) => a.localeCompare(b));

  const getCulturaLabel = (value) => {
    return CULTURAS_OPTIONS.find(c => c.value === value)?.label || value;
  };

  if (carregando) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Carregando ARTs...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header moderno */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <FileSignature className="w-5 h-5 text-emerald-600" />
              </div>
              Elaboração de ARTs
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {clientesOrdenados.length} cliente(s) • {arts.length} ART(s) total
            </p>
          </div>
          {!mostrarFormulario && (
            <Button 
              onClick={handleNovaART}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm h-10 px-5 rounded-lg w-full md:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova ART
            </Button>
          )}
        </div>

        {mensagem && (
          <Alert className="mb-5 bg-emerald-50 border-emerald-200 rounded-xl">
            <AlertDescription className="text-emerald-800">
              {mensagem}
            </AlertDescription>
          </Alert>
        )}

        {mostrarFormulario ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                {artEditando ? 'Editar ART' : 'Nova ART'}
              </h2>
            </div>
            <div className="p-6">
              <FormularioART
                artInicial={artEditando}
                onSalvar={handleSalvarART}
                onCancelar={() => {
                  setMostrarFormulario(false);
                  setArtEditando(null);
                }}
              />
            </div>
          </div>
        ) : (
          <>
            {arts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por contratante, CPF/CNPJ, imóvel, proprietário, matrícula ou CAR..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10 h-10 border-gray-200 focus:border-emerald-500 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            {arts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileSignature className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Nenhuma ART cadastrada
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Comece cadastrando sua primeira ART
                </p>
                <Button 
                  onClick={handleNovaART}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeira ART
                </Button>
              </div>
            ) : clientesOrdenados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Nenhuma ART encontrada
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Tente outro termo de busca
                </p>
                <Button 
                  onClick={() => setFiltro('')}
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Limpar Busca
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {clientesOrdenados.map((cliente) => (
                  <ClienteCard
                    key={cliente}
                    cliente={cliente}
                    safras={hierarquia[cliente]}
                    onEditarART={handleEditarART}
                    onExcluirART={handleExcluirART}
                    getCulturaLabel={getCulturaLabel}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}