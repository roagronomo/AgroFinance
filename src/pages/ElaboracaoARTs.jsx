
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Trash2, FileSignature, FileText, Map, Upload, X } from "lucide-react";
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

// Função para formatar CEP
const formatarCEP = (valor) => {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5, 8)}`;
};

// Função para formatar Matrícula (adiciona pontos de milhar)
const formatarMatricula = (valor) => {
  // Remove tudo que não for dígito
  const digitos = String(valor).replace(/\D/g, '');
  
  // Se não tiver dígitos, retorna vazio
  if (!digitos) return '';
  
  // Converte para número e formata com separador de milhar
  // Usar Intl.NumberFormat para formatação mais robusta e evitar problemas com números grandes
  const numero = parseInt(digitos, 10);
  if (isNaN(numero)) return '';
  
  return new Intl.NumberFormat('pt-BR').format(numero);
};

// Função para formatar área (ex: 125.36 → 125,36 ou 25 → 25,00)
const formatarArea = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = parseFloat(valor);
  if (isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Função para parsear área formatada de volta para número
const parsearArea = (valorFormatado) => {
  if (!valorFormatado) return null;
  const valorLimpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? null : numero;
};

// Função para calcular custo médio
const calcularCustoMedio = (areaHa) => {
  if (!areaHa || areaHa <= 0) return 0;
  const calculo = areaHa * 56;
  return calculo < 15000 ? 103.03 : 271.47;
};

// Função para gerar argumentação automática
const gerarArgumentacao = (cultura, area, safra) => {
  if (!cultura || !area || !safra) return '';
  
  const culturaLabel = CULTURAS_OPTIONS.find(c => c.value === cultura)?.label || cultura;
  const areaFormatada = formatarArea(area);
  
  return `Atuação na assistência técnica, plantio e condução da lavoura de ${culturaLabel} com área de ${areaFormatada} ha na safra ${safra}.`;
};

// Função para buscar endereço via CEP usando ViaCEP
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

// Componente para upload de arquivo único
const AnexoUpload = ({ label, accept, currentFile, onFileChange, icon: Icon }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Tamanho máximo: 20MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    
    // Simular upload (em produção, fazer upload real)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file), // Em produção, usar URL real do servidor
    };
    
    onFileChange(fileData);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = () => {
    if (window.confirm(`Remover arquivo "${currentFile?.name}"?`)) {
      onFileChange(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-700 flex items-center gap-2 font-medium">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </Label>

      {currentFile ? (
        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded border">
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(currentFile.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-800 flex-shrink-0"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <label htmlFor={`file-${label}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => document.getElementById(`file-${label}`).click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Enviando...' : 'Selecionar'}
            </Button>
          </label>
          <span className="text-sm text-gray-400 italic">Nenhum arquivo selecionado</span>
        </div>
      )}

      <input
        id={`file-${label}`}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

