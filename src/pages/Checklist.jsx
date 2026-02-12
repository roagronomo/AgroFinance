import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Building2,
  FileText,
  UserCheck,
  Printer,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const bancos = [
  { value: "banco_do_brasil_private", label: "Banco do Brasil Private" },
  { value: "banco_do_brasil_varejo", label: "Banco do Brasil Varejo" },
  { value: "bradesco", label: "Banco Bradesco" },
  { value: "caixa_economica_federal", label: "Caixa Econômica Federal" },
  { value: "sicoob", label: "Banco Sicoob" },
  { value: "sicredi", label: "Banco Sicredi" }
];

export default function Checklist() {
  const [templates, setTemplates] = useState([]);
  const [checklistsClientes, setChecklistsClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modoCliente, setModoCliente] = useState(false);
  const [checklistClienteAtual, setChecklistClienteAtual] = useState(null);
  const [templateEditando, setTemplateEditando] = useState(null);
  const [filtros, setFiltros] = useState({
    banco: "todos",
    tipoProjeto: ""
  });

  const [formulario, setFormulario] = useState({
    banco: "",
    tipo_projeto: "",
    nome_template: "",
    itens_checklist: [],
    ativo: true
  });

  const [novoItem, setNovoItem] = useState({
    item: "",
    obrigatorio: true,
    observacao: ""
  });

  const [formularioCliente, setFormularioCliente] = useState({
    cliente_nome: "",
    cliente_cpf: "",
    banco: "",
    tipo_projeto: "",
    template_id: ""
  });

  const [clientes, setClientes] = useState([]);
  const [dialogoExclusao, setDialogoExclusao] = useState({ aberto: false, tipo: null, id: null, nome: "" });
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    await Promise.all([carregarTemplates(), carregarChecklistsClientes(), carregarClientes()]);
  };

  const carregarClientes = async () => {
    try {
      const data = await base44.entities.Cliente.list("nome");
      setClientes(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const carregarTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.ChecklistTemplate.list("-created_date");
      setTemplates(data);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
    setIsLoading(false);
  };

  const carregarChecklistsClientes = async () => {
    try {
      const data = await base44.entities.ChecklistPreenchido.list("-created_date");
      setChecklistsClientes(data);
    } catch (error) {
      console.error("Erro ao carregar checklists de clientes:", error);
    }
  };

  const iniciarNovo = () => {
    setFormulario({
      banco: "",
      tipo_projeto: "",
      nome_template: "",
      itens_checklist: [],
      ativo: true
    });
    setTemplateEditando(null);
    setModoEdicao(true);
  };

  const iniciarEdicao = (template) => {
    setFormulario({
      banco: template.banco,
      tipo_projeto: template.tipo_projeto,
      nome_template: template.nome_template,
      itens_checklist: template.itens_checklist || [],
      ativo: template.ativo !== false
    });
    setTemplateEditando(template);
    setModoEdicao(true);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setTemplateEditando(null);
    setFormulario({
      banco: "",
      tipo_projeto: "",
      nome_template: "",
      itens_checklist: [],
      ativo: true
    });
    setNovoItem({ item: "", obrigatorio: true, observacao: "" });
  };

  const adicionarItem = () => {
    if (!novoItem.item.trim()) return;

    setFormulario(prev => ({
      ...prev,
      itens_checklist: [...prev.itens_checklist, { ...novoItem }]
    }));

    setNovoItem({ item: "", obrigatorio: true, observacao: "" });
  };

  const removerItem = (index) => {
    setFormulario(prev => ({
      ...prev,
      itens_checklist: prev.itens_checklist.filter((_, i) => i !== index)
    }));
  };

  const salvarTemplate = async () => {
    if (!formulario.banco || !formulario.tipo_projeto || !formulario.nome_template) {
      setMensagemErro("Preencha banco, tipo de projeto e nome do template");
      return;
    }

    try {
      if (templateEditando) {
        await base44.entities.ChecklistTemplate.update(templateEditando.id, formulario);
      } else {
        await base44.entities.ChecklistTemplate.create(formulario);
      }
      
      await carregarTemplates();
      cancelarEdicao();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      setMensagemErro("Erro ao salvar template");
    }
  };

  const confirmarExclusaoTemplate = (id, nome) => {
    setDialogoExclusao({ aberto: true, tipo: "template", id, nome });
  };

  const excluirTemplate = async () => {
    const { id } = dialogoExclusao;
    setDialogoExclusao({ aberto: false, tipo: null, id: null, nome: "" });

    try {
      await base44.entities.ChecklistTemplate.delete(id);
      await carregarTemplates();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      setMensagemErro("Erro ao excluir template");
    }
  };

  const criarTemplateModelo = async (tipoBanco) => {
    let templateData = {};

    if (tipoBanco === "bradesco_custeio_pecuario") {
      templateData = {
        banco: "bradesco",
        tipo_projeto: "Custeio Pecuário",
        nome_template: "Checklist Bradesco - Custeio Pecuário",
        itens_checklist: [
          { item: "IPRF", obrigatorio: true, observacao: "Imposto sobre Propriedade Territorial Rural Federal" },
          { item: "Inscrição Estadual", obrigatorio: true },
          { item: "CND do ITR", obrigatorio: true, observacao: "Certidão Negativa de Débitos do ITR" },
          { item: "Contrato de Arrendamento", obrigatorio: true, observacao: "Se aplicável" },
          { item: "CCIR", obrigatorio: true, observacao: "Deve conter a matrícula correta do imóvel" },
          { item: "Matrícula do imóvel", obrigatorio: true },
          { item: "CAR", obrigatorio: true, observacao: "Deve conter a matrícula correta do imóvel" },
          { item: "CND do CPF", obrigatorio: true, observacao: "Certidão Negativa de Débitos do CPF" },
          { item: "Comprovante do estado civil (Certidão de Casamento, Certidão de Óbito, Declaração de União Estável)", obrigatorio: true },
          { item: "Saldo bancário (Bradesco e Concorrentes)", obrigatorio: true },
          { item: "Extrato de conta corrente (3 meses)", obrigatorio: true },
          { item: "Declaração de existência de contas bancárias", obrigatorio: true }
        ],
        ativo: true
      };
    }

    if (!templateData.banco) {
      setMensagemErro("Template modelo não disponível");
      return;
    }

    try {
      await base44.entities.ChecklistTemplate.create(templateData);
      await carregarTemplates();
    } catch (error) {
      console.error("Erro ao criar template modelo:", error);
      setMensagemErro("Erro ao criar template modelo");
    }
  };

  const templatesFiltrados = templates.filter(t => {
    const matchBanco = filtros.banco === "todos" || t.banco === filtros.banco;
    const matchTipo = !filtros.tipoProjeto || 
      t.tipo_projeto.toLowerCase().includes(filtros.tipoProjeto.toLowerCase());
    return matchBanco && matchTipo;
  });

  const getBancoLabel = (value) => {
    return bancos.find(b => b.value === value)?.label || value;
  };

  const iniciarChecklistCliente = () => {
    setFormularioCliente({
      cliente_nome: "",
      cliente_cpf: "",
      banco: "",
      tipo_projeto: "",
      template_id: ""
    });
    setChecklistClienteAtual(null);
    setModoCliente(true);
  };

  const selecionarCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormularioCliente(prev => ({
        ...prev,
        cliente_nome: cliente.nome,
        cliente_cpf: cliente.cpf || ""
      }));
    }
  };

  const selecionarTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormularioCliente(prev => ({
        ...prev,
        banco: template.banco,
        tipo_projeto: template.tipo_projeto,
        template_id: templateId
      }));
    }
  };

  const criarChecklistCliente = async () => {
    if (!formularioCliente.cliente_nome || !formularioCliente.template_id) {
      setMensagemErro("Preencha o nome do cliente e selecione um template");
      return;
    }

    const template = templates.find(t => t.id === formularioCliente.template_id);
    const itensComMarcacao = template.itens_checklist.map(item => ({
      ...item,
      marcado: false
    }));

    try {
      const novoChecklist = await base44.entities.ChecklistPreenchido.create({
        cliente_nome: formularioCliente.cliente_nome,
        banco: formularioCliente.banco,
        tipo_projeto: formularioCliente.tipo_projeto,
        template_id: formularioCliente.template_id,
        itens_checklist: itensComMarcacao,
        concluido: false
      });

      setChecklistClienteAtual(novoChecklist);
      await carregarChecklistsClientes();
    } catch (error) {
      console.error("Erro ao criar checklist do cliente:", error);
      setMensagemErro("Erro ao criar checklist");
    }
  };

  const abrirChecklistCliente = (checklist) => {
    setChecklistClienteAtual(checklist);
    setFormularioCliente({
      cliente_nome: checklist.cliente_nome,
      banco: checklist.banco,
      tipo_projeto: checklist.tipo_projeto,
      template_id: checklist.template_id
    });
    setModoCliente(true);
  };

  const toggleItemChecklist = async (indexItem) => {
    if (!checklistClienteAtual) return;

    const itensAtualizados = [...checklistClienteAtual.itens_checklist];
    itensAtualizados[indexItem].marcado = !itensAtualizados[indexItem].marcado;

    const todosObrigatoriosMarcados = itensAtualizados
      .filter(item => item.obrigatorio)
      .every(item => item.marcado);

    try {
      const checklistAtualizado = await base44.entities.ChecklistPreenchido.update(
        checklistClienteAtual.id,
        {
          itens_checklist: itensAtualizados,
          concluido: todosObrigatoriosMarcados,
          data_conclusao: todosObrigatoriosMarcados ? new Date().toISOString() : null
        }
      );

      setChecklistClienteAtual(checklistAtualizado);
      await carregarChecklistsClientes();
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
    }
  };

  const gerarPDFChecklist = () => {
    if (!checklistClienteAtual) return;

    const bancoConfig = {
      bradesco: {
        cor: "#CC092F",
        corClara: "#FFE6EA",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Bradesco_logo.svg/200px-Bradesco_logo.svg.png",
        nome: "Banco Bradesco"
      },
      banco_do_brasil_private: {
        cor: "#FDB813",
        corClara: "#FFF8E1",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Banco_do_Brasil_logo.svg/200px-Banco_do_Brasil_logo.svg.png",
        nome: "Banco do Brasil Private"
      },
      banco_do_brasil_varejo: {
        cor: "#FDB813",
        corClara: "#FFF8E1",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Banco_do_Brasil_logo.svg/200px-Banco_do_Brasil_logo.svg.png",
        nome: "Banco do Brasil Varejo"
      },
      caixa_economica_federal: {
        cor: "#0066B3",
        corClara: "#E3F2FD",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Caixa_logo.svg/200px-Caixa_logo.svg.png",
        nome: "Caixa Econômica Federal"
      },
      sicoob: {
        cor: "#00984A",
        corClara: "#E8F5E9",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sicoob_logo.svg/200px-Sicoob_logo.svg.png",
        nome: "Sicoob"
      },
      sicredi: {
        cor: "#00A859",
        corClara: "#E8F5E9",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Sicredi_logo.svg/200px-Sicredi_logo.svg.png",
        nome: "Sicredi"
      }
    };

    const config = bancoConfig[checklistClienteAtual.banco] || {
      cor: "#1F2937",
      corClara: "#F3F4F6",
      logo: "",
      nome: getBancoLabel(checklistClienteAtual.banco)
    };

    const totalItens = checklistClienteAtual.itens_checklist.length;
    const itensMarcados = checklistClienteAtual.itens_checklist.filter(item => item.marcado).length;
    const progresso = Math.round((itensMarcados / totalItens) * 100);

    const conteudoPDF = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Checklist - ${checklistClienteAtual.cliente_nome}</title>
          <style>
            @page {
              size: A4;
              margin: 6mm;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              color: #1F2937;
              line-height: 1.3;
              font-size: 10pt;
            }
            
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              background: ${config.cor};
              border-bottom: 3px solid ${config.cor};
              margin-bottom: 8px;
            }
            
            .header-title {
              color: white;
            }
            
            .header-title h1 {
              margin: 0;
              font-size: 14pt;
              font-weight: 700;
            }
            
            .header-title p {
              margin: 2px 0 0 0;
              font-size: 9pt;
              opacity: 0.95;
            }
            
            .header-right {
              background: white;
              padding: 6px 12px;
              border-radius: 4px;
              text-align: center;
            }
            
            .header-right .progress-label {
              font-size: 8pt;
              color: #6B7280;
              margin: 0;
            }
            
            .header-right .progress-value {
              font-size: 18pt;
              font-weight: 700;
              color: ${config.cor};
              line-height: 1;
              margin: 2px 0;
            }
            
            .cliente-info {
              background: ${config.corClara};
              border-left: 3px solid ${config.cor};
              padding: 6px 10px;
              margin-bottom: 8px;
            }
            
            .cliente-info h2 {
              margin: 0;
              font-size: 9pt;
              color: ${config.cor};
              font-weight: 600;
            }
            
            .cliente-info p {
              margin: 2px 0 0 0;
              font-size: 11pt;
              font-weight: 600;
              color: #1F2937;
            }
            
            .checklist-items {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            
            .checklist-item {
              background: white;
              border: 1px solid #E5E7EB;
              border-radius: 4px;
              padding: 6px 10px;
              display: flex;
              align-items: flex-start;
              gap: 8px;
              page-break-inside: avoid;
            }
            
            .checklist-item.marcado {
              background: ${config.corClara};
              border-color: ${config.cor};
            }
            
            .checkbox {
              width: 16px;
              height: 16px;
              border: 1.5px solid ${config.cor};
              border-radius: 3px;
              flex-shrink: 0;
              margin-top: 1px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            
            .checklist-item.marcado .checkbox {
              background: ${config.cor};
            }
            
            .checkbox-check {
              color: white;
              font-size: 11px;
              font-weight: bold;
            }
            
            .item-content {
              flex: 1;
            }
            
            .item-title {
              font-size: 9.5pt;
              font-weight: 600;
              color: #1F2937;
              margin: 0;
              line-height: 1.3;
            }
            
            .checklist-item.marcado .item-title {
              color: ${config.cor};
            }
            
            .item-observacao {
              font-size: 8.5pt;
              color: #6B7280;
              margin-top: 2px;
              font-style: italic;
              line-height: 1.2;
            }
            
            .badge {
              display: inline-block;
              padding: 1px 5px;
              border-radius: 3px;
              font-size: 7.5pt;
              font-weight: 600;
              margin-left: 5px;
            }
            
            .badge-obrigatorio {
              background: #FEE2E2;
              color: #DC2626;
            }
            
            .footer {
              margin-top: 10px;
              padding-top: 6px;
              border-top: 1px solid #E5E7EB;
              text-align: center;
              color: #6B7280;
              font-size: 7.5pt;
            }
            
            .footer p {
              margin: 2px 0;
            }
            
            @media print {
              body {
                padding: 0;
              }
              
              .checklist-item {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-title">
              <h1>CHECKLIST DE DOCUMENTAÇÃO</h1>
              <p>${checklistClienteAtual.tipo_projeto} • ${config.nome}</p>
            </div>
            <div class="header-right">
              <div class="progress-label">Progresso</div>
              <div class="progress-value">${progresso}%</div>
              <div class="progress-label">${itensMarcados}/${totalItens} itens</div>
            </div>
          </div>
          
          <div class="cliente-info">
            <h2>Cliente</h2>
            <p>${checklistClienteAtual.cliente_nome}</p>
          </div>
          
          <div class="checklist-items">
            ${checklistClienteAtual.itens_checklist.map((item, index) => `
              <div class="checklist-item ${item.marcado ? 'marcado' : ''}">
                <div class="checkbox">
                  ${item.marcado ? '<span class="checkbox-check">✓</span>' : ''}
                </div>
                <div class="item-content">
                  <div class="item-title">
                    ${index + 1}. ${item.item}${item.obrigatorio ? '<span class="badge badge-obrigatorio">OBRIGATÓRIO</span>' : ''}
                  </div>
                  ${item.observacao ? `<div class="item-observacao">📌 ${item.observacao}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="footer">
            <p><strong>Cerrado Consultoria - Financiamentos Agrícolas</strong></p>
            <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(conteudoPDF);
      janela.document.close();
      janela.document.title = `Checklist_${checklistClienteAtual.cliente_nome.replace(/\s+/g, '_')}`;
      setTimeout(() => {
        janela.print();
      }, 500);
    } else {
      alert("Bloqueador de pop-ups ativo. Permita pop-ups para gerar o PDF.");
    }
  };

  const voltarParaLista = () => {
    setModoCliente(false);
    setChecklistClienteAtual(null);
    setFormularioCliente({
      cliente_nome: "",
      cliente_cpf: "",
      banco: "",
      tipo_projeto: "",
      template_id: ""
    });
  };

  const confirmarExclusaoChecklist = (id, nome) => {
    setDialogoExclusao({ aberto: true, tipo: "checklist", id, nome });
  };

  const excluirChecklistCliente = async () => {
    const { id } = dialogoExclusao;
    setDialogoExclusao({ aberto: false, tipo: null, id: null, nome: "" });

    try {
      await base44.entities.ChecklistPreenchido.delete(id);
      await carregarChecklistsClientes();
      if (checklistClienteAtual?.id === id) {
        voltarParaLista();
      }
    } catch (error) {
      console.error("Erro ao excluir checklist:", error);
      setMensagemErro("Erro ao excluir checklist");
    }
  };

  if (modoCliente && checklistClienteAtual) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={voltarParaLista}
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Checklist: {checklistClienteAtual.cliente_nome}
              </h1>
              <p className="text-gray-600">
                {getBancoLabel(checklistClienteAtual.banco)} • {checklistClienteAtual.tipo_projeto}
              </p>
            </div>
            <Button
              onClick={gerarPDFChecklist}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Printer className="w-5 h-5 mr-2" />
              Gerar PDF
            </Button>
          </div>

          <Card className="shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Progresso do Checklist</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {checklistClienteAtual.itens_checklist.filter(item => item.marcado).length} de {checklistClienteAtual.itens_checklist.length} itens
                  </p>
                </div>
                {checklistClienteAtual.concluido && (
                  <Badge className="bg-green-100 text-green-700 px-4 py-2">
                    ✓ Concluído
                  </Badge>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${(checklistClienteAtual.itens_checklist.filter(item => item.marcado).length / checklistClienteAtual.itens_checklist.length) * 100}%`
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {checklistClienteAtual.itens_checklist.map((item, index) => (
              <Card
                key={index}
                className={`transition-all cursor-pointer hover:shadow-md ${
                  item.marcado ? 'bg-green-50 border-green-300' : 'bg-white'
                }`}
                onClick={() => toggleItemChecklist(index)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox
                        checked={item.marcado}
                        className="w-6 h-6 pointer-events-none"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${item.marcado ? 'text-green-700' : 'text-gray-900'}`}>
                          {index + 1}. {item.item}
                        </h3>
                        {item.obrigatorio && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      {item.observacao && (
                        <p className="text-sm text-gray-600 italic mt-2">
                          📌 {item.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (modoCliente && !checklistClienteAtual) {
    const templatesParaSeleção = templates.filter(t => t.ativo);

    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={voltarParaLista}
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Novo Checklist de Cliente
              </h1>
              <p className="text-gray-600">
                Selecione um template e preencha os dados do cliente
              </p>
            </div>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Selecionar Cliente *
                </label>
                <Select
                  value={formularioCliente.cliente_nome}
                  onValueChange={selecionarCliente}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Escolha um cliente cadastrado" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cpf ? `(CPF: ${cliente.cpf})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formularioCliente.cliente_nome && formularioCliente.cliente_cpf && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Cliente selecionado:</strong> {formularioCliente.cliente_nome}
                    </p>
                    <p className="text-sm text-blue-700">
                      CPF: {formularioCliente.cliente_cpf}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Selecione o Template *
                </label>
                <Select
                  value={formularioCliente.template_id}
                  onValueChange={selecionarTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um template de checklist" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesParaSeleção.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {getBancoLabel(template.banco)} - {template.tipo_projeto} ({template.itens_checklist?.length || 0} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formularioCliente.template_id && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Template selecionado:
                  </p>
                  <p className="text-sm text-blue-700">
                    {templates.find(t => t.id === formularioCliente.template_id)?.nome_template}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={criarChecklistCliente}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={!formularioCliente.cliente_nome || !formularioCliente.template_id}
                >
                  <UserCheck className="w-5 h-5 mr-2" />
                  Criar Checklist
                </Button>
                <Button
                  onClick={voltarParaLista}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={dialogoExclusao.aberto} onOpenChange={(aberto) => !aberto && setDialogoExclusao({ aberto: false, tipo: null, id: null, nome: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogoExclusao.tipo === "template" 
                ? `Tem certeza que deseja excluir o template "${dialogoExclusao.nome}"? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja excluir o checklist do cliente "${dialogoExclusao.nome}"? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={dialogoExclusao.tipo === "template" ? excluirTemplate : excluirChecklistCliente}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!mensagemErro} onOpenChange={(aberto) => !aberto && setMensagemErro("")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription>
              {mensagemErro}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMensagemErro("")}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-indigo-600" />
              Checklist de Projetos
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie templates e checklists de clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={iniciarChecklistCliente}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="w-5 h-5 mr-2" />
              Checklist de Cliente
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={iniciarNovo}>
                  <FileText className="w-4 h-4 mr-2" />
                  Template Personalizado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => criarTemplateModelo("bradesco_custeio_pecuario")}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Modelo Bradesco - Custeio Pecuário
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Seção de Checklists de Clientes */}
        {checklistsClientes.length > 0 && !modoEdicao && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-green-600" />
              Checklists de Clientes
            </h2>
            <div className="grid gap-4">
              {checklistsClientes.map(checklist => {
                const totalItens = checklist.itens_checklist?.length || 0;
                const itensMarcados = checklist.itens_checklist?.filter(item => item.marcado).length || 0;
                const progresso = totalItens > 0 ? Math.round((itensMarcados / totalItens) * 100) : 0;

                return (
                  <Card key={checklist.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <UserCheck className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {checklist.cliente_nome}
                            </h3>
                            {checklist.concluido && (
                              <Badge className="bg-green-100 text-green-700">
                                ✓ Concluído
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-blue-100 text-blue-700">
                              {getBancoLabel(checklist.banco)}
                            </Badge>
                            <Badge variant="outline">
                              {checklist.tipo_projeto}
                            </Badge>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                              <span>Progresso: {itensMarcados}/{totalItens} itens</span>
                              <span className="font-semibold">{progresso}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${progresso}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => abrirChecklistCliente(checklist)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => confirmarExclusaoChecklist(checklist.id, checklist.cliente_nome)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Seção de Templates */}
        {!modoEdicao && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Templates de Checklist
            </h2>
          </div>
        )}

        {modoEdicao ? (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {templateEditando ? "Editar Checklist" : "Novo Checklist"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Banco *
                  </label>
                  <Select
                    value={formulario.banco}
                    onValueChange={(value) => setFormulario(prev => ({ ...prev, banco: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map(banco => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Projeto *
                  </label>
                  <Input
                    placeholder="Ex: Custeio Agrícola, Investimento..."
                    value={formulario.tipo_projeto}
                    onChange={(e) => setFormulario(prev => ({ ...prev, tipo_projeto: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nome do Template *
                </label>
                <Input
                  placeholder="Ex: Checklist Custeio BB Private 2026"
                  value={formulario.nome_template}
                  onChange={(e) => setFormulario(prev => ({ ...prev, nome_template: e.target.value }))}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Itens do Checklist
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Novo Item
                    </label>
                    <Input
                      placeholder="Ex: Certidão de Regularidade Ambiental"
                      value={novoItem.item}
                      onChange={(e) => setNovoItem(prev => ({ ...prev, item: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observação (opcional)
                    </label>
                    <Textarea
                      placeholder="Observações sobre este item..."
                      value={novoItem.observacao}
                      onChange={(e) => setNovoItem(prev => ({ ...prev, observacao: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={novoItem.obrigatorio}
                      onCheckedChange={(checked) => setNovoItem(prev => ({ ...prev, obrigatorio: checked }))}
                    />
                    <label className="text-sm text-gray-700">
                      Item obrigatório
                    </label>
                  </div>

                  <Button
                    onClick={adicionarItem}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {formulario.itens_checklist.length > 0 && (
                  <div className="space-y-2">
                    {formulario.itens_checklist.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-white border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.item}</p>
                            {item.obrigatorio && (
                              <Badge variant="outline" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-sm text-gray-600 mt-1">{item.observacao}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => removerItem(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={salvarTemplate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Template
                </Button>
                <Button
                  onClick={cancelarEdicao}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Filtrar por Banco
                  </label>
                  <Select
                    value={filtros.banco}
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, banco: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Bancos</SelectItem>
                      {bancos.map(banco => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Buscar Tipo de Projeto
                  </label>
                  <Input
                    placeholder="Digite para buscar..."
                    value={filtros.tipoProjeto}
                    onChange={(e) => setFiltros(prev => ({ ...prev, tipoProjeto: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 mt-4">Carregando checklists...</p>
              </div>
            ) : templatesFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum checklist encontrado
                </h3>
                <p className="text-gray-500 mb-6">
                  Crie seu primeiro checklist de projeto
                </p>
                <Button onClick={iniciarNovo} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Checklist
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {templatesFiltrados.map(template => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {template.nome_template}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className="bg-indigo-100 text-indigo-700">
                              {getBancoLabel(template.banco)}
                            </Badge>
                            <Badge variant="outline">
                              {template.tipo_projeto}
                            </Badge>
                            {template.itens_checklist?.length > 0 && (
                              <Badge variant="outline" className="text-gray-600">
                                {template.itens_checklist.length} itens
                              </Badge>
                            )}
                          </div>

                          {template.itens_checklist?.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {template.itens_checklist.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                  <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                                  <span>{item.item}</span>
                                  {item.obrigatorio && (
                                    <span className="text-xs text-indigo-600">(obrigatório)</span>
                                  )}
                                </div>
                              ))}
                              {template.itens_checklist.length > 3 && (
                                <p className="text-xs text-gray-500 ml-4">
                                  + {template.itens_checklist.length - 3} itens
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => iniciarEdicao(template)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => confirmarExclusaoTemplate(template.id, template.nome_template)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </>
  );
}