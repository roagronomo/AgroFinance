import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, FileSignature } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatarNomeProprio, validarCPF, validarCNPJ, formatarCPF, formatarCNPJ } from '@/components/lib/formatters';

// Função para formatar CEP
const formatarCEP = (valor) => {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5, 8)}`;
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

const FormularioContratante = ({ contratanteInicial = null, onSalvar, onCancelar }) => {
  const [dados, setDados] = useState({
    nome: '',
    cpf_cnpj: '',
    cep: '',
    endereco: '',
    cidade: '',
    uf: '',
    ...contratanteInicial,
  });
  
  const [erros, setErros] = useState({
    cpf_cnpj: '',
    cep: '',
  });
  
  const [buscandoCEP, setBuscandoCEP] = useState(false);

  const handleInputChange = (field, value) => {
    setDados(prev => ({ ...prev, [field]: value }));
  };

  const handleNomeBlur = (value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleInputChange('nome', nomeFormatado);
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

    setDados(prev => ({...prev, cpf_cnpj: valorFinal}));
    setErros(prev => ({...prev, cpf_cnpj: erro}));
  };

  const handleCEPBlur = async (value) => {
    const cepFormatado = formatarCEP(value);
    handleInputChange('cep', cepFormatado);
    
    const cepLimpo = value.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCEP(true);
      const endereco = await buscarEnderecoPorCEP(cepLimpo);
      setBuscandoCEP(false);
      
      if (endereco) {
        setDados(prev => ({
          ...prev,
          endereco: endereco.endereco,
          cidade: endereco.cidade,
          uf: endereco.uf,
        }));
        setErros(prev => ({ ...prev, cep: '' }));
      } else {
        setErros(prev => ({ ...prev, cep: 'CEP não encontrado.' }));
      }
    } else if (cepLimpo.length > 0) {
      setErros(prev => ({ ...prev, cep: 'CEP deve ter 8 dígitos.' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasErrors = Object.values(erros).some(error => error !== '');
    if (hasErrors) {
      alert('Por favor, corrija os erros antes de salvar.');
      return;
    }
    onSalvar(dados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Contratante *</Label>
          <Input
            id="nome"
            value={dados.nome}
            onChange={e => handleInputChange('nome', e.target.value)}
            onBlur={e => handleNomeBlur(e.target.value)}
            required
            placeholder="Nome completo"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cpf_cnpj">CPF/CNPJ *</Label>
          <Input
            id="cpf_cnpj"
            value={dados.cpf_cnpj}
            onChange={e => handleInputChange('cpf_cnpj', e.target.value)}
            onBlur={e => handleDocumentoBlur(e.target.value)}
            required
            placeholder="000.000.000-00"
          />
          {erros.cpf_cnpj && <p className="text-sm text-red-600">{erros.cpf_cnpj}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cep">CEP *</Label>
          <Input
            id="cep"
            value={dados.cep}
            onChange={e => handleInputChange('cep', e.target.value)}
            onBlur={e => handleCEPBlur(e.target.value)}
            required
            placeholder="00000-000"
            disabled={buscandoCEP}
          />
          {buscandoCEP && <p className="text-sm text-green-600">Buscando endereço...</p>}
          {erros.cep && <p className="text-sm text-red-600">{erros.cep}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço *</Label>
          <Input
            id="endereco"
            value={dados.endereco}
            onChange={e => handleInputChange('endereco', e.target.value)}
            required
            placeholder="Rua, número"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade *</Label>
          <Input
            id="cidade"
            value={dados.cidade}
            onChange={e => handleInputChange('cidade', e.target.value)}
            required
            placeholder="Cidade"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="uf">UF *</Label>
          <Input
            id="uf"
            value={dados.uf}
            onChange={e => handleInputChange('uf', e.target.value.toUpperCase())}
            required
            placeholder="GO"
            maxLength={2}
          />
        </div>
      </div>
      
      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          Salvar Contratante
        </Button>
      </div>
    </form>
  );
};

export default function ElaboracaoARTs() {
  const [contratantes, setContratantes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contratanteEditando, setContratanteEditando] = useState(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    // Carregar dados do localStorage
    const dados = localStorage.getItem('elaboracao_arts_contratantes');
    if (dados) {
      setContratantes(JSON.parse(dados));
    }
  }, []);

  const salvarNoLocalStorage = (lista) => {
    localStorage.setItem('elaboracao_arts_contratantes', JSON.stringify(lista));
  };

  const handleSalvarContratante = (dados) => {
    if (contratanteEditando) {
      // Editar existente
      const novosContratantes = contratantes.map(c => 
        c.id === contratanteEditando.id ? { ...dados, id: c.id } : c
      );
      setContratantes(novosContratantes);
      salvarNoLocalStorage(novosContratantes);
      setMensagem('Contratante atualizado com sucesso!');
    } else {
      // Adicionar novo
      const novoContratante = { ...dados, id: Date.now() };
      const novosContratantes = [...contratantes, novoContratante];
      setContratantes(novosContratantes);
      salvarNoLocalStorage(novosContratantes);
      setMensagem('Contratante cadastrado com sucesso!');
    }
    
    setMostrarFormulario(false);
    setContratanteEditando(null);
    setTimeout(() => setMensagem(''), 3000);
  };

  const handleEditarContratante = (contratante) => {
    setContratanteEditando(contratante);
    setMostrarFormulario(true);
  };

  const handleExcluirContratante = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este contratante?')) {
      const novosContratantes = contratantes.filter(c => c.id !== id);
      setContratantes(novosContratantes);
      salvarNoLocalStorage(novosContratantes);
      setMensagem('Contratante excluído com sucesso!');
      setTimeout(() => setMensagem(''), 3000);
    }
  };

  const handleNovoContratante = () => {
    setContratanteEditando(null);
    setMostrarFormulario(true);
  };

  const contratantesFiltrados = contratantes.filter(c => {
    const busca = filtro.toLowerCase();
    return (
      c.nome.toLowerCase().includes(busca) ||
      c.cpf_cnpj.includes(busca) ||
      c.cidade.toLowerCase().includes(busca)
    );
  });

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
              Cadastro de contratantes para elaboração de ARTs
            </p>
          </div>
          {!mostrarFormulario && (
            <Button 
              onClick={handleNovoContratante}
              className="bg-green-600 hover:bg-green-700 shadow-lg w-full md:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Contratante
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
                {contratanteEditando ? 'Editar Contratante' : 'Novo Contratante'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FormularioContratante
                contratanteInicial={contratanteEditando}
                onSalvar={handleSalvarContratante}
                onCancelar={() => {
                  setMostrarFormulario(false);
                  setContratanteEditando(null);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6 shadow-lg border-green-100">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <Input
                    placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10 border-green-200 focus:border-green-500"
                  />
                </div>
              </CardContent>
            </Card>

            {contratantesFiltrados.length === 0 ? (
              <Card className="shadow-lg border-green-100">
                <CardContent className="p-12 text-center">
                  <FileSignature className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Nenhum contratante cadastrado
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Comece cadastrando seu primeiro contratante para elaboração de ARTs
                  </p>
                  <Button 
                    onClick={handleNovoContratante}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Cadastrar Primeiro Contratante
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contratantesFiltrados.map((contratante) => (
                  <Card key={contratante.id} className="shadow-lg border-green-100 hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="text-xl font-bold text-green-900">
                            {contratante.nome}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-semibold">CPF/CNPJ:</span> {contratante.cpf_cnpj}
                            </div>
                            <div>
                              <span className="font-semibold">CEP:</span> {contratante.cep}
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-semibold">Endereço:</span> {contratante.endereco}
                            </div>
                            <div>
                              <span className="font-semibold">Cidade:</span> {contratante.cidade}
                            </div>
                            <div>
                              <span className="font-semibold">UF:</span> {contratante.uf}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarContratante(contratante)}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExcluirContratante(contratante.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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