import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Bell, Calendar, DollarSign, FileText, Upload, Check, X, Undo2, Paperclip, Upload as UploadIcon, Download, ChevronDown, ChevronRight, Send, CreditCard, Copy } from "lucide-react";
import { toast, Toaster } from "sonner";
import { format, differenceInDays } from "date-fns";
import AutocompleteInput from "../components/common/AutocompleteInput";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DespesasLembretes() {
  const [contas, setContas] = useState([]);
  const [lembretes, setLembretes] = useState([]);
  const [chavesPix, setChavesPix] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tipoForm, setTipoForm] = useState("conta"); // "conta" ou "lembrete"
  const [editingItem, setEditingItem] = useState(null);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [extraindoCodigo, setExtraindoCodigo] = useState(false);
  const [uploadingBoleto, setUploadingBoleto] = useState(false);
  const [uploadingRecibo, setUploadingRecibo] = useState(false);
  const [corrigindoTexto, setCorrigindoTexto] = useState({});
  const [sugestoes, setSugestoes] = useState({
    descricoes: [],
    fornecedores: [],
    categorias: []
  });
  const [dialogMarcarPago, setDialogMarcarPago] = useState(null);
  const [dialogDesmarcarPago, setDialogDesmarcarPago] = useState(null);
  const [dialogExcluir, setDialogExcluir] = useState(null);
  const [dialogAnexarRecibo, setDialogAnexarRecibo] = useState(null);
  const [uploadingReciboRapido, setUploadingReciboRapido] = useState(false);
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  const [gruposPixExpandidos, setGruposPixExpandidos] = useState({});
  const [dialogTesteWhatsApp, setDialogTesteWhatsApp] = useState(false);
  const [showGerenciarPix, setShowGerenciarPix] = useState(false);
  const [formChavePix, setFormChavePix] = useState({ descricao: "", chave: "", tipo: "cpf" });
  const [editingChavePix, setEditingChavePix] = useState(null);
  const [showGruposWhatsApp, setShowGruposWhatsApp] = useState(false);
  const [gruposWhatsApp, setGruposWhatsApp] = useState([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [gruposDisponiveis, setGruposDisponiveis] = useState([]);
  const [ultimaAtualizacaoGrupos, setUltimaAtualizacaoGrupos] = useState(null);

  const [formDataConta, setFormDataConta] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    dias_antes_avisar: 3,
    telefone_contato: "(64) 98147-2081",
    grupo_whatsapp_id: "",
    chave_pix: "",
    codigo_barras: "",
    fornecedor: "",
    categoria: "",
    observacoes: "",
    ativo: true,
    recorrente: false,
    parcelas_total: "",
    data_vencimento_final: ""
  });

  const [formDataLembrete, setFormDataLembrete] = useState({
    descricao: "",
    valor: "",
    data_evento: "",
    hora_evento: "",
    link_acesso: "",
    dias_antes_avisar: 1,
    telefone_contato: "(64) 98147-2081",
    grupo_whatsapp_id: "",
    observacoes: "",
    ativo: true
  });

  useEffect(() => {
    carregarDados();
    carregarChavesPix();
    moverLembretesVencidosAutomaticamente();
  }, []);

  const moverLembretesVencidosAutomaticamente = async () => {
    try {
      const dataHoje = new Date().toISOString().split('T')[0];
      const lembretesVencidos = lembretes.filter(l => 
        l.ativo && 
        !l.concluido && 
        l.data_evento < dataHoje
      );

      for (const lembrete of lembretesVencidos) {
        await base44.entities.Lembrete.update(lembrete.id, {
          concluido: true,
          ativo: false,
          data_conclusao: new Date().toISOString()
        });
      }

      if (lembretesVencidos.length > 0) {
        await carregarDados();
      }
    } catch (error) {
      console.error("Erro ao mover lembretes vencidos:", error);
    }
  };

  const carregarChavesPix = async () => {
    try {
      const data = await base44.entities.ChavePix.list("-ultima_utilizacao");
      setChavesPix(data || []);
    } catch (error) {
      console.error("Erro ao carregar chaves PIX:", error);
    }
  };

  const handleSalvarChavePix = async (e) => {
    e.preventDefault();
    try {
      if (editingChavePix) {
        await base44.entities.ChavePix.update(editingChavePix.id, formChavePix);
        toast.success("Chave PIX atualizada!");
      } else {
        await base44.entities.ChavePix.create({
          ...formChavePix,
          ultima_utilizacao: new Date().toISOString()
        });
        toast.success("Chave PIX cadastrada!");
      }
      await carregarChavesPix();
      setFormChavePix({ descricao: "", chave: "", tipo: "cpf" });
      setEditingChavePix(null);
    } catch (error) {
      console.error("Erro ao salvar chave PIX:", error);
      toast.error("Erro ao salvar chave PIX");
    }
  };

  const handleExcluirChavePix = async (id) => {
    if (!confirm("Deseja excluir esta chave PIX?")) return;
    try {
      await base44.entities.ChavePix.delete(id);
      toast.success("Chave PIX excluída!");
      await carregarChavesPix();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir chave PIX");
    }
  };

  const carregarGruposWhatsApp = async (forcar = false) => {
    setCarregandoGrupos(true);
    try {
      if (forcar) {
        // Buscar da API primeiro
        const response = await base44.functions.invoke('buscarGruposWhatsApp', {});
        
        if (!response.error && response.grupos && response.grupos.length > 0) {
          // Só limpar o banco depois de confirmar que a API funcionou
          const todosGrupos = await base44.entities.GrupoWhatsApp.list();
          for (const grupo of todosGrupos) {
            await base44.entities.GrupoWhatsApp.delete(grupo.id);
          }
          
          setGruposWhatsApp(response.grupos);
          setGruposDisponiveis(response.grupos);
          toast.success(`${response.grupos.length} grupos atualizados`);
        } else {
          // Se API falhar, manter grupos do banco
          const gruposBD = await base44.entities.GrupoWhatsApp.list('-ultima_atualizacao');
          const gruposFormatados = gruposBD.map(g => ({ id: g.grupo_id, subject: g.nome }));
          setGruposWhatsApp(gruposFormatados);
          setGruposDisponiveis(gruposFormatados);
          toast.warning('API indisponível. Usando grupos salvos.');
        }
      } else {
        // Carregar do banco normalmente
        const gruposBD = await base44.entities.GrupoWhatsApp.list('-ultima_atualizacao');
        const gruposFormatados = gruposBD.map(g => ({ id: g.grupo_id, subject: g.nome }));
        setGruposWhatsApp(gruposFormatados);
        setGruposDisponiveis(gruposFormatados);
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      toast.error("Erro ao processar grupos");
    } finally {
      setCarregandoGrupos(false);
    }
  };

  const handleVerGruposWhatsApp = async () => {
    setShowGruposWhatsApp(true);
    setCarregandoGrupos(true);
    
    try {
      // 1. Buscar grupos da API primeiro
      const response = await base44.functions.invoke('buscarGruposWhatsApp', {});
      
      if (!response.error && response.grupos && response.grupos.length > 0) {
        // 2. Só limpar o banco DEPOIS de confirmar que a API retornou grupos
        const todosGrupos = await base44.entities.GrupoWhatsApp.list();
        for (const grupo of todosGrupos) {
          await base44.entities.GrupoWhatsApp.delete(grupo.id);
        }
        
        // 3. Atualizar interface com novos grupos (que já foram salvos pela API)
        setGruposWhatsApp(response.grupos);
        setGruposDisponiveis(response.grupos);
        toast.success(`${response.grupos.length} grupos atualizados`);
      } else {
        // Se API falhar, manter grupos do banco
        const gruposBD = await base44.entities.GrupoWhatsApp.list('-ultima_atualizacao');
        const gruposFormatados = gruposBD.map(g => ({ id: g.grupo_id, subject: g.nome }));
        setGruposWhatsApp(gruposFormatados);
        setGruposDisponiveis(gruposFormatados);
        
        if (response.aviso) {
          toast.info(response.aviso);
        } else {
          toast.warning('API indisponível. Usando grupos salvos.');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar grupos:', error);
      // Em caso de erro, tentar carregar do banco
      try {
        const gruposBD = await base44.entities.GrupoWhatsApp.list('-ultima_atualizacao');
        const gruposFormatados = gruposBD.map(g => ({ id: g.grupo_id, subject: g.nome }));
        setGruposWhatsApp(gruposFormatados);
        setGruposDisponiveis(gruposFormatados);
        toast.error('Erro ao buscar API. Usando grupos salvos.');
      } catch {
        setGruposWhatsApp([]);
        setGruposDisponiveis([]);
        toast.error('Erro ao carregar grupos');
      }
    } finally {
      setCarregandoGrupos(false);
    }
  };

  // Carregar grupos automaticamente ao abrir o formulário (com cache)
  useEffect(() => {
    if (showForm) {
      carregarGruposWhatsApp(false);
    }
  }, [showForm]);

  useEffect(() => {
    // Extrair sugestões únicas dos dados existentes
    const descricoesContas = [...new Set(contas.map(c => c.descricao).filter(Boolean))];
    const descricoesLembretes = [...new Set(lembretes.map(l => l.descricao).filter(Boolean))];
    const fornecedoresUnicos = [...new Set(contas.map(c => c.fornecedor).filter(Boolean))];
    const categoriasUnicas = [...new Set(contas.map(c => c.categoria).filter(Boolean))];
    
    setSugestoes({
      descricoes: [...new Set([...descricoesContas, ...descricoesLembretes])].sort(),
      fornecedores: fornecedoresUnicos.sort(),
      categorias: categoriasUnicas.sort()
    });
  }, [contas, lembretes]);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [contasData, lembretesData] = await Promise.all([
        base44.entities.ContaPagar.list("data_vencimento"),
        base44.entities.Lembrete.list("data_evento")
      ]);
      setContas(contasData || []);
      setLembretes(lembretesData || []);

      // Mover automaticamente lembretes vencidos
      const dataHoje = new Date().toISOString().split('T')[0];
      const lembretesVencidos = (lembretesData || []).filter(l => 
        l.ativo && 
        !l.concluido && 
        l.data_evento < dataHoje
      );

      if (lembretesVencidos.length > 0) {
        for (const lembrete of lembretesVencidos) {
          await base44.entities.Lembrete.update(lembrete.id, {
            concluido: true,
            ativo: false,
            data_conclusao: new Date().toISOString()
          });
        }
        // Recarregar dados após mover
        const lembretesAtualizados = await base44.entities.Lembrete.list("data_evento");
        setLembretes(lembretesAtualizados || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const numero = typeof valor === 'number' ? valor : parseFloat(valor.toString().replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (valor, tipo) => {
    const valorLimpo = valor.replace(/\D/g, '');
    const valorFormatado = formatarMoeda(parseFloat(valorLimpo) / 100);
    
    if (tipo === "conta") {
      setFormDataConta({...formDataConta, valor: valorFormatado});
    } else {
      setFormDataLembrete({...formDataLembrete, valor: valorFormatado});
    }
  };

  const formatarTelefone = (valor) => {
    const numero = valor.replace(/\D/g, '');
    if (numero.length <= 10) {
      return numero.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    return numero.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  };

  const handleTelefoneChange = (valor, tipo) => {
    const valorFormatado = formatarTelefone(valor);
    if (tipo === "conta") {
      setFormDataConta({...formDataConta, telefone_contato: valorFormatado});
    } else {
      setFormDataLembrete({...formDataLembrete, telefone_contato: valorFormatado});
    }
  };

  const formatarChavePixPorTipo = (valor, tipo) => {
    // Se for e-mail, deixar como está
    if (tipo === 'email') {
      return valor;
    }

    // Se for aleatória, deixar como está
    if (tipo === 'aleatoria') {
      return valor;
    }

    const numeros = valor.replace(/\D/g, '');
    
    // CPF: 11 dígitos
    if (tipo === 'cpf' && numeros.length <= 11) {
      if (numeros.length === 11) {
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => {
        let result = a;
        if (b) result += '.' + b;
        if (c) result += '.' + c;
        if (d) result += '-' + d;
        return result;
      });
    }
    
    // CNPJ: 14 dígitos
    if (tipo === 'cnpj' && numeros.length <= 14) {
      if (numeros.length === 14) {
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) => {
        let result = a;
        if (b) result += '.' + b;
        if (c) result += '.' + c;
        if (d) result += '/' + d;
        if (e) result += '-' + e;
        return result;
      });
    }
    
    // Telefone: 10 ou 11 dígitos
    if (tipo === 'telefone' && numeros.length <= 11) {
      if (numeros.length <= 10) {
        return numeros.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
      }
      return numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    
    return valor;
  };

  const handleChavePixChange = (valor) => {
    setFormDataConta({...formDataConta, chave_pix: valor});
  };

  const enviarTesteWhatsApp = async () => {
    // Validar se tem telefone OU grupo
    if (!formDataConta.telefone_contato && !formDataConta.grupo_whatsapp_id) {
      toast.error("Digite um número de telefone ou selecione um grupo");
      return;
    }

    if (!formDataConta.descricao || !formDataConta.valor || !formDataConta.data_vencimento) {
      toast.error("Preencha todos os dados da conta antes de testar");
      return;
    }

    setEnviandoTeste(true);
    try {
      const valorFormatado = typeof formDataConta.valor === 'string' 
        ? parseFloat(formDataConta.valor.replace(/\./g, '').replace(',', '.'))
        : formDataConta.valor;

      const dataVencimento = new Date(formDataConta.data_vencimento + 'T00:00:00');
      const dataFormatada = format(dataVencimento, 'dd/MM/yyyy');

      let mensagemTeste = `🔔 *TESTE - Lembrete de Conta a Pagar*\n\n`;
      mensagemTeste += `📋 *Descrição:* ${formDataConta.descricao}\n`;
      mensagemTeste += `📅 *Vencimento:* ${dataFormatada}\n`;
      mensagemTeste += `💰 *Valor:* R$ ${valorFormatado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      if (formDataConta.fornecedor) {
        mensagemTeste += `🏢 *Fornecedor:* ${formDataConta.fornecedor}\n`;
      }

      if (formDataConta.chave_pix) {
        mensagemTeste += `\n💳 *PIX para pagamento:*\n${formDataConta.chave_pix}`;
      }

      mensagemTeste += `\n\n_Mensagem automática - AgroFinance_`;

      // Usar grupo se preenchido, senão usar telefone individual
      const destino = formDataConta.grupo_whatsapp_id || formDataConta.telefone_contato;

      const response = await base44.functions.invoke('enviarWhatsAppEvolution', {
        numero: destino,
        mensagem: mensagemTeste
      });

      if (response.success) {
        const tipoDestino = formDataConta.grupo_whatsapp_id ? "grupo" : "número";
        toast.success(`✅ Mensagem de teste enviada para ${tipoDestino} com sucesso!`);
        setDialogTesteWhatsApp(false);
      } else {
        toast.error(`Erro: ${response.error || 'Falha ao enviar'}`);
      }
    } catch (error) {
      console.error("Erro ao enviar teste:", error);
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setEnviandoTeste(false);
    }
  };

  const enviarTesteWhatsAppLembrete = async () => {
    // Validar se tem telefone OU grupo
    if (!formDataLembrete.telefone_contato && !formDataLembrete.grupo_whatsapp_id) {
      toast.error("Digite um número de telefone ou selecione um grupo");
      return;
    }

    if (!formDataLembrete.descricao || !formDataLembrete.data_evento) {
      toast.error("Preencha pelo menos a descrição e data do evento antes de testar");
      return;
    }

    setEnviandoTeste(true);
    try {
      const dataEvento = new Date(formDataLembrete.data_evento + 'T00:00:00');
      const dataFormatada = format(dataEvento, 'dd/MM/yyyy');

      let mensagemTeste = `🔔 *TESTE - Lembrete de Evento*\n\n`;
      mensagemTeste += `📋 *${formDataLembrete.descricao}*\n\n`;
      mensagemTeste += `📅 *Data:* ${dataFormatada}\n`;
      
      if (formDataLembrete.hora_evento) {
        mensagemTeste += `⏰ *Horário:* ${formDataLembrete.hora_evento}\n`;
      }

      if (formDataLembrete.valor) {
        const valorFormatado = typeof formDataLembrete.valor === 'string' 
          ? parseFloat(formDataLembrete.valor.replace(/\./g, '').replace(',', '.'))
          : formDataLembrete.valor;
        mensagemTeste += `💰 *Valor:* R$ ${valorFormatado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      }

      if (formDataLembrete.link_acesso) {
        mensagemTeste += `\n🔗 *Link de Acesso:*\n${formDataLembrete.link_acesso}\n`;
      }

      if (formDataLembrete.observacoes) {
        mensagemTeste += `\n📝 ${formDataLembrete.observacoes}\n`;
      }

      mensagemTeste += `\n_Mensagem automática - AgroFinance_`;

      // Usar grupo se preenchido, senão usar telefone individual
      const destino = formDataLembrete.grupo_whatsapp_id || formDataLembrete.telefone_contato;

      const response = await base44.functions.invoke('enviarWhatsAppEvolution', {
        numero: destino,
        mensagem: mensagemTeste
      });

      if (response.success) {
        const tipoDestino = formDataLembrete.grupo_whatsapp_id ? "grupo" : "número";
        toast.success(`✅ Mensagem de teste enviada para ${tipoDestino} com sucesso!`);
      } else {
        toast.error(`Erro: ${response.error || 'Falha ao enviar'}`);
      }
    } catch (error) {
      console.error("Erro ao enviar teste:", error);
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleCorrecaoOrtografica = async (campo, tipo) => {
    const formData = tipo === "conta" ? formDataConta : formDataLembrete;
    const valor = formData[campo];

    if (!valor || valor.trim().length < 3) {
      return;
    }

    setCorrigindoTexto({...corrigindoTexto, [campo]: true});
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Corrija apenas os erros ortográficos e gramaticais do texto a seguir, mantendo o mesmo sentido e estilo. Retorne apenas o texto corrigido, sem explicações:

${valor}`
      });

      if (response && typeof response === 'string') {
        if (tipo === "conta") {
          setFormDataConta({...formDataConta, [campo]: response.trim()});
        } else {
          setFormDataLembrete({...formDataLembrete, [campo]: response.trim()});
        }
      }
    } catch (error) {
      console.error("Erro ao corrigir texto:", error);
    } finally {
      setCorrigindoTexto({...corrigindoTexto, [campo]: false});
    }
  };

  const handleUploadBoleto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    setUploadingBoleto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormDataConta({
        ...formDataConta,
        boleto_anexo: {
          url: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast.success("✓ Boleto anexado com sucesso", { duration: 2000 });
      
      // Extrair código de barras automaticamente
      setExtraindoCodigo(true);
      const response = await base44.functions.invoke('extrairCodigoBarras', { file_url });
      
      if (response.encontrado && response.codigo_barras) {
        setFormDataConta(prev => ({
          ...prev,
          codigo_barras: response.codigo_barras
        }));
        toast.success("✓ Código de barras extraído", { duration: 2000 });
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar boleto");
    } finally {
      setUploadingBoleto(false);
      setExtraindoCodigo(false);
    }
  };

  const handleUploadRecibo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingRecibo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormDataConta({
        ...formDataConta,
        recibo_anexo: {
          url: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast.success("✓ Recibo anexado com sucesso", { duration: 2000 });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar recibo");
    } finally {
      setUploadingRecibo(false);
    }
  };

  const handleSubmitConta = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = parseFloat(formDataConta.valor.replace(/\./g, '').replace(',', '.'));
      
      // Atualizar data de última utilização da chave PIX se foi selecionada
      if (formDataConta.chave_pix && formDataConta.chave_pix.trim()) {
        const chaveExiste = chavesPix.find(c => c.chave === formDataConta.chave_pix);
        if (chaveExiste) {
          await base44.entities.ChavePix.update(chaveExiste.id, {
            ultima_utilizacao: new Date().toISOString()
          });
        }
      }
      
      if (editingItem) {
        // Ao editar, não criar novas parcelas
        const dados = {
          ...formDataConta,
          valor: valorLimpo,
          dias_antes_avisar: parseInt(formDataConta.dias_antes_avisar) || 3,
          parcelas_total: formDataConta.recorrente ? parseInt(formDataConta.parcelas_total) : null
        };
        await base44.entities.ContaPagar.update(editingItem.id, dados);
        toast.success("Conta atualizada com sucesso!");
      } else {
        // Ao criar nova conta
        if (formDataConta.recorrente && formDataConta.parcelas_total > 0) {
          // Criar conta recorrente - apenas a primeira parcela
          const grupoId = `rec_${Date.now()}`;
          const dados = {
            ...formDataConta,
            valor: valorLimpo,
            dias_antes_avisar: parseInt(formDataConta.dias_antes_avisar) || 3,
            parcelas_total: parseInt(formDataConta.parcelas_total),
            parcela_atual: 1,
            grupo_recorrencia_id: grupoId,
            // Não incluir código de barras para recorrentes
            codigo_barras: null,
            boleto_anexo: null
          };
          await base44.entities.ContaPagar.create(dados);
          toast.success(`Conta recorrente cadastrada! Total de ${formDataConta.parcelas_total} parcelas.`);
        } else {
          // Conta normal
          const dados = {
            ...formDataConta,
            valor: valorLimpo,
            dias_antes_avisar: parseInt(formDataConta.dias_antes_avisar) || 3,
            recorrente: false,
            parcelas_total: null,
            parcela_atual: null,
            grupo_recorrencia_id: null
          };
          await base44.entities.ContaPagar.create(dados);
          toast.success("Conta cadastrada com sucesso!");
        }
      }

      await carregarDados();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error("Erro ao salvar conta");
    }
  };

  const handleSubmitLembrete = async (e) => {
    e.preventDefault();
    try {
      const valorLimpo = formDataLembrete.valor ? parseFloat(formDataLembrete.valor.replace(/\./g, '').replace(',', '.')) : null;
      const dados = {
        ...formDataLembrete,
        valor: valorLimpo,
        dias_antes_avisar: parseInt(formDataLembrete.dias_antes_avisar) || 7
      };

      if (editingItem) {
        await base44.entities.Lembrete.update(editingItem.id, dados);
        toast.success("Lembrete atualizado com sucesso!");
      } else {
        await base44.entities.Lembrete.create(dados);
        toast.success("Lembrete cadastrado com sucesso!");
      }

      await carregarDados();
      handleCancelar();
    } catch (error) {
      console.error("Erro ao salvar lembrete:", error);
      toast.error("Erro ao salvar lembrete");
    }
  };

  const handleMarcarPago = async () => {
    if (!dialogMarcarPago) return;
    
    try {
      const conta = contas.find(c => c.id === dialogMarcarPago);
      
      // Marcar como paga
      await base44.entities.ContaPagar.update(dialogMarcarPago, {
        pago: true,
        data_pagamento: new Date().toISOString().split('T')[0]
      });
      
      // Se for recorrente e ainda houver parcelas, criar a próxima
      if (conta.recorrente && conta.parcela_atual < conta.parcelas_total) {
        const proximaData = new Date(conta.data_vencimento + 'T00:00:00');
        proximaData.setMonth(proximaData.getMonth() + 1);
        
        const proximaConta = {
          descricao: conta.descricao,
          valor: conta.valor,
          data_vencimento: proximaData.toISOString().split('T')[0],
          dias_antes_avisar: conta.dias_antes_avisar,
          telefone_contato: conta.telefone_contato,
          fornecedor: conta.fornecedor,
          categoria: conta.categoria,
          observacoes: conta.observacoes,
          ativo: conta.ativo,
          recorrente: true,
          parcelas_total: conta.parcelas_total,
          parcela_atual: conta.parcela_atual + 1,
          data_vencimento_final: conta.data_vencimento_final,
          grupo_recorrencia_id: conta.grupo_recorrencia_id,
          pago: false,
          lembrete_enviado: false,
          lembrete_antecipado_enviado: false,
          codigo_barras: null,
          boleto_anexo: null,
          recibo_anexo: null
        };
        
        await base44.entities.ContaPagar.create(proximaConta);
        toast.success(`Conta paga! Próxima parcela ${conta.parcela_atual + 1}/${conta.parcelas_total} criada.`);
      } else {
        toast.success("Conta marcada como paga!");
      }
      
      await carregarDados();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar como pago");
    } finally {
      setDialogMarcarPago(null);
    }
  };

  const handleDesmarcarPago = async () => {
    if (!dialogDesmarcarPago) return;
    
    try {
      await base44.entities.ContaPagar.update(dialogDesmarcarPago, {
        pago: false,
        data_pagamento: null
      });
      toast.success("Conta retornada para a pagar!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao desmarcar como pago:", error);
      toast.error("Erro ao processar");
    } finally {
      setDialogDesmarcarPago(null);
    }
  };

  const handleAnexarReciboRapido = async (e) => {
    const file = e.target.files[0];
    if (!file || !dialogAnexarRecibo) return;

    setUploadingReciboRapido(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.ContaPagar.update(dialogAnexarRecibo, {
        recibo_anexo: {
          url: file_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast.success("✓ Recibo anexado com sucesso!");
      await carregarDados();
      setDialogAnexarRecibo(null);
    } catch (error) {
      console.error("Erro ao anexar recibo:", error);
      toast.error("Erro ao anexar recibo");
    } finally {
      setUploadingReciboRapido(false);
    }
  };

  const handleEditarConta = (conta) => {
    setEditingItem(conta);
    setTipoForm("conta");
    setFormDataConta({
      descricao: conta.descricao || "",
      valor: conta.valor ? formatarMoeda(conta.valor) : "",
      data_vencimento: conta.data_vencimento || "",
      dias_antes_avisar: conta.dias_antes_avisar || 3,
      telefone_contato: conta.telefone_contato || "",
      grupo_whatsapp_id: conta.grupo_whatsapp_id || "",
      chave_pix: conta.chave_pix || "",
      codigo_barras: conta.codigo_barras || "",
      fornecedor: conta.fornecedor || "",
      categoria: conta.categoria || "",
      observacoes: conta.observacoes || "",
      ativo: conta.ativo !== false,
      boleto_anexo: conta.boleto_anexo || null,
      recibo_anexo: conta.recibo_anexo || null,
      recorrente: conta.recorrente || false,
      parcelas_total: conta.parcelas_total || "",
      data_vencimento_final: conta.data_vencimento_final || "",
      parcela_atual: conta.parcela_atual || 1
    });
    setShowForm(true);
  };

  const handleEditarLembrete = (lembrete) => {
    setEditingItem(lembrete);
    setTipoForm("lembrete");
    setFormDataLembrete({
      descricao: lembrete.descricao || "",
      valor: lembrete.valor ? formatarMoeda(lembrete.valor) : "",
      data_evento: lembrete.data_evento || "",
      hora_evento: lembrete.hora_evento || "",
      link_acesso: lembrete.link_acesso || "",
      dias_antes_avisar: lembrete.dias_antes_avisar || 1,
      telefone_contato: lembrete.telefone_contato || "",
      grupo_whatsapp_id: lembrete.grupo_whatsapp_id || "",
      observacoes: lembrete.observacoes || "",
      ativo: lembrete.ativo !== false
    });
    setShowForm(true);
  };

  const handleReutilizarConta = (conta) => {
    setEditingItem(null); // Não estamos editando, é uma nova conta
    setTipoForm("conta");
    setFormDataConta({
      descricao: conta.descricao || "",
      valor: "", // Deixar vazio para o usuário preencher
      data_vencimento: "", // Deixar vazio para o usuário preencher
      dias_antes_avisar: conta.dias_antes_avisar || 3,
      telefone_contato: conta.telefone_contato || "",
      grupo_whatsapp_id: conta.grupo_whatsapp_id || "",
      chave_pix: conta.chave_pix || "",
      codigo_barras: "", // Não copiar código de barras
      fornecedor: conta.fornecedor || "",
      categoria: conta.categoria || "",
      observacoes: conta.observacoes || "",
      ativo: true,
      boleto_anexo: null, // Não copiar anexos
      recibo_anexo: null,
      recorrente: false,
      parcelas_total: "",
      data_vencimento_final: ""
    });
    setShowForm(true);
    toast.success("Dados copiados! Preencha valor e vencimento.");
  };

  const handleExcluir = async () => {
    if (!dialogExcluir) return;
    
    try {
      if (dialogExcluir.tipo === 'conta') {
        await base44.entities.ContaPagar.delete(dialogExcluir.id);
      } else {
        await base44.entities.Lembrete.delete(dialogExcluir.id);
      }
      toast.success("Item excluído com sucesso!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir item");
    } finally {
      setDialogExcluir(null);
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setEditingItem(null);
    setTipoForm("conta");
    setFormDataConta({
      descricao: "",
      valor: "",
      data_vencimento: "",
      dias_antes_avisar: 3,
      telefone_contato: "(64) 98147-2081",
      grupo_whatsapp_id: "",
      chave_pix: "",
      codigo_barras: "",
      fornecedor: "",
      categoria: "",
      observacoes: "",
      ativo: true,
      recorrente: false,
      parcelas_total: "",
      data_vencimento_final: ""
    });
    setFormDataLembrete({
      descricao: "",
      valor: "",
      data_evento: "",
      hora_evento: "",
      link_acesso: "",
      dias_antes_avisar: 1,
      telefone_contato: "(64) 98147-2081",
      grupo_whatsapp_id: "",
      observacoes: "",
      ativo: true
    });
  };

  const calcularDiasRestantes = (data) => {
    if (!data) return -999; // Data inválida
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const evento = new Date(data + 'T00:00:00');
      if (isNaN(evento.getTime())) return -999;
      return differenceInDays(evento, hoje);
    } catch {
      return -999;
    }
  };

  const getStatusCor = (diasRestantes, pago = false) => {
    if (diasRestantes === -999) return "bg-red-500 text-white animate-pulse";
    if (pago) return "bg-green-100 text-green-800";
    if (diasRestantes < 0) return "bg-red-100 text-red-800";
    if (diasRestantes === 0) return "bg-orange-100 text-orange-800";
    if (diasRestantes <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusTexto = (diasRestantes, pago = false) => {
    if (pago) return "Pago";
    if (diasRestantes === -999) return "⚠️ DATA INVÁLIDA";
    if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dia(s)`;
    if (diasRestantes === 0) return "Vence Hoje!";
    if (diasRestantes === 1) return "Vence Amanhã";
    return `${diasRestantes} dias`;
  };

  const contasAtivas = contas.filter(c => !c.pago && c.ativo !== false);
  const contasPagas = contas.filter(c => c.pago);
  const lembretesAtivos = lembretes.filter(l => l.ativo !== false && !l.concluido);
  const lembretesConcluidos = lembretes.filter(l => l.concluido);

  // Agrupar contas pagas por descrição
  const contasPagasAgrupadas = contasPagas.reduce((grupos, conta) => {
    const chave = conta.descricao || "Sem descrição";
    if (!grupos[chave]) {
      grupos[chave] = [];
    }
    grupos[chave].push(conta);
    return grupos;
  }, {});

  const toggleGrupo = (descricao) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [descricao]: !prev[descricao]
    }));
  };

  const handleDownloadAnexo = (url, fileName) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'documento.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showForm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Tabs value={tipoForm} onValueChange={setTipoForm}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="conta" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Conta a Pagar
            </TabsTrigger>
            <TabsTrigger value="lembrete" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Lembrete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {editingItem && tipoForm === "conta" ? "Editar Conta" : "Nova Conta a Pagar"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitConta} className="space-y-4">
                  <div>
                    <Label>Descrição *</Label>
                    <AutocompleteInput
                      value={formDataConta.descricao}
                      onChange={(e) => setFormDataConta({...formDataConta, descricao: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('descricao', 'conta')}
                      placeholder="Ex: Conta de energia elétrica"
                      suggestions={sugestoes.descricoes}
                      required
                      disabled={corrigindoTexto.descricao}
                    />
                    {corrigindoTexto.descricao && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Fornecedor</Label>
                      <AutocompleteInput
                        value={formDataConta.fornecedor}
                        onChange={(e) => setFormDataConta({...formDataConta, fornecedor: e.target.value})}
                        onBlur={() => handleCorrecaoOrtografica('fornecedor', 'conta')}
                        placeholder="Nome do fornecedor"
                        suggestions={sugestoes.fornecedores}
                        disabled={corrigindoTexto.fornecedor}
                      />
                      {corrigindoTexto.fornecedor && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                    </div>

                    <div>
                      <Label>Categoria</Label>
                      <AutocompleteInput
                        value={formDataConta.categoria}
                        onChange={(e) => setFormDataConta({...formDataConta, categoria: e.target.value})}
                        onBlur={() => handleCorrecaoOrtografica('categoria', 'conta')}
                        placeholder="Ex: Energia, Água, etc"
                        suggestions={sugestoes.categorias}
                        disabled={corrigindoTexto.categoria}
                      />
                      {corrigindoTexto.categoria && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input
                        value={formDataConta.valor}
                        onChange={(e) => handleValorChange(e.target.value, 'conta')}
                        placeholder="0,00"
                        required
                      />
                    </div>

                    <div>
                      <Label>Vencimento *</Label>
                      <Input
                        type="date"
                        value={formDataConta.data_vencimento}
                        onChange={(e) => {
                          const dataSelecionada = e.target.value;

                          // Verificar se é fim de semana
                          if (dataSelecionada) {
                            const data = new Date(dataSelecionada + 'T00:00:00');
                            const diaSemana = data.getDay();

                            if (diaSemana === 0 || diaSemana === 6) {
                              toast.error("❌ Vencimento não pode ser em final de semana! Por favor, selecione uma sexta-feira ou dia útil anterior.");
                              return;
                            }
                          }

                          setFormDataConta({...formDataConta, data_vencimento: dataSelecionada});
                          // Recalcular data final se for recorrente
                          if (formDataConta.recorrente && formDataConta.parcelas_total) {
                            const dataInicial = new Date(dataSelecionada + 'T00:00:00');
                            const dataFinal = new Date(dataInicial);
                            dataFinal.setMonth(dataFinal.getMonth() + parseInt(formDataConta.parcelas_total) - 1);
                            setFormDataConta(prev => ({
                              ...prev,
                              data_vencimento: dataSelecionada,
                              data_vencimento_final: dataFinal.toISOString().split('T')[0]
                            }));
                          }
                        }}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Vencimentos em sábado ou domingo não são permitidos
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="recorrente"
                        checked={formDataConta.recorrente}
                        onChange={(e) => setFormDataConta({
                          ...formDataConta, 
                          recorrente: e.target.checked,
                          parcelas_total: e.target.checked ? formDataConta.parcelas_total : "",
                          data_vencimento_final: e.target.checked ? formDataConta.data_vencimento_final : "",
                          codigo_barras: e.target.checked ? "" : formDataConta.codigo_barras,
                          boleto_anexo: e.target.checked ? null : formDataConta.boleto_anexo
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="recorrente" className="cursor-pointer font-medium">
                        💳 Pagamento Recorrente (mensal)
                      </Label>
                    </div>

                    {formDataConta.recorrente && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                        <div>
                          <Label>Quantidade de Parcelas *</Label>
                          <Input
                            type="number"
                            min="2"
                            max="120"
                            value={formDataConta.parcelas_total}
                            onChange={(e) => {
                              const parcelas = e.target.value;
                              setFormDataConta({...formDataConta, parcelas_total: parcelas});
                              
                              // Calcular data final automaticamente
                              if (parcelas && formDataConta.data_vencimento) {
                                const dataInicial = new Date(formDataConta.data_vencimento + 'T00:00:00');
                                const dataFinal = new Date(dataInicial);
                                dataFinal.setMonth(dataFinal.getMonth() + parseInt(parcelas) - 1);
                                setFormDataConta(prev => ({
                                  ...prev,
                                  parcelas_total: parcelas,
                                  data_vencimento_final: dataFinal.toISOString().split('T')[0]
                                }));
                              }
                            }}
                            placeholder="Ex: 12"
                            required={formDataConta.recorrente}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Número de meses que a conta se repetirá
                          </p>
                        </div>

                        <div>
                          <Label>Data do Vencimento Final</Label>
                          <Input
                            type="date"
                            value={formDataConta.data_vencimento_final}
                            disabled
                            className="bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Calculado automaticamente
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-blue-600 mt-2 pl-6">
                      ℹ️ Contas recorrentes não utilizam código de barras ou boleto anexo
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Avisar quantos dias antes? *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={formDataConta.dias_antes_avisar}
                        onChange={(e) => setFormDataConta({...formDataConta, dias_antes_avisar: e.target.value})}
                        required
                        className="w-20"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Avisos enviados às 6:30h da manhã (X dias antes + no dia do vencimento)
                      </p>
                    </div>

                    <div className="border rounded-lg p-3 bg-blue-50">
                      <h3 className="text-sm font-semibold mb-3 text-blue-900">📱 Destino da Notificação</h3>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label>Grupo WhatsApp (opcional)</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => carregarGruposWhatsApp(true)}
                              disabled={carregandoGrupos}
                              className="h-6 text-xs"
                            >
                              {carregandoGrupos ? "🔄 Atualizando..." : "🔄 Atualizar"}
                            </Button>
                          </div>
                          <Select
                            value={formDataConta.grupo_whatsapp_id || ""}
                            onValueChange={(value) => setFormDataConta({...formDataConta, grupo_whatsapp_id: value === "" ? "" : value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Enviar para número individual" />
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
                          <p className="text-xs text-gray-600 mt-1">
                            {formDataConta.grupo_whatsapp_id 
                              ? "👥 Será enviado para o grupo selecionado" 
                              : "📱 Se não selecionar grupo, envia para número individual"}
                          </p>
                        </div>

                        <div>
                          <Label>Telefone/WhatsApp {!formDataConta.grupo_whatsapp_id && "*"}</Label>
                          <Input
                            type="tel"
                            value={formDataConta.telefone_contato}
                            onChange={(e) => handleTelefoneChange(e.target.value, 'conta')}
                            placeholder="(62) 99999-9999"
                            maxLength={15}
                            required={!formDataConta.grupo_whatsapp_id}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {formDataConta.grupo_whatsapp_id 
                              ? "Número alternativo (opcional quando grupo selecionado)" 
                              : "Número para receber as notificações"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Chave PIX (opcional)
                    </Label>

                    {chavesPix.length > 0 ? (
                      <Select
                        value={formDataConta.chave_pix || ""}
                        onValueChange={(value) => setFormDataConta({...formDataConta, chave_pix: value === "" ? "" : value})}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione uma chave PIX cadastrada">
                            {formDataConta.chave_pix && (
                              <span className="font-mono text-sm">
                                {chavesPix.find(c => c.chave === formDataConta.chave_pix)?.descricao 
                                  ? `${chavesPix.find(c => c.chave === formDataConta.chave_pix)?.descricao} - ${formDataConta.chave_pix}`
                                  : formDataConta.chave_pix}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhuma</SelectItem>
                          {chavesPix.map((chave) => (
                            <SelectItem key={chave.id} value={chave.chave}>
                              <div className="flex flex-col py-1">
                                {chave.descricao && <span className="font-medium text-sm">{chave.descricao}</span>}
                                <span className="font-mono text-xs text-gray-600">{chave.chave}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-amber-600 mt-1">
                        Cadastre chaves PIX usando o botão "Chaves PIX"
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      💳 Será incluída nos lembretes por WhatsApp
                    </p>
                  </div>

                  {!formDataConta.recorrente && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-semibold text-sm mb-3">Anexo do Boleto</h3>
                    
                    <div>
                      <Label className="text-xs text-gray-600">Boleto (PDF)</Label>
                      <div className="mt-1">
                        <label className={`flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md cursor-pointer transition-colors text-xs ${
                          uploadingBoleto || extraindoCodigo 
                            ? 'bg-gray-50 border-gray-300 cursor-not-allowed' 
                            : formDataConta.boleto_anexo
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-green-400'
                        }`}>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleUploadBoleto}
                            disabled={uploadingBoleto || extraindoCodigo}
                            className="hidden"
                          />
                          {formDataConta.boleto_anexo ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-700 truncate">{formDataConta.boleto_anexo.file_name}</span>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Anexar boleto</span>
                            </>
                          )}
                        </label>
                        {(uploadingBoleto || extraindoCodigo) && (
                          <p className="text-xs text-blue-600 mt-1 text-center">
                            {extraindoCodigo ? "🔍 Extraindo..." : "📤 Enviando..."}
                          </p>
                        )}
                      </div>
                    </div>
                    </div>
                  )}

                  {!formDataConta.recorrente && formDataConta.codigo_barras && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-sm mb-3">Código de Barras</h3>
                      <div>
                        <Label className="text-xs text-gray-600">Código de Barras Extraído</Label>
                        <Input
                          value={formDataConta.codigo_barras}
                          onChange={(e) => setFormDataConta({...formDataConta, codigo_barras: e.target.value})}
                          placeholder="Será extraído automaticamente"
                          className="font-mono text-xs h-8 mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">✨ Extraído automaticamente do PDF</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formDataConta.observacoes}
                      onChange={(e) => setFormDataConta({...formDataConta, observacoes: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('observacoes', 'conta')}
                      rows={3}
                      disabled={corrigindoTexto.observacoes}
                    />
                    {corrigindoTexto.observacoes && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo-conta"
                      checked={formDataConta.ativo}
                      onChange={(e) => setFormDataConta({...formDataConta, ativo: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ativo-conta" className="cursor-pointer">
                      Ativo (receberá notificações)
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {editingItem ? "Atualizar" : "Cadastrar"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={enviarTesteWhatsApp}
                      disabled={!formDataConta.telefone_contato || enviandoTeste}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      {enviandoTeste ? "Enviando..." : "📱 Testar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelar}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lembrete">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {editingItem && tipoForm === "lembrete" ? "Editar Lembrete" : "Novo Lembrete"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitLembrete} className="space-y-4">
                  <div>
                    <Label>Descrição *</Label>
                    <AutocompleteInput
                      value={formDataLembrete.descricao}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, descricao: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('descricao', 'lembrete')}
                      placeholder="Ex: Consórcio - Encerramento do Grupo"
                      suggestions={sugestoes.descricoes}
                      required
                      disabled={corrigindoTexto.descricao}
                    />
                    {corrigindoTexto.descricao && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Valor (R$)</Label>
                      <Input
                        value={formDataLembrete.valor}
                        onChange={(e) => handleValorChange(e.target.value, 'lembrete')}
                        placeholder="0,00"
                        className="h-9"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Data do Evento *</Label>
                      <Input
                        type="date"
                        value={formDataLembrete.data_evento}
                        onChange={(e) => setFormDataLembrete({...formDataLembrete, data_evento: e.target.value})}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="h-9"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Hora (⏰ Aviso 10min antes)</Label>
                      <Input
                        type="time"
                        value={formDataLembrete.hora_evento}
                        onChange={(e) => setFormDataLembrete({...formDataLembrete, hora_evento: e.target.value})}
                        placeholder="HH:MM"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Link de Acesso da Live/Evento</Label>
                    <Input
                      type="url"
                      value={formDataLembrete.link_acesso}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, link_acesso: e.target.value})}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      🔗 Será incluído no WhatsApp
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Avisar quantos dias antes? *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formDataLembrete.dias_antes_avisar}
                        onChange={(e) => setFormDataLembrete({...formDataLembrete, dias_antes_avisar: e.target.value})}
                        required
                        className="h-9 w-20"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Aviso X dias antes (09h) + 10min antes do horário do evento
                      </p>
                    </div>

                    <div className="border rounded-lg p-3 bg-blue-50">
                      <h3 className="text-sm font-semibold mb-3 text-blue-900">📱 Destino da Notificação</h3>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-gray-600">Grupo WhatsApp (opcional)</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => carregarGruposWhatsApp(true)}
                              disabled={carregandoGrupos}
                              className="h-6 text-xs"
                              >
                              {carregandoGrupos ? "🔄 Atualizando..." : "🔄 Atualizar"}
                            </Button>
                          </div>
                          <Select
                            value={formDataLembrete.grupo_whatsapp_id || ""}
                            onValueChange={(value) => setFormDataLembrete({...formDataLembrete, grupo_whatsapp_id: value === "" ? "" : value})}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Enviar para número individual" />
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
                          <p className="text-xs text-gray-600 mt-1">
                            {formDataLembrete.grupo_whatsapp_id 
                              ? "👥 Será enviado para o grupo selecionado" 
                              : "📱 Se não selecionar grupo, envia para número individual"}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-600">Telefone/WhatsApp {!formDataLembrete.grupo_whatsapp_id && "*"}</Label>
                          <Input
                            type="tel"
                            value={formDataLembrete.telefone_contato}
                            onChange={(e) => handleTelefoneChange(e.target.value, 'lembrete')}
                            placeholder="(62) 99999-9999"
                            maxLength={15}
                            required={!formDataLembrete.grupo_whatsapp_id}
                            className="h-9"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {formDataLembrete.grupo_whatsapp_id 
                              ? "Número alternativo (opcional quando grupo selecionado)" 
                              : "Número para receber as notificações"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formDataLembrete.observacoes}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, observacoes: e.target.value})}
                      onBlur={() => handleCorrecaoOrtografica('observacoes', 'lembrete')}
                      rows={3}
                      disabled={corrigindoTexto.observacoes}
                    />
                    {corrigindoTexto.observacoes && <p className="text-xs text-blue-600 mt-1">✨ Corrigindo...</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo-lembrete"
                      checked={formDataLembrete.ativo}
                      onChange={(e) => setFormDataLembrete({...formDataLembrete, ativo: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ativo-lembrete" className="cursor-pointer">
                      Ativo (receberá notificações)
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {editingItem ? "Atualizar" : "Cadastrar"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={enviarTesteWhatsAppLembrete}
                      disabled={!formDataLembrete.telefone_contato || enviandoTeste}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      {enviandoTeste ? "Enviando..." : "📱 Testar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelar}>
                      Cancelar
                    </Button>
                  </div>
                  </form>
                  </CardContent>
                  </Card>
                  </TabsContent>
                  </Tabs>
                  </div>
                  );
                  }

  return (
    <div className="p-6 space-y-4">
      <Toaster position="top-right" richColors />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas e Lembretes</h1>
          <p className="text-gray-500 mt-1">
            {contasAtivas.length} conta(s) ativa(s) • {lembretesAtivos.length} lembrete(s) ativo(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowGerenciarPix(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <CreditCard className="w-4 h-4 mr-2" />
            Chaves PIX
          </Button>
          <Button onClick={handleVerGruposWhatsApp} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            👥 Ver Grupos WhatsApp
          </Button>
          <Button onClick={() => { setShowForm(true); setTipoForm("conta"); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
          <Button onClick={() => { setShowForm(true); setTipoForm("lembrete"); }} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lembrete
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="contas" className="w-full">
          <TabsList>
            <TabsTrigger value="contas">Contas a Pagar ({contasAtivas.length})</TabsTrigger>
            <TabsTrigger value="lembretes">Lembretes ({lembretesAtivos.length})</TabsTrigger>
            <TabsTrigger value="pagas">Pagas ({contasPagas.length})</TabsTrigger>
            <TabsTrigger value="lembretes-concluidos">Lembretes Concluídos ({lembretes.filter(l => l.concluido).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contas" className="space-y-4 mt-4">
            {contasAtivas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma conta a pagar cadastrada</p>
                </CardContent>
              </Card>
            ) : (
              contasAtivas.map((conta) => {
                const diasRestantes = calcularDiasRestantes(conta.data_vencimento);
                return (
                  <Card key={conta.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{conta.descricao}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusCor(diasRestantes)}`}>
                              {getStatusTexto(diasRestantes)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                           <span className="flex items-center gap-1">
                             <Calendar className="w-4 h-4" />
                             {conta.data_vencimento ? format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : '⚠️ SEM DATA'}
                           </span>
                           <span className="font-semibold text-red-600">
                             💰 R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </span>
                           {conta.recorrente && (
                             <span className="text-purple-600 font-medium">
                               💳 Recorrente {conta.parcela_atual}/{conta.parcelas_total}
                             </span>
                           )}
                           {conta.fornecedor && <span>🏢 {conta.fornecedor}</span>}
                           {conta.categoria && <span className="text-blue-600">📂 {conta.categoria}</span>}
                           {conta.codigo_barras && <span className="text-green-600">🔢 Código extraído</span>}
                           {conta.recibo_anexo && (
                             <span className="text-purple-600">📄 Recibo anexado</span>
                           )}
                           </div>
                           {conta.observacoes && (
                            <p className="text-sm text-gray-500 mt-2">{conta.observacoes}</p>
                           )}
                           </div>
                           <div className="flex gap-2">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditarConta(conta)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Editar"
                           >
                            <Edit className="w-4 h-4" />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDialogAnexarRecibo(conta.id)}
                            className="text-purple-600 hover:text-purple-700"
                            title="Anexar recibo"
                           >
                            <FileText className="w-4 h-4" />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDialogMarcarPago(conta.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Marcar como pago"
                           >
                            <Check className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => setDialogExcluir({ id: conta.id, tipo: 'conta' })} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                           </Button>
                           </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="lembretes" className="space-y-4 mt-4">
            {lembretesAtivos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum lembrete cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              lembretesAtivos.map((lembrete) => {
                const diasRestantes = calcularDiasRestantes(lembrete.data_evento);
                return (
                  <Card key={lembrete.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{lembrete.descricao}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusCor(diasRestantes)}`}>
                              {getStatusTexto(diasRestantes)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {lembrete.data_evento ? format(new Date(lembrete.data_evento + 'T00:00:00'), 'dd/MM/yyyy') : 'Data não definida'}
                            </span>
                            {lembrete.hora_evento && (
                              <span className="flex items-center gap-1">
                                ⏰ {lembrete.hora_evento}
                              </span>
                            )}
                            {lembrete.valor && (
                              <span className="font-semibold text-green-600">
                                💰 R$ {lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {lembrete.link_acesso && (
                              <span className="text-blue-600">🔗 Link disponível</span>
                            )}
                            <span>🔔 {lembrete.dias_antes_avisar} dia(s) antes</span>
                          </div>
                          {lembrete.observacoes && (
                            <p className="text-sm text-gray-500 mt-2">{lembrete.observacoes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditarLembrete(lembrete)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDialogExcluir({ id: lembrete.id, tipo: 'lembrete' })} 
                            className="text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        </div>
                        </CardContent>
                        </Card>
                        );
                        })
                        )}
                        </TabsContent>

          <TabsContent value="pagas" className="space-y-4 mt-4">
            {contasPagas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Check className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma conta paga</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(contasPagasAgrupadas).map(([descricao, contas]) => (
                <Card key={descricao} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Cabeçalho do grupo */}
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleGrupo(descricao)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {gruposExpandidos[descricao] ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-700">{descricao}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {contas.length} {contas.length === 1 ? 'pagamento' : 'pagamentos'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 font-semibold">
                        Total: R$ {contas.reduce((sum, c) => sum + c.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Lista de contas do grupo */}
                    {gruposExpandidos[descricao] && (
                      <div className="divide-y">
                        {contas.map((conta) => (
                          <div key={conta.id} className="p-4 bg-white">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {conta.recorrente && (
                                    <span className="text-xs text-purple-600 font-medium">
                                      💳 Parcela {conta.parcela_atual}/{conta.parcelas_total}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Pago
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <span>📅 Vencimento: {format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                                  {conta.data_pagamento && (
                                          <span>✅ Pago em: {conta.data_pagamento ? format(new Date(conta.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy') : '⚠️ SEM DATA'}</span>
                                        )}
                                  <span className="font-semibold text-green-700">💰 R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  {conta.fornecedor && <span>🏢 {conta.fornecedor}</span>}
                                  {conta.categoria && <span className="text-blue-600">📂 {conta.categoria}</span>}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleReutilizarConta(conta)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Usar como rascunho"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                {conta.boleto_anexo && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDownloadAnexo(conta.boleto_anexo.url, conta.boleto_anexo.file_name)}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="Baixar boleto"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                                {conta.recibo_anexo && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDownloadAnexo(conta.recibo_anexo.url, conta.recibo_anexo.file_name)}
                                    className="text-purple-600 hover:text-purple-700"
                                    title="Baixar recibo"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDialogDesmarcarPago(conta.id)}
                                  className="text-orange-600 hover:text-orange-700"
                                  title="Retornar para a pagar"
                                >
                                  <Undo2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDialogExcluir({ id: conta.id, tipo: 'conta' })} 
                                  className="text-red-600 hover:text-red-700"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="lembretes-concluidos" className="space-y-4 mt-4">
            {lembretesConcluidos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum lembrete concluído</p>
                </CardContent>
              </Card>
            ) : (
              lembretesConcluidos.map((lembrete) => {
                const diasRestantes = calcularDiasRestantes(lembrete.data_evento);
                return (
                  <Card key={lembrete.id} className="hover:shadow-md transition-shadow bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-500 line-through">{lembrete.descricao}</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                              Concluído
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {lembrete.data_evento ? format(new Date(lembrete.data_evento + 'T00:00:00'), 'dd/MM/yyyy') : 'Data não definida'}
                            </span>
                            {lembrete.hora_evento && (
                              <span className="flex items-center gap-1">
                                ⏰ {lembrete.hora_evento}
                              </span>
                            )}
                            {lembrete.valor && (
                              <span className="font-semibold text-gray-600">
                                💰 R$ {lembrete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          {lembrete.observacoes && (
                            <p className="text-sm text-gray-400 mt-2">{lembrete.observacoes}</p>
                          )}
                          {lembrete.data_conclusao && (
                            <p className="text-xs text-gray-400 mt-2">
                              Concluído em: {lembrete.data_conclusao ? format(new Date(lembrete.data_conclusao), 'dd/MM/yyyy HH:mm') : 'Data não definida'}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDialogExcluir({ id: lembrete.id, tipo: 'lembrete' })} 
                            className="text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
          </Tabs>
          )}

          {/* Dialog Marcar como Pago */}
      <AlertDialog open={!!dialogMarcarPago} onOpenChange={(open) => !open && setDialogMarcarPago(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Pago</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta conta como paga? Esta ação moverá a conta para a aba "Pagas".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarcarPago} className="bg-green-600 hover:bg-green-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Desmarcar Pago */}
      <AlertDialog open={!!dialogDesmarcarPago} onOpenChange={(open) => !open && setDialogDesmarcarPago(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retornar para Contas a Pagar</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja retornar esta conta para "Contas a Pagar"? A conta voltará a aparecer na lista de contas pendentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesmarcarPago} className="bg-orange-600 hover:bg-orange-700">
              Retornar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir */}
      <AlertDialog open={!!dialogExcluir} onOpenChange={(open) => !open && setDialogExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {dialogExcluir?.tipo === 'conta' ? 'Conta' : 'Lembrete'}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {dialogExcluir?.tipo === 'conta' ? 'esta conta' : 'este lembrete'}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Anexar Recibo */}
      <AlertDialog open={!!dialogAnexarRecibo} onOpenChange={(open) => !open && setDialogAnexarRecibo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anexar Recibo de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o arquivo do recibo de pagamento desta conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
              uploadingReciboRapido
                ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                : 'border-gray-300 hover:bg-gray-50 hover:border-purple-400'
            }`}>
              <input
                type="file"
                onChange={handleAnexarReciboRapido}
                disabled={uploadingReciboRapido}
                className="hidden"
              />
              {uploadingReciboRapido ? (
                <>
                  <Upload className="w-5 h-5 text-gray-400 animate-pulse" />
                  <span className="text-gray-600">Enviando...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">Clique para selecionar o arquivo</span>
                </>
              )}
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploadingReciboRapido}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Ver Grupos WhatsApp */}
      <AlertDialog open={showGruposWhatsApp} onOpenChange={(open) => !open && setShowGruposWhatsApp(false)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              👥 Grupos do WhatsApp Disponíveis
            </AlertDialogTitle>
            <AlertDialogDescription>
              IDs dos grupos para usar nas configurações de lembretes e contas
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {carregandoGrupos ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Carregando grupos...</p>
              </div>
            ) : gruposWhatsApp.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum grupo encontrado</p>
              </div>
            ) : (
              gruposWhatsApp.map((grupo) => (
                <div key={grupo.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{grupo.subject}</h3>
                      <p className="text-xs text-gray-500 mt-1 font-mono break-all">{grupo.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(grupo.id);
                        toast.success("ID copiado!");
                      }}
                      className="shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar ID
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Gerenciar Chaves PIX */}
      {showGerenciarPix && (
        <AlertDialog open={showGerenciarPix} onOpenChange={(open) => {
          if (!open) {
            setShowGerenciarPix(false);
            setFormChavePix({ descricao: "", chave: "", tipo: "cpf" });
            setEditingChavePix(null);
          }
        }}>
          <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Gerenciar Chaves PIX
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cadastre suas chaves PIX para usar rapidamente ao criar contas a pagar
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Formulário de cadastro/edição */}
            <form onSubmit={handleSalvarChavePix} className="space-y-3 border rounded-lg p-4 bg-blue-50">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={formChavePix.descricao}
                  onChange={(e) => setFormChavePix({...formChavePix, descricao: e.target.value})}
                  placeholder="Ex: Banco Itaú - Isabela"
                  required
                />
              </div>
              <div>
                <Label>Tipo de Chave *</Label>
                <Select
                  value={formChavePix.tipo}
                  onValueChange={(value) => setFormChavePix({...formChavePix, tipo: value, chave: ""})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone/Celular</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave PIX *</Label>
                <Input
                  value={formChavePix.chave}
                  onChange={(e) => setFormChavePix({...formChavePix, chave: formatarChavePixPorTipo(e.target.value, formChavePix.tipo)})}
                  placeholder={
                    formChavePix.tipo === 'cpf' ? '000.000.000-00' :
                    formChavePix.tipo === 'cnpj' ? '00.000.000/0000-00' :
                    formChavePix.tipo === 'email' ? 'seu@email.com' :
                    formChavePix.tipo === 'telefone' ? '(00) 00000-0000' :
                    'Cole a chave aleatória'
                  }
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  {editingChavePix ? "Atualizar" : "Adicionar"}
                </Button>
                {editingChavePix && (
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setFormChavePix({ descricao: "", chave: "", tipo: "cpf" });
                      setEditingChavePix(null);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowGerenciarPix(false);
                    setFormChavePix({ descricao: "", chave: "", tipo: "cpf" });
                    setEditingChavePix(null);
                  }}
                  className="ml-auto"
                >
                  Fechar
                </Button>
              </div>
            </form>

            {/* Lista de chaves cadastradas agrupadas */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Chaves Cadastradas ({chavesPix.length})</h3>
              {chavesPix.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma chave cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    // Agrupar chaves por descrição
                    const grupos = chavesPix.reduce((acc, chave) => {
                      const nomeGrupo = chave.descricao || "Sem descrição";
                      if (!acc[nomeGrupo]) acc[nomeGrupo] = [];
                      acc[nomeGrupo].push(chave);
                      return acc;
                    }, {});

                    return Object.entries(grupos).map(([nomeGrupo, chavesDoGrupo]) => {
                      const grupoAberto = gruposPixExpandidos[nomeGrupo] || false;
                      
                      return (
                        <div key={nomeGrupo} className="border rounded-lg overflow-hidden">
                          {/* Cabeçalho do grupo */}
                          <div 
                            className="flex items-center justify-between p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => setGruposPixExpandidos(prev => ({
                              ...prev,
                              [nomeGrupo]: !grupoAberto
                            }))}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {grupoAberto ? (
                                <ChevronDown className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-blue-600" />
                              )}
                              <p className="font-semibold text-gray-900">{nomeGrupo}</p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                {chavesDoGrupo.length} {chavesDoGrupo.length === 1 ? 'chave' : 'chaves'}
                              </span>
                            </div>
                          </div>

                          {/* Chaves do grupo */}
                          {grupoAberto && (
                            <div className="divide-y bg-white">
                              {chavesDoGrupo.map((chave) => (
                                <div key={chave.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-600 font-mono">{chave.chave}</p>
                                    <p className="text-xs text-gray-400">Tipo: {chave.tipo || 'CPF'}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChavePix(chave);
                                        setFormChavePix({ 
                                          descricao: chave.descricao || "", 
                                          chave: chave.chave,
                                          tipo: chave.tipo || "cpf"
                                        });
                                      }}
                                      className="text-blue-600 hover:text-blue-700 h-8 w-8"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExcluirChavePix(chave.id);
                                      }}
                                      className="text-red-600 hover:text-red-700 h-8 w-8"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            </div>
            </AlertDialogContent>
      </AlertDialog>
      )}

    </div>
  );
}