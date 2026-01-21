import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Search, Loader2, Eye, EyeOff, Copy, Plus, Upload, Image as ImageIcon, Send, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
              variant="outline"
              size="icon"
              onClick={handleRemoveClick}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              title="Remover conta"
            >
              <Trash2 className="w-4 h-4" />
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
  const [uploadingMarcaGado, setUploadingMarcaGado] = useState(false);
  const [uploadingCartao, setUploadingCartao] = useState(false);
  const [gruposDisponiveis, setGruposDisponiveis] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [cadastroSimplificado, setCadastroSimplificado] = useState(false);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  
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
    carregarGrupos();
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
        senha_govbr: "",
        marca_gado_imagem_url: "",
        marca_gado_texto: "",
        data_nascimento: "",
        aniversario_telefone_contato: "",
        aniversario_grupo_whatsapp_id: "",
        whatsapp_cliente: "",
        enviar_lembrete_aniversario: false,
        cartao_aniversario_url: "",
        cartao_aniversario_nome: ""
        });
      setContasBancarias([{
        banco: "",
        agencia: "",
        conta_corrente: "",
        observacoes: ""
      }]);
    }
  }, [cliente]);

  const handleMarcaGadoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMarcaGado(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleInputChange('marca_gado_imagem_url', file_url);
    } catch (error) {
      console.error('Erro ao fazer upload da marca:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingMarcaGado(false);
    }
  };

  const handleRemoverMarcaGado = () => {
    handleInputChange('marca_gado_imagem_url', '');
  };

  const carregarGrupos = async () => {
    setCarregandoGrupos(true);
    try {
      const EVOLUTION_API_URL = "https://evolution-api-production-4689.up.railway.app";
      const EVOLUTION_INSTANCE_NAME = "agrofinance-whatsapp";
      const EVOLUTION_API_KEY = "B6D711FCDE4D4FD5936544120E713976";
      
      const response = await fetch(
        `${EVOLUTION_API_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE_NAME}?getParticipants=false`,
        {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const grupos = await response.json();
        setGruposDisponiveis(Array.isArray(grupos) ? grupos : []);
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    } finally {
      setCarregandoGrupos(false);
    }
  };

  const handleCartaoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    try {
      setUploadingCartao(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleInputChange('cartao_aniversario_url', file_url);
      handleInputChange('cartao_aniversario_nome', file.name);
      toast.success('Cartão anexado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload do cartão:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingCartao(false);
    }
  };

  const handleRemoverCartao = () => {
    handleInputChange('cartao_aniversario_url', '');
    handleInputChange('cartao_aniversario_nome', '');
  };

  const handleEnviarTeste = async () => {
    if (!formData.whatsapp_cliente) {
      toast.error("Configure o WhatsApp do Cliente primeiro");
      return;
    }

    if (!formData.cartao_aniversario_url) {
      toast.error("Configure uma imagem de cartão primeiro");
      return;
    }

    setEnviandoTeste(true);
    try {
      // Enviar SOMENTE a imagem para o cliente
      const response = await base44.functions.invoke('enviarWhatsAppEvolution', {
        numero: formData.whatsapp_cliente,
        mensagem: '',
        imagem_url: formData.cartao_aniversario_url
      });

      if (response.success) {
        toast.success("✅ Cartão de teste enviado para o cliente!");
      } else {
        toast.error(`Erro: ${response.error || 'Falha ao enviar'}`);
      }
    } catch (error) {
      console.error("Erro ao enviar teste:", error);
      toast.error("Erro ao enviar teste");
    } finally {
      setEnviandoTeste(false);
      setShowConfirmDialog(false);
    }
  };

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
      toast.error("Você atingiu o limite máximo de 5 contas bancárias.");
    }
  };

  const handleRemoveConta = (index) => {
    if (contasBancarias.length > 1) { // Garante que sempre haja pelo menos uma conta
      setContasBancarias(prev => prev.filter((_, i) => i !== index));
    } else {
      toast.error("É necessário manter pelo menos uma conta bancária.");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      toast.error('Falha ao copiar');
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

    // Validar que pelo menos uma conta tenha banco selecionado (apenas se não for cadastro simplificado)
    if (!cadastroSimplificado) {
      const contasValidas = contasBancarias.filter(conta => conta.banco);
      if (contasValidas.length === 0) {
        toast.error('É necessário cadastrar pelo menos uma conta bancária com o banco selecionado.');
        return;
      }
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
          {/* Cadastro Simplificado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cadastro_simplificado"
                checked={cadastroSimplificado}
                onChange={(e) => setCadastroSimplificado(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="cadastro_simplificado" className="cursor-pointer font-medium text-blue-900">
                📝 Cadastro Simplificado (apenas nome obrigatório)
              </Label>
            </div>
            <p className="text-xs text-blue-700 mt-2 ml-6">
              Marque esta opção para cadastrar apenas o nome do cliente. Os demais campos serão opcionais.
            </p>
          </div>

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
                <Label htmlFor="cpf" className="text-green-700 font-medium">CPF/CNPJ {!cadastroSimplificado && "*"}</Label>
                <Input id="cpf" value={formatCpfCnpj(formData.cpf || "")} onChange={e => handleInputChange('cpf', e.target.value)} required={!cadastroSimplificado} maxLength={18} />
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
                <Label htmlFor="profissao" className="text-green-700 font-medium">Profissão {!cadastroSimplificado && "*"}</Label>
                <Input 
                  id="profissao" 
                  value={formData.profissao || ""} 
                  onChange={e => handleInputChange('profissao', e.target.value)}
                  placeholder="Ex.: Agricultor(a)"
                  required={!cadastroSimplificado}
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

          {/* Lembrete de Aniversário */}
          <div className="border-l-4 border-purple-300 pl-4 bg-purple-50 p-4 rounded-r-lg">
            <h3 className="text-sm font-semibold text-purple-900 mb-3">
              🎂 Lembrete de Aniversário
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enviar_lembrete_aniversario"
                  checked={formData.enviar_lembrete_aniversario || false}
                  onChange={(e) => handleInputChange('enviar_lembrete_aniversario', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <Label htmlFor="enviar_lembrete_aniversario" className="cursor-pointer text-sm text-gray-700">
                  Enviar lembrete de aniversário
                </Label>
              </div>
              
              {formData.enviar_lembrete_aniversario && (
                <div className="space-y-3 mt-3 pt-3 border-t border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="data_nascimento" className="text-xs text-gray-600">Data de Nascimento</Label>
                      <Input
                        id="data_nascimento"
                        type="date"
                        value={formData.data_nascimento || ""}
                        onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-gray-600">Grupo WhatsApp (para você)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={carregarGrupos}
                          disabled={carregandoGrupos}
                          className="h-6 text-xs"
                        >
                          {carregandoGrupos ? "🔄 Atualizando..." : "🔄 Atualizar"}
                        </Button>
                      </div>
                      <Select
                        value={formData.aniversario_grupo_whatsapp_id || ""}
                        onValueChange={(value) => handleInputChange('aniversario_grupo_whatsapp_id', value === "" ? "" : value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>🔹 Número Individual</SelectItem>
                          {gruposDisponiveis.map((grupo) => (
                            <SelectItem key={grupo.id} value={grupo.id}>
                              👥 {grupo.subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-600">Telefone/WhatsApp (para você)</Label>
                      <Input
                        type="tel"
                        value={formatCelular(formData.aniversario_telefone_contato || "")}
                        onChange={(e) => handleInputChange('aniversario_telefone_contato', e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-200">
                    <Label className="text-xs text-gray-600">WhatsApp do Cliente (para enviar o cartão)</Label>
                    <Input
                      type="tel"
                      value={formatCelular(formData.whatsapp_cliente || "")}
                      onChange={(e) => handleInputChange('whatsapp_cliente', e.target.value)}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      📱 Número para enviar o cartão diretamente ao cliente
                    </p>
                  </div>
                </div>
              )}
              
              {formData.enviar_lembrete_aniversario && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <Label className="text-xs text-gray-600 mb-2 block">Cartão de Aniversário (imagem)</Label>
                  {formData.cartao_aniversario_url ? (
                    <div className="flex items-start gap-3">
                      <div className="w-24 h-24 border-2 border-purple-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src={formData.cartao_aniversario_url}
                          alt="Cartão"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-2">{formData.cartao_aniversario_nome}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(formData.cartao_aniversario_url, '_blank')}
                            className="text-purple-600 h-8 text-xs"
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoverCartao}
                            className="text-red-600 h-8 text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remover
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirmDialog(true)}
                            disabled={!formData.whatsapp_cliente}
                            className="text-blue-600 h-8 text-xs"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Testar Cartão
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCartaoUpload}
                        className="hidden"
                        disabled={uploadingCartao}
                      />
                      {uploadingCartao ? (
                        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-purple-600 mb-1" />
                          <span className="text-xs text-gray-500 text-center px-2">
                            Enviar cartão
                          </span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Lembretes são enviados às 7h da manhã no dia do aniversário
              </p>
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
                <Label htmlFor="cidade" className="text-green-700 font-medium">Cidade {!cadastroSimplificado && "*"}</Label>
                <Input id="cidade" value={formData.cidade || ""} onChange={e => handleInputChange('cidade', e.target.value)} required={!cadastroSimplificado} />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="uf" className="text-green-700 font-medium">UF {!cadastroSimplificado && "*"}</Label>
                <Input id="uf" value={formData.uf || ""} onChange={e => handleInputChange('uf', e.target.value)} required={!cadastroSimplificado} maxLength={2} />
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

          {/* Marca do Gado */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-green-100">
              Marca do Gado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-green-700 font-medium mb-2 block">Imagem da Marca</Label>
                {formData.marca_gado_imagem_url ? (
                  <div className="relative">
                    <div className="w-32 h-32 border-2 border-green-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <img 
                        src={formData.marca_gado_imagem_url} 
                        alt="Marca do gado" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(formData.marca_gado_imagem_url, '_blank')}
                        className="text-green-600"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formData.marca_gado_imagem_url)}
                        className="text-blue-600"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar URL
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoverMarcaGado}
                        className="text-red-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMarcaGadoUpload}
                        className="hidden"
                        disabled={uploadingMarcaGado}
                      />
                      {uploadingMarcaGado ? (
                        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-green-600 mb-2" />
                          <span className="text-xs text-gray-500 text-center px-2">
                            Clique para enviar
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="marca_gado_texto" className="text-green-700 font-medium">Descrição da Marca (texto)</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="marca_gado_texto"
                    value={formData.marca_gado_texto || ""}
                    onChange={e => handleInputChange('marca_gado_texto', e.target.value)}
                    placeholder="Ex: M ou ABC ou descrição da marca"
                    rows={4}
                    className="resize-none"
                  />
                  {formData.marca_gado_texto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(formData.marca_gado_texto)}
                      className="shrink-0"
                      title="Copiar descrição"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Descreva as letras ou símbolos da marca do gado
                </p>
              </div>
            </div>
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

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio de Teste</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja enviar o cartão de aniversário para o WhatsApp do cliente?
              <br /><br />
              <strong>Número do cliente:</strong> {formatCelular(formData.whatsapp_cliente || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoTeste}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviarTeste} disabled={enviandoTeste} className="bg-purple-600 hover:bg-purple-700">
              {enviandoTeste ? "Enviando..." : "Sim, Enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}