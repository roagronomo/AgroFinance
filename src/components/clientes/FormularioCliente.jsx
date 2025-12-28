
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Search, Loader2, Eye, EyeOff, Copy, Plus } from "lucide-react";

// Componente para uma única conta bancária (anteriormente era um arquivo separado, agora inline para um único output)
const ContaBancariaCard = ({ conta, index, onUpdate, onRemove, showRemoveButton }) => {
  const handleContaFieldChange = (field, value) => {
    onUpdate(index, { ...conta, [field]: value });
  };

  const handleRemoveClick = () => {
    onRemove(index);
  };

  return (
    <Card className="border border-gray-200 shadow-sm p-4 bg-white">
      <CardContent className="p-0">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-semibold text-gray-800">Conta Bancária #{index + 1}</h4>
          {showRemoveButton && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveClick}
              className="text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" /> Remover
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor={`banco-${index}`} className="text-green-700 font-medium">Banco *</Label>
            <Select value={conta.banco || ""} onValueChange={value => handleContaFieldChange('banco', value)}>
              <SelectTrigger id={`banco-${index}`}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
                <SelectItem value="Bradesco">Bradesco</SelectItem>
                <SelectItem value="Sicoob">Sicoob</SelectItem>
                <SelectItem value="Santander">Santander</SelectItem>
                <SelectItem value="Sicredi">Sicredi</SelectItem>
                {/* Adicione mais bancos conforme necessário */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`agencia-${index}`} className="text-green-700 font-medium">Agência</Label>
            <Input 
              id={`agencia-${index}`} 
              value={conta.agencia || ""} 
              onChange={e => handleContaFieldChange('agencia', e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor={`conta_corrente-${index}`} className="text-green-700 font-medium">Conta Corrente</Label>
            <Input 
              id={`conta_corrente-${index}`} 
              value={conta.conta_corrente || ""} 
              onChange={e => handleContaFieldChange('conta_corrente', e.target.value)} 
            />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor={`observacoes_bancarias-${index}`} className="text-green-700 font-medium">Observações</Label>
            <Textarea 
              id={`observacoes_bancarias-${index}`} 
              value={conta.observacoes || ""} 
              onChange={e => handleContaFieldChange('observacoes', e.target.value)} 
              rows={2} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function FormularioCliente({ cliente, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({});
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  
  // Estado para contas bancárias
  const [contasBancarias, setContasBancarias] = useState([{
    banco: "",
    agencia: "",
    conta_corrente: "",
    observacoes: ""
  }]);
  
  // Estados para mostrar/ocultar senhas
  const [showPasswords, setShowPasswords] = useState({
    senha_email_pessoal: false,
    senha_registro_ambiental: false,
    senha_eagro: false,
    senha_sidago: false,
    senha_govbr: false
  });

  useEffect(() => {
    if (cliente) {
      setFormData(cliente);
      // Carregar contas bancárias existentes ou criar uma vazia
      if (cliente.contas_bancarias && cliente.contas_bancarias.length > 0) {
        setContasBancarias(cliente.contas_bancarias);
      } else {
        setContasBancarias([{
          banco: "",
          agencia: "",
          conta_corrente: "",
          observacoes: ""
        }]);
      }
    } else {
      setFormData({
        nome: "",
        cpf: "",
        rg: "",
        orgao_emissor: "",
        uf_emissor: "",
        nacionalidade: "", // Adicionado
        estado_civil: "",
        profissao: "",     // Adicionado
        email: "",
        telefone_fixo: "",
        celular: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        cep: "",
        login_email_pessoal: "",
        senha_email_pessoal: "",
        login_registro_ambiental: "",
        senha_registro_ambiental: "",
        login_eagro: "",
        senha_eagro: "",
        login_sidago: "",
        senha_sidago: "",
        login_govbr: "",
        senha_govbr: ""
      });
      setContasBancarias([{
        banco: "",
        agencia: "",
        conta_corrente: "",
        observacoes: ""
      }]);
    }
  }, [cliente]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContaBancariaUpdate = (index, updatedConta) => {
    setContasBancarias(prev => {
      const newContas = [...prev];
      newContas[index] = updatedConta;
      return newContas;
    });
  };

  const handleAddConta = () => {
    if (contasBancarias.length < 5) { // Limite de 5 contas
      setContasBancarias(prev => [...prev, {
        banco: "",
        agencia: "",
        conta_corrente: "",
        observacoes: ""
      }]);
    } else {
      alert("Você atingiu o limite máximo de 5 contas bancárias.");
    }
  };

  const handleRemoveConta = (index) => {
    if (contasBancarias.length > 1) { // Garante que sempre haja pelo menos uma conta
      setContasBancarias(prev => prev.filter((_, i) => i !== index));
    } else {
      alert("É necessário manter pelo menos uma conta bancária.");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert('Falha ao copiar. Seu navegador pode não suportar esta funcionalidade.');
    }
  };

  const formatarNomeCompleto = (nome) => {
    if (!nome) return "";
    
    const preposicoes = [
      'do', 'da', 'de', 'dos', 'das', 'del', 'della', 'di', 'du',
      'van', 'von', 'el', 'la', 'le', 'les', 'mac', 'mc', 'o', 'e', 'a', 'com', 'sem', 'em', 'para', 'por', 'sobre'
    ];
    
    return nome
      .toLowerCase()
      .split(' ')
      .map((palavra, index) => {
        palavra = palavra.trim();
        if (!palavra) return '';
        
        if (index === 0) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        
        if (preposicoes.includes(palavra)) {
          return palavra;
        }
        
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .filter(palavra => palavra)
      .join(' ');
  };

  const handleNomeBlur = (e) => {
    const nomeFormatado = formatarNomeCompleto(e.target.value);
    handleInputChange('nome', nomeFormatado);
  };

  const formatTelefoneFixo = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  };

  const formatCelular = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  
  const formatCpfCnpj = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v;
  };
  
  const formatCep = (v) => {
    v = v.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2-$3");
    return v;
  };

  const buscarCEP = async () => {
    const cepNumbers = formData.cep?.replace(/\D/g, '') || '';
    
    if (cepNumbers.length !== 8) {
      setCepError("CEP deve conter 8 dígitos");
      return;
    }

    setCepLoading(true);
    setCepError("");
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setCepError("CEP não encontrado");
        setCepLoading(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf
      }));

      setCepError("");
    } catch (error) {
      setCepError("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value) => {
    const formatted = formatCep(value);
    handleInputChange('cep', formatted);
    setCepError("");
  };

  const handleCepBlur = () => {
    const cepNumbers = formData.cep?.replace(/\D/g, '') || '';
    if (formData.cep && cepNumbers.length !== 8) {
      setCepError("CEP deve conter 8 dígitos");
    } else {
      setCepError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação final do CEP
    const cepNumbers = formData.cep?.replace(/\D/g, '') || '';
    if (formData.cep && cepNumbers.length !== 8) {
      setCepError("CEP deve conter 8 dígitos");
      return;
    }

    // Validar que pelo menos uma conta tenha banco selecionado
    const contasValidas = contasBancarias.filter(conta => conta.banco);
    if (contasValidas.length === 0) {
      alert('É necessário cadastrar pelo menos uma conta bancária com o banco selecionado.');
      return;
    }
    
    // Incluir contas bancárias no formData
    const dadosParaSalvar = {
      ...formData,
      contas_bancarias: contasBancarias.filter(conta => conta.banco || conta.agencia || conta.conta_corrente || conta.observacoes) // Enviar apenas contas preenchidas
    };
    
    onSubmit(dadosParaSalvar);
  };

  return (
    <Card className="shadow-xl border-green-200 bg-white/95">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-t-lg">
        <CardTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados Pessoais */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-green-100">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome" className="text-green-700 font-medium">Nome Completo *</Label>
                <Input 
                  id="nome" 
                  value={formData.nome || ""} 
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  onBlur={handleNomeBlur}
                  placeholder="Ex: João Silva dos Santos"
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 O nome será formatado automaticamente quando sair do campo (Ex: "joão DA silva" → "João da Silva")
                </p>
              </div>
              <div>
                <Label htmlFor="cpf" className="text-green-700 font-medium">CPF/CNPJ *</Label>
                <Input id="cpf" value={formatCpfCnpj(formData.cpf || "")} onChange={e => handleInputChange('cpf', e.target.value)} required maxLength={18} />
              </div>
              <div>
                <Label htmlFor="rg" className="text-green-700 font-medium">RG</Label>
                <Input id="rg" value={formData.rg || ""} onChange={e => handleInputChange('rg', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="orgao_emissor" className="text-green-700 font-medium">Órgão Emissor</Label>
                <Input id="orgao_emissor" value={formData.orgao_emissor || ""} onChange={e => handleInputChange('orgao_emissor', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="uf_emissor" className="text-green-700 font-medium">UF Emissor</Label>
                <Input id="uf_emissor" value={formData.uf_emissor || ""} onChange={e => handleInputChange('uf_emissor', e.target.value)} maxLength={2} />
              </div>
              <div> {/* Novo campo: Nacionalidade */}
                <Label htmlFor="nacionalidade" className="text-green-700 font-medium">Nacionalidade</Label>
                <Input 
                  id="nacionalidade" 
                  value={formData.nacionalidade || ""} 
                  onChange={e => handleInputChange('nacionalidade', e.target.value)}
                  placeholder="Ex.: Brasileiro(a)"
                />
              </div>
              <div>
                <Label htmlFor="estado_civil" className="text-green-700 font-medium">Estado Civil</Label>
                <Select value={formData.estado_civil || ""} onValueChange={value => handleInputChange('estado_civil', value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div> {/* Novo campo: Profissão */}
                <Label htmlFor="profissao" className="text-green-700 font-medium">Profissão *</Label>
                <Input 
                  id="profissao" 
                  value={formData.profissao || ""} 
                  onChange={e => handleInputChange('profissao', e.target.value)}
                  placeholder="Ex.: Agricultor(a)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefone_fixo" className="text-green-700 font-medium">Telefone Fixo</Label>
                <Input 
                  id="telefone_fixo" 
                  value={formatTelefoneFixo(formData.telefone_fixo || "")} 
                  onChange={e => handleInputChange('telefone_fixo', e.target.value)} 
                  maxLength={14}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <Label htmlFor="celular" className="text-green-700 font-medium">Celular / WhatsApp</Label>
                <Input 
                  id="celular" 
                  value={formatCelular(formData.celular || "")} 
                  onChange={e => handleInputChange('celular', e.target.value)} 
                  maxLength={15}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email" className="text-green-700 font-medium">E-mail</Label>
                <Input id="email" type="email" value={formData.email || ""} onChange={e => handleInputChange('email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-green-100">
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cep" className={`font-medium ${cepError ? 'text-red-600' : 'text-green-700'}`}>CEP</Label>
                <div className="flex gap-2">
                  <Input 
                    id="cep" 
                    value={formData.cep || ""} 
                    onChange={e => handleCepChange(e.target.value)} 
                    onBlur={handleCepBlur}
                    maxLength={10}
                    placeholder="00.000-000"
                    className={cepError ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    onClick={buscarCEP}
                    disabled={cepLoading || !formData.cep}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Buscar endereço automaticamente"
                  >
                    {cepLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {cepError && <p className="text-xs text-red-600 mt-1">{cepError}</p>}
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="logradouro" className="text-green-700 font-medium">Rua / Logradouro</Label>
                <Input id="logradouro" value={formData.logradouro || ""} onChange={e => handleInputChange('logradouro', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="numero" className="text-green-700 font-medium">Número</Label>
                <Input id="numero" value={formData.numero || ""} onChange={e => handleInputChange('numero', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="complemento" className="text-green-700 font-medium">Complemento</Label>
                <Input id="complemento" value={formData.complemento || ""} onChange={e => handleInputChange('complemento', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bairro" className="text-green-700 font-medium">Bairro</Label>
                <Input id="bairro" value={formData.bairro || ""} onChange={e => handleInputChange('bairro', e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="cidade" className="text-green-700 font-medium">Cidade *</Label>
                <Input id="cidade" value={formData.cidade || ""} onChange={e => handleInputChange('cidade', e.target.value)} required />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="uf" className="text-green-700 font-medium">UF *</Label>
                <Input id="uf" value={formData.uf || ""} onChange={e => handleInputChange('uf', e.target.value)} required maxLength={2} />
              </div>
            </div>
          </div>

          {/* Dados Bancários - NOVO COM REPETIDOR */}
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-green-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Dados Bancários
              </h3>
              {contasBancarias.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddConta}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Conta
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {contasBancarias.map((conta, index) => (
                <ContaBancariaCard
                  key={index}
                  conta={conta}
                  index={index}
                  onUpdate={handleContaBancariaUpdate}
                  onRemove={handleRemoveConta}
                  showRemoveButton={contasBancarias.length > 1}
                />
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              ℹ️ Você pode cadastrar até 5 contas bancárias para este cliente. Pelo menos uma conta com banco selecionado é obrigatória.
            </p>
          </div>

          {/* Acessos e Credenciais */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-green-100">
              Acessos e Credenciais
            </h3>
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mb-4 border border-amber-200">
              🔒 <strong>Informação Sensível:</strong> Estes dados são criptografados e protegidos. Use apenas para finalidades autorizadas.
            </p>

            <div className="space-y-6">
              {/* E-mail pessoal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <Label htmlFor="login_email_pessoal" className="text-green-700 font-medium">E-mail pessoal – Login</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="login_email_pessoal"
                      type="email"
                      value={formData.login_email_pessoal || ""}
                      onChange={e => handleInputChange('login_email_pessoal', e.target.value)}
                      placeholder="Informe o usuário/e-mail"
                      maxLength={120}
                    />
                    {formData.login_email_pessoal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(formData.login_email_pessoal)}
                        className="shrink-0"
                        title="Copiar login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="senha_email_pessoal" className="text-green-700 font-medium">E-mail pessoal – Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="senha_email_pessoal"
                      type={showPasswords.senha_email_pessoal ? "text" : "password"}
                      value={formData.senha_email_pessoal || ""}
                      onChange={e => handleInputChange('senha_email_pessoal', e.target.value)}
                      placeholder="Informe a senha"
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility('senha_email_pessoal')}
                      className="shrink-0"
                      title={showPasswords.senha_email_pessoal ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPasswords.senha_email_pessoal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Registro Ambiental */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <Label htmlFor="login_registro_ambiental" className="text-green-700 font-medium">Registro Ambiental – Login</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="login_registro_ambiental"
                      type="text"
                      value={formData.login_registro_ambiental || ""}
                      onChange={e => handleInputChange('login_registro_ambiental', e.target.value)}
                      placeholder="Informe o usuário/e-mail"
                      maxLength={120}
                    />
                    {formData.login_registro_ambiental && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(formData.login_registro_ambiental)}
                        className="shrink-0"
                        title="Copiar login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="senha_registro_ambiental" className="text-green-700 font-medium">Registro Ambiental – Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="senha_registro_ambiental"
                      type={showPasswords.senha_registro_ambiental ? "text" : "password"}
                      value={formData.senha_registro_ambiental || ""}
                      onChange={e => handleInputChange('senha_registro_ambiental', e.target.value)}
                      placeholder="Informe a senha"
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility('senha_registro_ambiental')}
                      className="shrink-0"
                      title={showPasswords.senha_registro_ambiental ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPasswords.senha_registro_ambiental ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* E-AGRO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <Label htmlFor="login_eagro" className="text-green-700 font-medium">E-AGRO – Login</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="login_eagro"
                      type="text"
                      value={formData.login_eagro || ""}
                      onChange={e => handleInputChange('login_eagro', e.target.value)}
                      placeholder="Informe o usuário/e-mail"
                      maxLength={120}
                    />
                    {formData.login_eagro && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(formData.login_eagro)}
                        className="shrink-0"
                        title="Copiar login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="senha_eagro" className="text-green-700 font-medium">E-AGRO – Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="senha_eagro"
                      type={showPasswords.senha_eagro ? "text" : "password"}
                      value={formData.senha_eagro || ""}
                      onChange={e => handleInputChange('senha_eagro', e.target.value)}
                      placeholder="Informe a senha"
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility('senha_eagro')}
                      className="shrink-0"
                      title={showPasswords.senha_eagro ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPasswords.senha_eagro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* SIDAGO - Agrodefesa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <Label htmlFor="login_sidago" className="text-green-700 font-medium">SIDAGO – Agrodefesa – Login</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="login_sidago"
                      type="text"
                      value={formData.login_sidago || ""}
                      onChange={e => handleInputChange('login_sidago', e.target.value)}
                      placeholder="Informe o usuário/e-mail"
                      maxLength={120}
                    />
                    {formData.login_sidago && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(formData.login_sidago)}
                        className="shrink-0"
                        title="Copiar login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="senha_sidago" className="text-green-700 font-medium">SIDAGO – Agrodefesa – Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="senha_sidago"
                      type={showPasswords.senha_sidago ? "text" : "password"}
                      value={formData.senha_sidago || ""}
                      onChange={e => handleInputChange('senha_sidago', e.target.value)}
                      placeholder="Informe a senha"
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility('senha_sidago')}
                      className="shrink-0"
                      title={showPasswords.senha_sidago ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPasswords.senha_sidago ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Gov.br */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login_govbr" className="text-green-700 font-medium">Gov.br – Login</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="login_govbr"
                      type="text"
                      value={formData.login_govbr || ""}
                      onChange={e => handleInputChange('login_govbr', e.target.value)}
                      placeholder="Informe o usuário/e-mail"
                      maxLength={120}
                    />
                    {formData.login_govbr && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(formData.login_govbr)}
                        className="shrink-0"
                        title="Copiar login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="senha_govbr" className="text-green-700 font-medium">Gov.br – Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="senha_govbr"
                      type={showPasswords.senha_govbr ? "text" : "password"}
                      value={formData.senha_govbr || ""}
                      onChange={e => handleInputChange('senha_govbr', e.target.value)}
                      placeholder="Informe a senha"
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility('senha_govbr')}
                      className="shrink-0"
                      title={showPasswords.senha_govbr ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPasswords.senha_govbr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              ℹ️ <strong>Nota de Segurança:</strong> Todos os campos de senha são opcionais e serão criptografados no banco de dados. 
              Estas informações são confidenciais e devem ser tratadas com máximo cuidado.
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-green-100">
            <Button type="button" variant="outline" onClick={onCancel} className="border-green-300 text-green-700 hover:bg-green-50">
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
