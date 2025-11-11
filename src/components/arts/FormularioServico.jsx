
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, Download, FileText, Map, Files, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CurrencyInput from "../projeto/CurrencyInput";
import { addDays, format } from 'date-fns';
import { formatarNomeProprio, validarCPF, validarCNPJ, formatarCPF, formatarCNPJ, formatarContrato } from '@/components/lib/formatters';

import MultiAnexoUpload from "./MultiAnexoUpload";

const UploadPrivateFile = async ({ file }) => {
    console.log("Mock UploadPrivateFile called for:", file.name);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { file_uri: `mock-s3-path/${Date.now()}-${file.name}` };
};

const CreateFileSignedUrl = async ({ file_uri, expires_in }) => {
    console.log("Mock CreateFileSignedUrl called for:", file_uri, "expires_in:", expires_in);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { signed_url: `https://example.com/download?file=${encodeURIComponent(file_uri)}&token=mock-token` };
};

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "aguardando_cliente", label: "Aguardando Cliente" },
  { value: "aguardando_orgao", label: "Aguardando Órgão" },
  { value: "concluido", label: "Concluido" },
  { value: "cancelado", label: "Cancelado" }
];

const PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" }
];

const ATIVIDADE_OPTIONS = [
  { value: "soja_safra_verao", label: "Soja Safra Verão" },
  { value: "milho_safrinha", label: "Milho Safrinha" },
  { value: "sorgo_safrinha", label: "Sorgo Safrinha" },
  { value: "cana_de_acucar", label: "Cana-de-Açúcar" },
  { value: "forrageiras", label: "Forrageiras" }
];

const TIPO_SERVICO_OPTIONS = [
  { value: "so_assistencia", label: "Só Assistência" },
  { value: "so_projeto", label: "Só Projeto" },
  { value: "projeto_e_assistencia", label: "Projeto e Assistência" }
];

const MODELO_DEFESA_OPTIONS = [
  { value: "nenhum", label: "Nenhum" },
  { value: "defesa_simples", label: "Defesa Simples" },
  { value: "defesa_com_divergencia", label: "Defesa com Divergência" }
];

const FormSection = ({ title, children, layout = "grid" }) => (
    <div className="pt-3 border-t border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-1.5 mt-2 leading-tight">{title}</h3>
        {layout === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-3">
              {children}
          </div>
        ) : (
          <div>{children}</div>
        )}
    </div>
);