const FormularioART = ({ artInicial = null, onSalvar, onCancelar }) => {
  const [dados, setDados] = useState({
    // Dados do Contratante
    contratante_nome: '',
    contratante_cpf_cnpj: '',
    contratante_email: '',
    contratante_cep: '',
    contratante_endereco: '',
    contratante_bairro: '',
    contratante_cidade: '',
    contratante_uf: '',
    // Dados da Obra/Serviço
    obra_cep: '',
    obra_cidade: '',
    obra_uf: '',
    obra_imovel: '',
    obra_matricula: '', // Novo campo para matrícula
    obra_car: '',
    obra_latitude: '',
    obra_longitude: '',
    obra_area_ha: '',
    obra_area_ha_display: '', // Para controlar o display
    obra_cultura: '',
    obra_safra: '',
    obra_argumentacao: '',
    obra_custo_medio: 0,
    // Anexos
    anexo_kml: null,
    anexo_car_pdf: null,
    ...artInicial,
  });
  
  const [erros, setErros] = useState({
    contratante_cpf_cnpj: '',
    contratante_cep: '',
    obra_cep: '',
  });
  
  const [buscandoCEPContratante, setBuscandoCEPContratante] = useState(false);
  const [buscandoCEPObra, setBuscandoCEPObra] = useState(false);
  
  // Estados para autocomplete de contratante
  const [contratantesSugeridos, setContratantesSugeridos] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [buscandoContratantes, setBuscandoContratantes] = useState(false);
  const autocompleteRef = useRef(null);

  // Inicializar display da área e matrícula quando artInicial é carregado
  useEffect(() => {
    if (artInicial) {
      setDados(prev => ({
        ...prev,
        obra_area_ha_display: artInicial.obra_area_ha ? formatarArea(artInicial.obra_area_ha) : '',
        obra_matricula: artInicial.obra_matricula ? formatarMatricula(artInicial.obra_matricula) : ''
      }));
    }
  }, [artInicial]);

  // Fechar sugestões ao clicar fora do componente de autocomplete
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
      // Assuming base44.entities.Contratante exists and has a list method
      const todosContratantes = await base44.entities.Contratante.list('-ultima_utilizacao'); // Order by last used date
      const filtrados = todosContratantes.filter(c => 
        c.nome?.toLowerCase().includes(busca.toLowerCase())
      ).slice(0, 5); // Limit to top 5 suggestions
      
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
    setErros(prev => ({ ...prev, contratante_cpf_cnpj: '' })); // Clear CPF/CNPJ error if populated by autocomplete
  };

  const salvarOuAtualizarContratante = async () => {
    if (!dados.contratante_nome) return; // Only save if a name is provided

    try {
      // Fetch all contractors to check for existing one by name and document
      const todosContratantes = await base44.entities.Contratante.list();
      const contratanteExistente = todosContratantes.find(c => 
        c.nome?.toLowerCase() === dados.contratante_nome.toLowerCase() &&
        c.cpf_cnpj === dados.contratante_cpf_cnpj // Check by CPF/CNPJ too for better accuracy
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
        ultima_utilizacao: new Date().toISOString(), // Mark as recently used
      };

      if (contratanteExistente) {
        // Update existing contractor
        await base44.entities.Contratante.update(contratanteExistente.id, dadosContratante);
        console.log('Contratante atualizado:', contratanteExistente.id);
      } else {
        // Create new contractor
        await base44.entities.Contratante.create(dadosContratante);
        console.log('Novo contratante criado:', dados.contratante_nome);
      }
    } catch (error) {
      console.error('Erro ao salvar ou atualizar contratante:', error);
      // Optionally handle this error, but don't block ART saving
    }
  };

  const handleNomeBlur = (value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleInputChange('contratante_nome', nomeFormatado);
    // Delay hiding suggestions to allow click events on suggestions to register
    setTimeout(() => setMostrarSugestoes(false), 200);
  };

  const handleDocumentoBlur = (value) => {
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

    setDados(prev => ({...prev, contratante_cpf_cnpj: valorFinal}));
    setErros(prev => ({...prev, contratante_cpf_cnpj: erro}));
  };

  const handleMatriculaBlur = (value) => {
    const valorFormatado = formatarMatricula(value);
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
      // Se não conseguiu parsear, mantém o valor digitado
      setDados(prev => ({
        ...prev,
        obra_area_ha: null,
        obra_area_ha_display: value
      }));
    }
  };

  // Recalcular argumentação e custo quando cultura, área ou safra mudarem
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
      {/* Dados do Contratante */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-green-900 border-b pb-2">Dados do Contratante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5 lg:col-span-2 relative" ref={autocompleteRef}>
            <Label htmlFor="contratante_nome" className="text-sm">Contratante *</Label>
            <Input
              id="contratante_nome"
              value={dados.contratante_nome}
              onChange={e => handleContratanteNomeChange(e.target.value)}
              onBlur={e => handleNomeBlur(e.target.value)}
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
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur from closing before click
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
              onBlur={e => handleDocumentoBlur(e.target.value)}
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

      {/* Dados da Obra/Serviço */}
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
              onChange={e => handleInputChange('obra_matricula', e.target.value)}
              onBlur={e => handleMatriculaBlur(e.target.value)}
              placeholder="Ex: 2.563"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
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
              onChange={e => {
                // Permite digitar livremente (com ponto ou vírgula)
                handleInputChange('obra_area_ha_display', e.target.value);
              }}
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

      {/* Anexos */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700">Anexos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnexoUpload
            label="Área Cultivada (KML/KMZ)"
            accept=".kml,.kmz"
            currentFile={dados.anexo_kml}
            onFileChange={(file) => handleInputChange('anexo_kml', file)}
            icon={Map}
          />
          <AnexoUpload
            label="CAR (PDF)"
            accept=".pdf"
            currentFile={dados.anexo_car_pdf}
            onFileChange={(file) => handleInputChange('anexo_car_pdf', file)}
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
      // Fetch ARTs from base44 backend
      const data = await base44.entities.ElaboracaoART.list('-created_date'); // Order by creation date descending
      console.log('✅ ARTs carregadas do banco:', data.length);
      setArts(data);
    } catch (error) {
      console.error('❌ Erro ao carregar ARTs:', error);
      setArts([]);
      // Optionally set an error message to display to the user
      setMensagem('Erro ao carregar ARTs. Por favor, tente novamente.');
      setTimeout(() => setMensagem(''), 5000);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarART = async (dados) => {
    try {
      if (artEditando) {
        // Update existing ART
        await base44.entities.ElaboracaoART.update(artEditando.id, dados);
        setMensagem('ART atualizada com sucesso!');
      } else {
        // Create new ART
        await base44.entities.ElaboracaoART.create(dados);
        setMensagem('ART cadastrada com sucesso!');
      }
      
      // Refresh the list after saving
      await carregarARTs();
      setMostrarFormulario(false);
      setArtEditando(null);
      setTimeout(() => setMensagem(''), 3000);
    } catch (error) {
      console.error('❌ Erro ao salvar ART:', error);
      alert('Erro ao salvar ART. Tente novamente.');
      // Optionally set an error message to display to the user
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
        // Delete ART
        await base44.entities.ElaboracaoART.delete(id);
        // Refresh the list after deleting
        await carregarARTs();
        setMensagem('ART excluída com sucesso!');
        setTimeout(() => setMensagem(''), 3000);
      } catch (error) {
        console.error('❌ Erro ao excluir ART:', error);
        alert('Erro ao excluir ART. Tente novamente.');
        // Optionally set an error message to display to the user
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
      a.obra_matricula?.includes(busca) // Inclui busca por matrícula
    );
  });

  const getCulturaLabel = (value) => {
    return CULTURAS_OPTIONS.find(c => c.value === value)?.label || value;
  };

  if (carregando) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-600">Carregando ARTs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-900 flex items-center gap-3">
              <FileSignature className="w-8 h-8" />
              Elaboração de ARTs
            </h1>
            <p className="text-green-600 mt-1">
              Cadastro completo para elaboração de ARTs
            </p>
          </div>
          {!mostrarFormulario && (
            <Button 
              onClick={handleNovaART}
              className="bg-green-600 hover:bg-green-700 shadow-lg w-full md:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova ART
            </Button>
          )}
        </div>

        {mensagem && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              {mensagem}
            </AlertDescription>
          </Alert>
        )}

        {mostrarFormulario ? (
          <Card className="shadow-xl border-green-100">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileSignature className="w-6 h-6" />
                {artEditando ? 'Editar ART' : 'Nova ART'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FormularioART
                artInicial={artEditando}
                onSalvar={handleSalvarART}
                onCancelar={() => {
                  setMostrarFormulario(false);
                  setArtEditando(null);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {arts.length > 0 && (
              <Card className="mb-6 shadow-lg border-green-100">
                <CardContent className="p-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                    <Input
                      placeholder="Buscar por contratante, CPF/CNPJ, imóvel, matrícula ou CAR..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className="pl-10 border-green-200 focus:border-green-500"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {arts.length === 0 ? (
              <Card className="shadow-lg border-green-100">
                <CardContent className="p-12 text-center">
                  <FileSignature className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Nenhuma ART cadastrada
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Comece cadastrando sua primeira ART
                  </p>
                  <Button 
                    onClick={handleNovaART}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Cadastrar Primeira ART
                  </Button>
                </CardContent>
              </Card>
            ) : artsFiltradas.length === 0 ? (
              <Card className="shadow-lg border-green-100">
                <CardContent className="p-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Nenhuma ART encontrada
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Tente outro termo de busca
                  </p>
                  <Button 
                    onClick={() => setFiltro('')}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    Limpar Busca
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {artsFiltradas.map((art) => (
                  <Card key={art.id} className="shadow-lg border-green-100 hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-xl font-bold text-green-900 mb-1">
                              {art.contratante_nome}
                            </h3>
                            <p className="text-sm text-gray-600">{art.contratante_cpf_cnpj}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="font-semibold text-gray-700">Imóvel:</span>
                              <span className="ml-2 text-gray-600">{art.obra_imovel}</span>
                            </div>
                            {art.obra_matricula && (
                              <div>
                                <span className="font-semibold text-gray-700">Matrícula:</span>
                                <span className="ml-2 text-gray-600">{formatarMatricula(art.obra_matricula)}</span>
                              </div>
                            )}
                            {art.obra_car && (
                              <div>
                                <span className="font-semibold text-gray-700">CAR:</span>
                                <span className="ml-2 text-gray-600">{art.obra_car}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-gray-700">Cultura:</span>
                              <span className="ml-2 text-gray-600">{getCulturaLabel(art.obra_cultura)}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Área:</span>
                              <span className="ml-2 text-gray-600">{formatarArea(art.obra_area_ha)} ha</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Safra:</span>
                              <span className="ml-2 text-gray-600">{art.obra_safra}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Custo:</span>
                              <span className="ml-2 text-green-700 font-semibold">
                                R$ {art.obra_custo_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-semibold text-gray-700">Localização:</span>
                              <span className="ml-2 text-gray-600">
                                {art.obra_cidade}/{art.obra_uf}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex lg:flex-col gap-2 lg:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarART(art)}
                            className="flex-1 lg:flex-none border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExcluirART(art.id)}
                            className="flex-1 lg:flex-none border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