export default function FormularioServico({ servicoInicial = {}, onSubmit }) {
    const [dados, setDados] = useState({
        status: "aberto",
        prioridade: null,
        data_notificacao: "",
        prazo: "", // This is now 'Data de Preenchimento', not necessarily 'prazo'
        gerou_auto_infracao: false,
        cliente_nome: "",
        cliente_cpf_cnpj: "",
        responsavel_empreendimento_nome: "",
        responsavel_empreendimento_cpf_cnpj: "",
        cliente_e_responsavel_iguais: false,
        
        atividade_notificada: "",
        tipo_servico_notificado: "",
        area_notificada_ha: null,
        safra_notificada: "",
        contrato_notificado: "",
        
        real_igual_notificada: true,

        atividade_real: "",
        tipo_servico_real: "",
        area_real_ha: null,
        safra_real: "",
        contrato_real: "",

        imoveis: [],
        art_feita: false,
        qtd_arts: 1, 
        arts: [],

        anexo_notificacao: null,
        anexos_arts: [],
        anexos_kml: [],
        anexos_outros: [], // New state for 'Outros' attachments
    
        necessita_defesa: false,
        modelo_defesa: "nenhum",
        defesa_apresentada: false,
        atribuido_para_nome: "",
        atribuido_para_email: "",
        argumentacao_defesa: "",
        ...servicoInicial,
    });
    
    const [erros, setErros] = useState({
      cliente_cpf_cnpj: '',
      responsavel_empreendimento_cpf_cnpj: '',
    });

    const [carCopiado, setCarCopiado] = useState({});
    const textareaRef = useRef(null);
    const [isManuallyResized, setIsManuallyResized] = useState(false);

    const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([
        { nome: "Rodrigo Nascimento", email: "rodrigo@cerradoconsultoria.com" },
        { nome: "Victor Cézar", email: "victor@cerradoconsultoria.com" }
    ]);

    useEffect(() => {
        // The original logic was to calculate 'prazo' based on 'data_notificacao'.
        // If 'prazo' is now "Data de Preenchimento", this auto-calculation might not be desired.
        // Assuming the new field is simply a date input, and this auto-calculation is removed or re-evaluated
        // if a new field for 'prazo' is introduced later.
        // For now, removing this specific effect as the field purpose has changed.
        /*
        if (dados.data_notificacao) {
            const dataNotificacao = new Date(dados.data_notificacao + 'T00:00:00');
            const novoPrazo = addDays(dataNotificacao, 15);
            setDados(prev => ({ ...prev, prazo: format(novoPrazo, 'yyyy-MM-dd') }));
        }
        */
    }, [dados.data_notificacao]);

    useEffect(() => {
        if (dados.cliente_e_responsavel_iguais) {
            setDados(prev => ({
                ...prev,
                responsavel_empreendimento_nome: prev.cliente_nome,
                responsavel_empreendimento_cpf_cnpj: prev.cliente_cpf_cnpj,
            }));
            setErros(prev => ({ ...prev, responsavel_empreendimento_cpf_cnpj: '' }));
        }
    }, [dados.cliente_e_responsavel_iguais, dados.cliente_nome, dados.cliente_cpf_cnpj]);

    useEffect(() => {
        if (dados.real_igual_notificada) {
            setDados(prev => ({
                ...prev,
                atividade_real: prev.atividade_notificada,
                tipo_servico_real: prev.tipo_servico_notificado,
                area_real_ha: prev.area_notificada_ha,
                safra_real: prev.safra_notificada,
                contrato_real: prev.contrato_notificado,
            }));
        }
    }, [
        dados.real_igual_notificada, 
        dados.atividade_notificada, 
        dados.tipo_servico_notificado, 
        dados.area_notificada_ha, 
        dados.safra_notificada,
        dados.contrato_notificado
    ]);

    useEffect(() => {
        if (dados.art_feita && dados.qtd_arts > 0) {
            const novasArts = [...dados.arts];
            
            while (novasArts.length < dados.qtd_arts) {
                novasArts.push({
                    numero: "",
                    data: "",
                    valor: 0,
                    paga: false,
                    data_pagamento: "",
                });
            }
            
            while (novasArts.length > dados.qtd_arts) {
                novasArts.pop();
            }
            
            setDados(prev => ({ ...prev, arts: novasArts }));
        } else if (!dados.art_feita) {
            setDados(prev => ({ ...prev, arts: [] }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dados.art_feita, dados.qtd_arts]);

    useEffect(() => {
        if (textareaRef.current && !isManuallyResized) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.max(textareaRef.current.scrollHeight, 120);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [dados.argumentacao_defesa, isManuallyResized]);

    const handleInputChange = (field, value) => {
        setDados(prev => ({ ...prev, [field]: value }));
    };

    const handleNomeBlur = (field, value) => {
      const nomeFormatado = formatarNomeProprio(value);
      handleInputChange(field, nomeFormatado);
    };

    const handleImovelChange = (index, field, value) => {
        const novosImoveis = [...dados.imoveis];
        novosImoveis[index][field] = value;
        handleInputChange('imoveis', novosImoveis);
    };

    const handleImovelNomeBlur = (index, value) => {
        const nomeFormatado = formatarNomeProprio(value);
        handleImovelChange(index, 'nome_imovel', nomeFormatado);
    };

    const handleContratoBlur = (field, value) => {
        const contratoFormatado = formatarContrato(value);
        handleInputChange(field, contratoFormatado);
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

    const handleArtChange = (index, field, value) => {
        const novasArts = [...dados.arts];
        novasArts[index][field] = value;
        handleInputChange('arts', novasArts);
    };

    const handleAtribuicaoChange = (nomeCompleto) => {
        const usuarioSelecionado = usuariosDisponiveis.find(u => u.nome === nomeCompleto);
        setDados(prev => ({
            ...prev,
            atribuido_para_nome: nomeCompleto,
            atribuido_para_email: usuarioSelecionado?.email || ""
        }));
    };

    const handleModeloDefesaChange = (modelo) => {
        let textoFinal = "";
        
        const primeiraArt = dados.arts && dados.arts.length > 0 ? dados.arts[0] : null;
        const primeiroImovel = dados.imoveis && dados.imoveis.length > 0 ? dados.imoveis[0] : null;

        const artNumero = primeiraArt?.numero || "[número da ART]";
        let artPagoTexto = "";
        if (primeiraArt?.paga && primeiraArt?.data_pagamento) {
            try {
                const dataPagamentoFormatada = format(new Date(primeiraArt.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy');
                artPagoTexto = `A ART encontra-se paga em ${dataPagamentoFormatada}.`;
            } catch (e) {
                artPagoTexto = "A ART encontra-se paga.";
            }
        }
        
        if (modelo === 'defesa_simples') {
            textoFinal = `Solicito o cancelamento da notificação nº ${dados.numero_notificacao || '[número da notificação]'}, tendo em vista que a irregularidade foi regularizada por meio da ART nº ${artNumero}. ${artPagoTexto}`;
        } else if (modelo === 'defesa_com_divergencia') {
            const numeroNotificacao = dados.numero_notificacao || '[numero_notificacao]';

            let clausulaArtPagamento = `através da emissão da Anotação de Responsabilidade Técnica (ART) nº ${artNumero}`;
            if (primeiraArt?.paga && primeiraArt?.data_pagamento) {
                try {
                    const dataPagamentoFormatada = format(new Date(primeiraArt.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy');
                    clausulaArtPagamento = `através da emissão e pagamento da Anotação de Responsabilidade Técnica (ART) nº ${artNumero}, quitada em ${dataPagamentoFormatada}`;
                } catch (e) {
                    clausulaArtPagamento = `através da emissão e pagamento da Anotação de Responsabilidade Técnica (ART) nº ${artNumero}`;
                }
            }

            const areaReal = parseFloat(dados.area_real_ha) || 0;
            const areaNotificada = parseFloat(dados.area_notificada_ha) || 0;
            const atividadeReal = dados.atividade_real || '';
            const atividadeNotificada = dados.atividade_notificada || '';
            const safraReal = dados.safra_real || '[safra real]';
            const contratoReal = dados.contrato_real || '';

            const areaRealFormatada = areaReal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            const areaNotificadaFormatada = areaNotificada.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

            const atividadeRealLabel = getAtividadeLabel(atividadeReal) || '[atividade real]'; 
            const atividadeNotificadaLabel = getAtividadeLabel(atividadeNotificada) || '[atividade notificada]'; 

            const areaIgual = Math.abs(areaReal - areaNotificada) <= 0.01;
            const culturaIgual = atividadeReal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
                                dados.atividade_notificada.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            const clausulaContrato = contratoReal ? `, conforme contrato nº ${contratoReal}` : '';
            // FIX: Changed 'firstImovel.matricula' to 'primeiroImovel.matricula'
            const clausulaMatricula = primeiroImovel?.matricula ? `, para a matrícula ${primeiroImovel.matricula}` : '';

            const paragrafo1 = `Solicita-se o cancelamento da notificação nº ${numeroNotificacao}, uma vez que a irregularidade apontada foi devidamente sanada ${clausulaArtPagamento}.`;

            let paragrafo2 = '';
            if (areaIgual && culturaIgual) {
                paragrafo2 = `Esclarece-se que a área efetivamente cultivada é compatível com a área notificada, totalizando ${areaRealFormatada} hectares de ${atividadeRealLabel} para a safra ${safraReal}${clausulaContrato}${clausulaMatricula}.`;
            } else if (areaIgual && !culturaIgual) {
                paragrafo2 = `Esclarece-se que a área é compatível (${areaRealFormatada} ha), porém a cultura correta é ${atividadeRealLabel}, e não ${atividadeNotificadaLabel}, para a safra ${safraReal}${clausulaContrato}${clausulaMatricula}.`;
            } else if (!areaIgual && culturaIgual) {
                paragrafo2 = `Esclarece-se que a cultura informada está correta (${atividadeRealLabel}), porém a área efetiva é de ${areaRealFormatada} ha, e não ${areaNotificadaFormatada} ha mencionados na notificação, para a safra ${safraReal}${clausulaContrato}${clausulaMatricula}.`;
            } else {
                paragrafo2 = `Esclarece-se que a cultura correta é ${atividadeRealLabel} e a área efetiva é ${areaRealFormatada} ha, em substituição aos ${areaNotificadaFormatada} ha de ${atividadeNotificadaLabel} citados na notificação, para a safra ${safraReal}${clausulaContrato}${clausulaMatricula}.`;
            }

            const paragrafo3 = `Desta forma, a ART anexada comprova a área real e a regularidade da cultura, prevalecendo sobre os dados da autuação.`;

            textoFinal = `${paragrafo1}\n\n${paragrafo2}\n\n${paragrafo3}`;
        } else if (modelo === 'nenhum') {
            textoFinal = "";
        }

        setIsManuallyResized(false);

        setDados(prev => ({
            ...prev,
            modelo_defesa: modelo,
            argumentacao_defesa: textoFinal.trim()
        }));
    };

    const ajustarQuantidadeArts = (incremento) => {
        const novaQuantidade = Math.max(1, dados.qtd_arts + incremento);
        handleInputChange('qtd_arts', novaQuantidade);
    };

    const adicionarImovel = () => {
        handleInputChange('imoveis', [...dados.imoveis, { nome_imovel: '', municipio: '', matricula: '', car_numero: '', area_cultivada: 0 }]);
    };

    const removerImovel = (index) => {
        if (window.confirm("Tem certeza que deseja remover este imóvel?")) {
            const novosImoveis = dados.imoveis.filter((_, i) => i !== index);
            handleInputChange('imoveis', novosImoveis);
        }
    };

    const copiarCAR = async (index) => {
        const carValue = dados.imoveis[index]?.car_numero?.trim();
        
        if (!carValue) {
            return;
        }

        try {
            await navigator.clipboard.writeText(carValue);
            
            setCarCopiado(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCarCopiado(prev => ({ ...prev, [index]: false }));
            }, 1500);
        } catch (error) {
            console.error('Erro ao copiar CAR:', error);
            // Fallback for browsers that don't support navigator.clipboard or if permission is denied
            const textArea = document.createElement('textarea');
            textArea.value = carValue;
            document.body.appendChild(textArea);
            textArea.select();
            document.body.removeChild(textArea);
            // Still show visual feedback
            setCarCopiado(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCarCopiado(prev => ({ ...prev, [index]: false }));
            }, 1500);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const hasErrors = Object.values(erros).some(error => error !== '');
        if (hasErrors) {
            alert('Por favor, corrija os erros de validação antes de salvar.');
            return;
        }
        onSubmit(dados);
    };
    
    const areaTotal = dados.imoveis.reduce((acc, imovel) => acc + (parseFloat(imovel.area_cultivada) || 0), 0);

    const totalArts = dados.arts.length;
    const valorTotalArts = dados.arts.reduce((sum, art) => sum + (parseFloat(art.valor) || 0), 0);
    const artsPagas = dados.arts.filter(art => art.paga).length;

    const handleAnexoNotificacaoChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Arquivo muito grande. Tamanho máximo: 20MB');
            event.target.value = '';
            return;
        }

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
            handleInputChange('anexo_notificacao', fileMetadata);
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Erro ao fazer upload do arquivo. Tente novamente.');
        } finally {
            event.target.value = '';
        }
    };

    const handleDownloadAnexoNotificacao = async () => {
        if (!dados.anexo_notificacao?.url) return;
        try {
            const { signed_url } = await CreateFileSignedUrl({ 
                file_uri: dados.anexo_notificacao.url,
                expires_in: 300
            });
            const link = document.createElement('a');
            link.href = signed_url;
            link.download = dados.anexo_notificacao.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao baixar arquivo:', error);
            alert('Erro ao baixar arquivo. Tente novamente.');
        }
    };

    const handleRemoverAnexoNotificacao = () => {
        if (window.confirm(`Tem certeza que deseja remover o arquivo "${dados.anexo_notificacao?.file_name}"?`)) {
            handleInputChange('anexo_notificacao', null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getPrioridadeLabel = () => {
        if (!dados.prioridade) return null;
        return PRIORIDADE_OPTIONS.find(o => o.value === dados.prioridade)?.label ?? '';
    };

    const getStatusLabel = () => {
        if (!dados.status) return null;
        return STATUS_OPTIONS.find(o => o.value === dados.status)?.label ?? '';
    };

    const getAtividadeLabel = (value) => {
        if (!value) return null;
        return ATIVIDADE_OPTIONS.find(o => o.value === value)?.label ?? '';
    };

    const getTipoServicoLabel = (value) => {
        if (!value) return null;
        return TIPO_SERVICO_OPTIONS.find(o => o.value === value)?.label ?? '';
    };

    return (
        <div className="service-details--compact">
            <TooltipProvider>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <FormSection title="Cabeçalho do Serviço">
                        <div className="space-y-1">
                            <Label htmlFor="status" className="mb-1">Status</Label>
                            <Select value={dados.status} onValueChange={v => handleInputChange('status', v)}>
                                <SelectTrigger 
                                    id="status" 
                                    className="select-trigger"
                                    data-has-value={!!dados.status}
                                >
                                    <SelectValue>
                                        {getStatusLabel() || "Selecione o status"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="atribuido_para_nome" className="mb-1">Atribuir Para *</Label>
                            <Select value={dados.atribuido_para_nome} onValueChange={handleAtribuicaoChange} required>
                                <SelectTrigger 
                                    id="atribuido_para_nome"
                                    className="select-trigger"
                                    data-has-value={!!dados.atribuido_para_nome}
                                >
                                    <SelectValue>
                                        {dados.atribuido_para_nome || "Selecione um responsável"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {usuariosDisponiveis.map((usuario) => (
                                        <SelectItem key={usuario.email} value={usuario.nome}>
                                            {usuario.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="prioridade" className="mb-1">Prioridade</Label>
                            <Select value={dados.prioridade || ""} onValueChange={v => handleInputChange('prioridade', v || null)}>
                                <SelectTrigger 
                                    id="prioridade"
                                    className="select-trigger"
                                    data-has-value={!!dados.prioridade}
                                >
                                    <SelectValue>
                                        {getPrioridadeLabel() || "Selecione"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORIDADE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="prazo" className="mb-1">Data de Preenchimento</Label>
                            <Input id="prazo" type="date" value={dados.prazo} onChange={e => handleInputChange('prazo', e.target.value)} />
                        </div>
                    </FormSection>

                    <FormSection title="Dados da Notificação">
                        <div className="space-y-1">
                            <Label htmlFor="numero_notificacao" className="mb-1">Nº da Notificação *</Label>
                            <Input id="numero_notificacao" value={dados.numero_notificacao || ''} onChange={e => handleInputChange('numero_notificacao', e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="data_notificacao" className="mb-1">Data da Notificação *</Label>
                            <Input id="data_notificacao" type="date" value={dados.data_notificacao || ''} onChange={e => handleInputChange('data_notificacao', e.target.value)} required />
                        </div>
                        <div className="flex items-center gap-2 self-center">
                            <Switch id="auto-infracao" checked={dados.gerou_auto_infracao} onCheckedChange={v => handleInputChange('gerou_auto_infracao', v)} />
                            <Label htmlFor="auto-infracao" className="m-0">Gerou Auto de Infração?</Label>
                        </div>
                    </FormSection>
                    
                    <FormSection title="Partes Envolvidas">
                        <div className="space-y-1">
                            <Label htmlFor="cliente_nome" className="mb-1">Nome do Cliente Notificado *</Label>
                            <Input 
                                id="cliente_nome"
                                value={dados.cliente_nome} 
                                onChange={e => handleInputChange('cliente_nome', e.target.value)} 
                                onBlur={e => handleNomeBlur('cliente_nome', e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="cliente_cpf_cnpj" className="mb-1">CPF/CNPJ do Cliente</Label>
                            <Input 
                                id="cliente_cpf_cnpj"
                                value={dados.cliente_cpf_cnpj} 
                                onChange={e => handleInputChange('cliente_cpf_cnpj', e.target.value)}
                                onBlur={e => handleDocumentoBlur('cliente_cpf_cnpj', e.target.value)}
                            />
                            {erros.cliente_cpf_cnpj && <p className="text-sm text-red-600 mt-1">{erros.cliente_cpf_cnpj}</p>}
                        </div>
                        <div className="flex items-center gap-2 self-center">
                            <Switch id="mesma-pessoa" checked={dados.cliente_e_responsavel_iguais} onCheckedChange={v => handleInputChange('cliente_e_responsavel_iguais', v)} />
                            <Label htmlFor="mesma-pessoa" className="m-0">Cliente e Responsável são a mesma pessoa?</Label>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="responsavel_empreendimento_nome" className="mb-1">Nome do Responsável pelo Empreendimento</Label>
                            <Input 
                                id="responsavel_empreendimento_nome"
                                value={dados.responsavel_empreendimento_nome} 
                                onChange={e => handleInputChange('responsavel_empreendimento_nome', e.target.value)} 
                                onBlur={e => handleNomeBlur('responsavel_empreendimento_nome', e.target.value)}
                                disabled={dados.cliente_e_responsavel_iguais} 
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="responsavel_empreendimento_cpf_cnpj" className="mb-1">CPF/CNPJ do Responsável</Label>
                            <Input 
                                id="responsavel_empreendimento_cpf_cnpj"
                                value={dados.responsavel_empreendimento_cpf_cnpj} 
                                onChange={e => handleInputChange('responsavel_empreendimento_cpf_cnpj', e.target.value)}
                                onBlur={e => handleDocumentoBlur('responsavel_empreendimento_cpf_cnpj', e.target.value)}
                                disabled={dados.cliente_e_responsavel_iguais} 
                            />
                            {erros.responsavel_empreendimento_cpf_cnpj && <p className="text-sm text-red-600 mt-1">{erros.responsavel_empreendimento_cpf_cnpj}</p>}
                        </div>
                    </FormSection>

                    <FormSection title="Atividade e Serviço" layout="custom">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 items-start">
                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                <h4 className="font-semibold text-gray-700 text-center">Atividade Notificada</h4>
                                <div className="space-y-1">
                                    <Label className="mb-1">Atividade Notificada *</Label>
                                    <Select value={dados.atividade_notificada} onValueChange={v => handleInputChange('atividade_notificada', v)} required>
                                        <SelectTrigger 
                                            className="select-trigger"
                                            data-has-value={!!dados.atividade_notificada}
                                        >
                                            <SelectValue>
                                                {getAtividadeLabel(dados.atividade_notificada) || "Selecione..."}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ATIVIDADE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Tipo de Serviço *</Label>
                                    <Select value={dados.tipo_servico_notificado} onValueChange={v => handleInputChange('tipo_servico_notificado', v)} required>
                                        <SelectTrigger 
                                            className="select-trigger"
                                            data-has-value={!!dados.tipo_servico_notificado}
                                        >
                                            <SelectValue>
                                                {getTipoServicoLabel(dados.tipo_servico_notificado) || "Selecione..."}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIPO_SERVICO_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Área Notificada (ha) *</Label>
                                    <Input type="number" step="0.01" min="0" value={dados.area_notificada_ha || ''} onChange={e => handleInputChange('area_notificada_ha', parseFloat(e.target.value))} required placeholder="Ex: 150.50"/>
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Safra *</Label>
                                    <Input value={dados.safra_notificada || ''} onChange={e => handleInputChange('safra_notificada', e.target.value)} required placeholder="Ex: 2024/2025" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Contrato nº</Label>
                                    <Input 
                                        value={dados.contrato_notificado || ''} 
                                        onChange={e => handleInputChange('contrato_notificado', e.target.value)}
                                        onBlur={e => handleContratoBlur('contrato_notificado', e.target.value)}
                                        placeholder="Ex.: 40/07145-6"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center h-full pt-10 md:pt-0">
                                <Label htmlFor="real-igual" className="text-center mb-1 font-medium">Real igual à notificada?</Label>
                                <Switch id="real-igual" checked={dados.real_igual_notificada} onCheckedChange={v => handleInputChange('real_igual_notificada', v)} />
                            </div>

                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                <h4 className="font-semibold text-gray-700 text-center">Atividade Real</h4>
                                <div className="space-y-1">
                                    <Label className="mb-1">Atividade Real *</Label>
                                    <Select value={dados.atividade_real} onValueChange={v => handleInputChange('atividade_real', v)} required={!dados.real_igual_notificada} disabled={dados.real_igual_notificada}>
                                        <SelectTrigger 
                                            className="select-trigger"
                                            data-has-value={!!dados.atividade_real}
                                        >
                                            <SelectValue>
                                                {getAtividadeLabel(dados.atividade_real) || "Selecione..."}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ATIVIDADE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Tipo de Serviço *</Label>
                                    <Select value={dados.tipo_servico_real} onValueChange={v => handleInputChange('tipo_servico_real', v)} required={!dados.real_igual_notificada} disabled={dados.real_igual_notificada}>
                                        <SelectTrigger 
                                            className="select-trigger"
                                            data-has-value={!!dados.tipo_servico_real}
                                        >
                                            <SelectValue>
                                                {getTipoServicoLabel(dados.tipo_servico_real) || "Selecione..."}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIPO_SERVICO_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Área Real (ha) *</Label>
                                    <Input type="number" step="0.01" min="0" value={dados.area_real_ha || ''} onChange={e => handleInputChange('area_real_ha', parseFloat(e.target.value))} required={!dados.real_igual_notificada} disabled={dados.real_igual_notificada} placeholder="Ex: 150.50" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Safra *</Label>
                                    <Input value={dados.safra_real || ''} onChange={e => handleInputChange('safra_real', e.target.value)} required={!dados.real_igual_notificada} disabled={dados.real_igual_notificada} placeholder="Ex: 2024/2025" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="mb-1">Contrato nº</Label>
                                    <Input 
                                        value={dados.contrato_real || ''} 
                                        onChange={e => handleInputChange('contrato_real', e.target.value)}
                                        onBlur={e => handleContratoBlur('contrato_real', e.target.value)}
                                        disabled={dados.real_igual_notificada}
                                        placeholder="Ex.: 40/07145-6"
                                    />
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <div className="pt-3 border-t border-green-200">
                        <h3 className="text-lg font-semibold text-green-900 mb-1.5 mt-2 leading-tight">Imóveis Notificados</h3>
                        {dados.imoveis.map((imovel, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-green-50/50 mb-2">
                                <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-start">
                                    <div className="col-span-12 md:col-span-6 xl:col-span-5 space-y-1">
                                        <Label className="text-sm font-medium">Nome do Imóvel</Label>
                                        <Input 
                                            placeholder="Nome do Imóvel" 
                                            value={imovel.nome_imovel} 
                                            onChange={e => handleImovelChange(index, 'nome_imovel', e.target.value)}
                                            onBlur={e => handleImovelNomeBlur(index, e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    
                                    <div className="col-span-6 md:col-span-3 xl:col-span-3 space-y-1">
                                        <Label className="text-sm font-medium">Município</Label>
                                        <Input 
                                            placeholder="Município" 
                                            value={imovel.municipio} 
                                            onChange={e => handleImovelChange(index, 'municipio', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    
                                    <div className="col-span-6 md:col-span-2 xl:col-span-2 space-y-1">
                                        <Label className="text-sm font-medium">Matrícula</Label>
                                        <Input 
                                            placeholder="Matrícula" 
                                            value={imovel.matricula} 
                                            onChange={e => handleImovelChange(index, 'matricula', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    
                                    <div className="col-span-12 md:col-span-1 xl:col-span-2 space-y-1">
                                        <Label className="text-sm font-medium">CAR nº</Label>
                                        <Input 
                                            placeholder="CAR nº" 
                                            value={imovel.car_numero} 
                                            onChange={e => handleImovelChange(index, 'car_numero', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="col-span-12 md:col-span-6 xl:col-span-5 space-y-1">
                                        <Label className="text-sm font-medium">Área Cultivada (ha)</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="Área Cultivada (ha)" 
                                            value={imovel.area_cultivada} 
                                            onChange={e => handleImovelChange(index, 'area_cultivada', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    
                                    <div className="col-span-6 md:col-span-3 xl:col-span-3"></div>
                                    
                                    <div className="col-span-6 md:col-span-2 xl:col-span-2"></div>
                                    
                                    <div className="col-span-12 md:col-span-1 xl:col-span-2">
                                        <div className="flex items-center">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copiarCAR(index)}
                                                        disabled={!imovel.car_numero?.trim()}
                                                        className="h-8 px-3 text-xs"
                                                        aria-label="Copiar número do CAR"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                copiarCAR(index);
                                                            }
                                                        }}
                                                    >
                                                        {carCopiado[index] ? (
                                                            <>
                                                                <Check className="w-3 h-3 mr-1" />
                                                                Copiado
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3 mr-1" />
                                                                Copiar
                                                            </>
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Copiar CAR</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="flex justify-end mt-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removerImovel(index)}
                                                        className="h-7 w-7 text-gray-500 hover:text-red-600"
                                                        aria-label="Remover imóvel"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Remover imóvel</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-2">
                            <Button type="button" variant="outline" onClick={adicionarImovel}>
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Imóvel
                            </Button>
                            <p className="font-semibold text-green-800">Área Total: {areaTotal.toLocaleString('pt-BR')} ha</p>
                        </div>
                    </div>

                    <FormSection title="Dados da ART">
                        <div className="flex items-center gap-2 col-span-full">
                            <Switch id="art-feita" checked={dados.art_feita} onCheckedChange={v => handleInputChange('art_feita', v)} />
                            <Label htmlFor="art-feita" className="m-0">ART foi feita?</Label>
                        </div>
                        
                        {dados.art_feita && (
                            <>
                                <div className="space-y-1 col-span-full">
                                    <Label className="mb-1">Quantidade de ARTs</Label>
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="outline" size="sm" onClick={() => ajustarQuantidadeArts(-1)} disabled={dados.qtd_arts <= 1}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={dados.qtd_arts} 
                                            onChange={e => handleInputChange('qtd_arts', parseInt(e.target.value) || 1)}
                                            className="w-20 text-center"
                                        />
                                        <Button type="button" variant="outline" size="sm" onClick={() => ajustarQuantidadeArts(1)}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                        <div className="text-sm text-green-600 ml-4">
                                            Total: {totalArts} ART(s) • Valor: R$ {valorTotalArts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Pagas: {artsPagas}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-full space-y-3">
                                    {dados.arts.map((art, index) => {
                                        return (
                                            <div key={index} className="p-3 border rounded-lg bg-green-50/50">
                                                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                                    ART #{index + 1}
                                                </h4>
                                                <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-end">
                                                    <div className="space-y-1 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                                                        <Label className="mb-1">ART nº *</Label>
                                                        <Input 
                                                            value={art.numero} 
                                                            onChange={e => handleArtChange(index, 'numero', e.target.value)} 
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-1 col-span-6 sm:col-span-3 lg:col-span-2">
                                                        <Label className="mb-1">Data da ART *</Label>
                                                        <Input 
                                                            type="date" 
                                                            value={art.data} 
                                                            onChange={e => handleArtChange(index, 'data', e.target.value)} 
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-1 col-span-6 sm:col-span-3 lg:col-span-2">
                                                        <Label className="mb-1">Valor da ART *</Label>
                                                        <CurrencyInput 
                                                            value={art.valor} 
                                                            onValueChange={v => handleArtChange(index, 'valor', v)} 
                                                            required
                                                        />
                                                    </div>

                                                    <div className="col-span-6 sm:col-span-4 lg:col-span-2 flex items-center gap-2 pb-1">
                                                        <Switch 
                                                            id={`art-paga-${index}`} 
                                                            checked={art.paga} 
                                                            onCheckedChange={v => handleArtChange(index, 'paga', v)} 
                                                        />
                                                        <Label htmlFor={`art-paga-${index}`} className="m-0">ART foi paga?</Label>
                                                    </div>
                                                    
                                                    {art.paga && (
                                                        <div className="space-y-1 col-span-6 sm:col-span-4 lg:col-span-2">
                                                            <Label className="mb-1">Data do Pagamento *</Label>
                                                            <Input 
                                                                type="date" 
                                                                value={art.data_pagamento} 
                                                                onChange={e => handleArtChange(index, 'data_pagamento', e.target.value)} 
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </FormSection>

                    <FormSection title="Anexos" layout="custom">
                        <div className="space-y-2 max-w-lg">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Notificação / Auto de Infração
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (dados.anexo_notificacao) {
                                                if (window.confirm('Já existe um arquivo. Deseja substituir?')) {
                                                    document.getElementById('anexo-notificacao-input').click();
                                                }
                                            } else {
                                                document.getElementById('anexo-notificacao-input').click();
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {!dados.anexo_notificacao ? (
                                        <div className="text-sm text-center text-gray-500 py-3 px-4 border-2 border-dashed rounded-lg">
                                            Nenhum arquivo adicionado.
                                        </div>
                                    ) : (
                                        <div className="border rounded-lg p-2 bg-gray-50">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="text-sm font-medium truncate">{dados.anexo_notificacao.file_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Badge variant="outline" className="text-xs">
                                                        {dados.anexo_notificacao.file_size ? formatFileSize(dados.anexo_notificacao.file_size) : ''}
                                                    </Badge>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7" 
                                                        onClick={handleDownloadAnexoNotificacao}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-red-600 hover:text-red-800" 
                                                        onClick={handleRemoverAnexoNotificacao}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <input
                                    id="anexo-notificacao-input"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleAnexoNotificacaoChange}
                                    className="hidden"
                                />
                                <p className="text-xs text-gray-500">
                                    Formatos: PDF, JPG, PNG (máx. 20MB)
                                </p>
                            </div>

                            <MultiAnexoUpload
                                label="CAR / Outros"
                                currentFiles={dados.anexos_outros}
                                onFilesChange={(files) => handleInputChange('anexos_outros', files)}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls,.zip,.rar"
                                icon={Files}
                            />

                            {dados.art_feita && (
                                <>
                                    <MultiAnexoUpload
                                        label="ART's" // Renamed label
                                        currentFiles={dados.anexos_arts}
                                        onFilesChange={(files) => handleInputChange('anexos_arts', files)}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        icon={Files}
                                    />
                                    <MultiAnexoUpload
                                        label="Áreas (kml/kmz)" // Renamed label
                                        currentFiles={dados.anexos_kml}
                                        onFilesChange={(files) => handleInputChange('anexos_kml', files)}
                                        accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
                                        icon={Map}
                                    />
                                </>
                            )}
                        </div>
                    </FormSection>

                    <FormSection title="Defesa">
                        <div className="flex items-center gap-2 col-span-full">
                            <Switch id="necessita-defesa" checked={dados.necessita_defesa} onCheckedChange={v => handleInputChange('necessita_defesa', v)} />
                            <Label htmlFor="necessita-defesa" className="m-0">Necessário fazer Defesa?</Label>
                        </div>
                        {dados.necessita_defesa && (
                            <>
                                <div className="space-y-1 col-span-full">
                                    <Label className="mb-1">Modelo de Defesa</Label>
                                    <Select value={dados.modelo_defesa} onValueChange={handleModeloDefesaChange}>
                                        <SelectTrigger 
                                            className="select-trigger"
                                            data-has-value={!!dados.modelo_defesa && dados.modelo_defesa !== 'nenhum'}
                                        >
                                            <SelectValue>
                                                {MODELO_DEFESA_OPTIONS.find(o => o.value === dados.modelo_defesa)?.label || "Selecione um modelo (opcional)"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MODELO_DEFESA_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 col-span-full">
                                    <Label className="mb-1">Argumentação da Defesa *</Label>
                                    <Textarea
                                        ref={textareaRef}
                                        value={dados.argumentacao_defesa || ''}
                                        onChange={e => handleInputChange('argumentacao_defesa', e.target.value)}
                                        onPointerDown={() => setIsManuallyResized(true)}
                                        required
                                        className="resize-y min-h-[120px] max-h-[60vh] leading-normal whitespace-pre-wrap"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2"><Switch id="defesa-apresentada" checked={dados.defesa_apresentada} onCheckedChange={v => handleInputChange('defesa_apresentada', v)} /><Label htmlFor="defesa-apresentada" className="m-0">Defesa foi apresentada?</Label></div>
                                {dados.defesa_apresentada && <div className="space-y-1"><Label className="mb-1">Data da Defesa *</Label><Input type="date" value={dados.data_defesa || ''} onChange={e => handleInputChange('data_defesa', e.target.value)} required/></div>}
                                <div className="space-y-1"><Label className="mb-1">Processo nº</Label><Input value={dados.processo_numero || ''} onChange={e => handleInputChange('processo_numero', e.target.value)} /></div>
                            </>
                        )}
                        <div className="space-y-1 col-span-full"><Label className="mb-1">Observação e Acompanhamento</Label><Textarea value={dados.observacoes || ''} onChange={e => handleInputChange('observacoes', e.target.value)} /></div>
                    </FormSection>

                    <div className="flex justify-end pt-3">
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 shadow-lg px-8 py-3 text-base">
                            <Save className="w-5 h-5 mr-2" />
                            {servicoInicial.id ? 'Atualizar Serviço' : 'Salvar Serviço'}
                        </Button>
                    </div>
                </form>
            </TooltipProvider>

            <style jsx>{`
                .select-trigger[data-has-value="true"] .placeholder {
                    display: none !important;
                }
                .select-trigger .value {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            `}</style>
        </div>
    );
}
