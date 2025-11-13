
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Loader2, Calculator, Edit, Plus, Trash2 } from "lucide-react";
import CurrencyInput from "./CurrencyInput";
import PercentageInput from "./PercentageInput";
import { format } from "date-fns";
import { formatarNomeProprio } from "../lib/formatters";

const BANCOS = [
  { value: "banco_do_brasil", label: "Banco do Brasil" },
  { value: "caixa", label: "Caixa Econômica Federal" },
  { value: "bradesco", label: "Bradesco" },
  { value: "sicoob", label: "Sicoob" },
  { value: "sicredi", label: "Sicredi" },
  { value: "santander", label: "Santander" },
  { value: "banco_nordeste", label: "Banco do Nordeste" },
  { value: "outros", label: "Outros" }
];

const STATUS_OPTIONS = [
  { value: "em_analise", label: "Em Análise" },
  { value: "parado", label: "Parado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" }
];

const ART_STATUS_OPTIONS = [
  { value: "nao_se_aplica", label: "Não se aplica" },
  { value: "a_fazer", label: "A fazer" },
  { value: "feita", label: "Feita" },
  { value: "paga", "label": "Paga" }
];

const TIPO_PAGAMENTO_OPTIONS = [
  { value: "mensal", label: "Mensal" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const TIPO_CALCULO_AUTO_OPTIONS = [
  { value: "posfixadas", label: "Pós-Fixadas (crescentes pela taxa)" },
  { value: "sac", label: "SAC (Amortização Constante)" },
  { value: "price", label: "PRICE (Parcela Constante)" }
];

// Helper functions for area formatting
const formatarAreaHa = (valor) => {
  if (!valor && valor !== 0) return '';
  const numero = parseFloat(valor);
  if (isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parsearAreaHa = (valorFormatado) => {
  if (!valorFormatado) return null;
  const valorLimpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? null : numero;
};

export default function FormularioProjeto({ onSubmit, isLoading, projeto = null }) {
  const [dadosProjeto, setDadosProjeto] = useState(projeto || {
    nome_cliente: "",
    data_protocolo: "",
    status: "em_analise",
    banco: "",
    safra: "",
    numero_contrato: "",
    item_financiado: "",
    fonte_recurso: "",
    taxa_juros: null,
    vencimento_final: "",
    agencia: "",
    valor_financiado: null,
    valor_receber: null,
    data_pagamento_astec: "",
    status_art: "nao_se_aplica",
    observacoes: "",
    quantidade_parcelas: "",
    tipo_pagamento: "anual",
    data_primeira_parcela: "",
    tipo_calculo_auto: "posfixadas",
    carencia_periodos: 0,
    pagar_juros_carencia: false,
    qtd_imoveis_beneficiados: 0,
    imoveis_beneficiados: []
  });

  const [tipoCalculo, setTipoCalculo] = useState(projeto?.tipo_calculo || "automatico");
  const [periodicidadeManual, setPeriodicidadeManual] = useState(projeto?.periodicidade_manual || "anual");
  const [parcelasManuals, setParcelasManuals] = useState(
    (projeto?.tipo_calculo === 'manual' && Array.isArray(projeto.parcelas_manuais))
      ? projeto.parcelas_manuais
      : []
  );
  const [cronogramaPreview, setCronogramaPreview] = useState([]);

  const getMesesPorPeriodo = useCallback((frequencia) => {
    const mapa = {
      "mensal": 1,
      "bimestral": 2,
      "trimestral": 3,
      "quadrimestral": 4,
      "semestral": 6,
      "anual": 12
    };
    return mapa[frequencia] || 12;
  }, []);

  const getTaxaPorPeriodo = useCallback((taxaAnual, mesesPorPeriodo) => {
    if (typeof taxaAnual !== 'number' || taxaAnual <= 0) return 0;
    return Math.pow(1 + taxaAnual / 100, mesesPorPeriodo / 12) - 1;
  }, []);

  const addMesesData = useCallback((dataStr, meses) => {
    const data = new Date(dataStr + 'T00:00:00');
    data.setMonth(data.getMonth() + meses);
    return data.toISOString().split('T')[0];
  }, []);

  const arredondar = useCallback((valor, casas = 2) => {
    if (typeof valor !== 'number' || isNaN(valor)) return 0;
    return Math.round(valor * Math.pow(10, casas)) / Math.pow(10, casas);
  }, []);

  const calcularCronogramaAutomatico = useCallback(() => {
    const {
      valor_financiado,
      taxa_juros,
      quantidade_parcelas,
      tipo_pagamento,
      data_primeira_parcela,
      tipo_calculo_auto,
      carencia_periodos,
      pagar_juros_carencia
    } = dadosProjeto;

    if (!valor_financiado || parseFloat(valor_financiado) <= 0 || !quantidade_parcelas || parseInt(quantidade_parcelas, 10) < 1 || !tipo_pagamento || !data_primeira_parcela || !tipo_calculo_auto) {
      return [];
    }

    const PV = parseFloat(valor_financiado);
    const taxaAnual = parseFloat(taxa_juros || 0);
    const n = parseInt(quantidade_parcelas, 10);
    const carencia = parseInt(carencia_periodos || 0, 10);
    const mesesPorPeriodo = getMesesPorPeriodo(tipo_pagamento);
    const i = getTaxaPorPeriodo(taxaAnual, mesesPorPeriodo);

    if (n < 1 || PV <= 0) return [];

    const cronograma = [];
    let saldo = PV;

    let dataAtual = data_primeira_parcela;
    if (carencia > 0) {
      const dataBase = new Date(data_primeira_parcela + 'T00:00:00');
      dataBase.setMonth(dataBase.getMonth() - (carencia * mesesPorPeriodo));
      dataAtual = dataBase.toISOString().split('T')[0];
    }

    for (let p = 1; p <= carencia; p++) {
      if (pagar_juros_carencia) {
        const juros = arredondar(saldo * i, 2);
        cronograma.push({
          numero: p,
          tipo: "Carência (Juros)",
          valor: juros,
          data_vencimento: dataAtual
        });
      } else {
        cronograma.push({
          numero: p,
          tipo: "Carência",
          valor: 0,
          data_vencimento: dataAtual
        });
        saldo = saldo * (1 + i);
      }
      dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
    }

    const saldoCarencia = saldo;

    switch (tipo_calculo_auto) {
      case 'sac': {
        const A = saldoCarencia / n;
        let saldoAtual = saldoCarencia;

        for (let k = 1; k <= n; k++) {
          const juros = arredondar(saldoAtual * i, 2);
          let parcela = arredondar(A + juros, 2);

          if (k === n) {
            const principalRemainingAfterThisAmort = arredondar(saldoAtual - A, 2);
            if (Math.abs(principalRemainingAfterThisAmort) > 0.01) {
              parcela = arredondar(saldoAtual + juros, 2);
            }
          }

          cronograma.push({
            numero: carencia + k,
            tipo: "Parcela",
            valor: parcela,
            data_vencimento: dataAtual
          });

          saldoAtual = arredondar(saldoAtual - A, 2);
          dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
        }
        break;
      }

      case 'price': {
        let saldoAtual = saldoCarencia;

        if (i === 0) {
          const PMT = arredondar(saldoCarencia / n, 2);
          for (let k = 1; k <= n; k++) {
            cronograma.push({
              numero: carencia + k,
              tipo: "Parcela",
              valor: PMT,
              data_vencimento: dataAtual
            });
            dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
          }
        } else {
          const PMT = saldoCarencia * (i / (1 - Math.pow(1 + i, -n)));

          for (let k = 1; k <= n; k++) {
            const juros = arredondar(saldoAtual * i, 2);
            const amort = PMT - juros;
            let parcela = arredondar(PMT, 2);

            if (k === n) {
              const principalRemainingAfterThisAmort = arredondar(saldoAtual - amort, 2);
              if (Math.abs(principalRemainingAfterThisAmort) > 0.01) {
                parcela = arredondar(saldoAtual + juros, 2);
              }
            }

            cronograma.push({
              numero: carencia + k,
              tipo: "Parcela",
              valor: parcela,
              data_vencimento: dataAtual
            });

            saldoAtual = arredondar(saldoAtual - amort, 2);
            dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
          }
        }
        break;
      }

      case 'posfixadas': {
        const pvCarencia = saldoCarencia;

        if (i === 0) {
          const P1 = arredondar(pvCarencia / n, 2);
          for (let k = 1; k <= n; k++) {
            cronograma.push({
              numero: carencia + k,
              tipo: "Parcela",
              valor: P1,
              data_vencimento: dataAtual
            });
            dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
          }
        } else {
          const P1 = pvCarencia * (1 + i) / n;

          const parcelas = [];
          for (let k = 1; k <= n; k++) {
            const valor = arredondar(P1 * Math.pow(1 + i, k - 1), 2);
            parcelas.push(valor);
          }

          const pvCalculado = parcelas.reduce((acc, v, idx) => {
            const t = idx + 1;
            return acc + v / Math.pow(1 + i, t);
          }, 0);

          const residuo = arredondar(pvCarencia - pvCalculado, 2);

          if (n > 0) {
            parcelas[n - 1] = arredondar(parcelas[n - 1] + residuo, 2);
          }

          if (n > 0 && parcelas[n - 1] <= 0 && n >= 3) {
            parcelas[n - 1] = arredondar(P1 * Math.pow(1 + i, n - 1), 2);

            const ultimasTresIndices = [n - 3, n - 2, n - 1];
            const valoresParaAjuste = ultimasTresIndices.map(idx => parcelas[idx]);
            const somaValoresParaAjuste = valoresParaAjuste.reduce((s, val) => s + val, 0);

            if (somaValoresParaAjuste > 0) {
                ultimasTresIndices.forEach((idx, i) => {
                    const proporcao = valoresParaAjuste[i] / somaValoresParaAjuste;
                    parcelas[idx] = arredondar(parcelas[idx] + (residuo * proporcao), 2);
                });
            } else {
                parcelas[n - 1] = arredondar(parcelas[n - 1] + residuo, 2);
            }
          }

          parcelas.forEach((valor, idx) => {
            cronograma.push({
              numero: carencia + idx + 1,
              tipo: "Parcela",
              valor: valor,
              data_vencimento: dataAtual
            });
            dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
          });
        }
        break;
      }
    }

    return cronograma;
  }, [
    dadosProjeto.valor_financiado,
    dadosProjeto.taxa_juros,
    dadosProjeto.quantidade_parcelas,
    dadosProjeto.tipo_pagamento,
    dadosProjeto.data_primeira_parcela,
    dadosProjeto.tipo_calculo_auto,
    dadosProjeto.carencia_periodos,
    dadosProjeto.pagar_juros_carencia,
    getMesesPorPeriodo,
    getTaxaPorPeriodo,
    addMesesData,
    arredondar
  ]);

  useEffect(() => {
    if (dadosProjeto.status === "cancelado" && dadosProjeto.status_art !== "nao_se_aplica") {
      setDadosProjeto(prev => ({
        ...prev,
        status_art: "nao_se_aplica"
      }));
    }
  }, [dadosProjeto.status, dadosProjeto.status_art]);

  useEffect(() => {
    if (projeto) {
      setTipoCalculo(projeto.tipo_calculo || "automatico");
      setPeriodicidadeManual(projeto.periodicidade_manual || "anual");

      setDadosProjeto(prev => ({
        ...prev,
        tipo_calculo_auto: projeto.tipo_calculo_auto || "posfixadas",
        carencia_periodos: projeto.carencia_periodos || 0,
        pagar_juros_carencia: typeof projeto.pagar_juros_carencia === 'boolean' ? projeto.pagar_juros_carencia : false,
        qtd_imoveis_beneficiados: projeto.imoveis_beneficiados?.length || 0,
        imoveis_beneficiados: projeto.imoveis_beneficiados?.map(imovel => ({
          ...imovel,
          area_total_ha_display: formatarAreaHa(imovel.area_total_ha),
          area_financiada_ha_display: formatarAreaHa(imovel.area_financiada_ha)
        })) || []
      }));

      if (projeto.tipo_calculo === 'manual' && projeto.quantidade_parcelas) {
        const numParcelas = parseInt(projeto.quantidade_parcelas, 10);
        if (!isNaN(numParcelas) && numParcelas > 0) {
          const existingManualParcelas = (projeto.parcelas_manuais && Array.isArray(projeto.parcelas_manuais) && projeto.parcelas_manuais.length === numParcelas)
            ? projeto.parcelas_manuais
            : [];

          const initialManualParcelas = Array(numParcelas).fill(0).map((_, index) => ({
            numero: index + 1,
            valor: existingManualParcelas[index]?.valor || 0,
            data_vencimento: existingManualParcelas[index]?.data_vencimento || ""
          }));
          setParcelasManuals(initialManualParcelas);
        } else {
          setParcelasManuals([]);
        }
      } else if (projeto.tipo_calculo === 'automatico') {
        setParcelasManuals([]);
      }
    }
  }, [projeto]);

  useEffect(() => {
    if (tipoCalculo === 'automatico') {
      const novosCronograma = calcularCronogramaAutomatico();
      setCronogramaPreview(novosCronograma);
    } else {
      setCronogramaPreview([]);
    }
  }, [
    tipoCalculo,
    calcularCronogramaAutomatico,
  ]);

  // Effect to manage imoveis_beneficiados array size
  useEffect(() => {
    const qtd = parseInt(dadosProjeto.qtd_imoveis_beneficiados || 0, 10);
    const currentImoveis = dadosProjeto.imoveis_beneficiados || [];
    
    if (qtd > currentImoveis.length) {
      const novosImoveis = [...currentImoveis];
      while (novosImoveis.length < qtd) {
        novosImoveis.push({
          nome_imovel: '',
          matricula: '',
          area_total_ha: null,
          area_total_ha_display: '',
          area_financiada_ha: null,
          area_financiada_ha_display: ''
        });
      }
      setDadosProjeto(prev => ({ ...prev, imoveis_beneficiados: novosImoveis }));
    } else if (qtd < currentImoveis.length) {
      setDadosProjeto(prev => ({ 
        ...prev, 
        imoveis_beneficiados: currentImoveis.slice(0, qtd) 
      }));
    }
  }, [dadosProjeto.qtd_imoveis_beneficiados]);

  const handleInputChange = (campo, valor) => {
    setDadosProjeto(prev => ({
      ...prev,
      [campo]: valor
    }));

    if (campo === 'quantidade_parcelas' && tipoCalculo === 'manual') {
      const numParcelas = parseInt(valor, 10);
      if (!isNaN(numParcelas) && numParcelas > 0) {
        const novasParcelas = Array(numParcelas).fill(0).map((_, index) => ({
          numero: index + 1,
          valor: 0,
          data_vencimento: ""
        }));
        setParcelasManuals(novasParcelas);
      } else {
        setParcelasManuals([]);
      }
    }
  };

  const handleNomeBlur = (field, value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleInputChange(field, nomeFormatado);
  };

  const handleImovelChange = (index, field, value) => {
    const novosImoveis = [...dadosProjeto.imoveis_beneficiados];
    novosImoveis[index] = { ...novosImoveis[index], [field]: value };
    setDadosProjeto(prev => ({ ...prev, imoveis_beneficiados: novosImoveis }));
  };

  const handleImovelNomeBlur = (index, value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleImovelChange(index, 'nome_imovel', nomeFormatado);
  };

  const handleImovelAreaBlur = (index, field, value) => {
    const areaNumerica = parsearAreaHa(value);
    const novosImoveis = [...dadosProjeto.imoveis_beneficiados];
    
    if (areaNumerica !== null) {
      const areaFormatada = formatarAreaHa(areaNumerica);
      novosImoveis[index] = {
        ...novosImoveis[index],
        [field]: areaNumerica,
        [`${field}_display`]: areaFormatada
      };
    } else {
      novosImoveis[index] = {
        ...novosImoveis[index],
        [field]: null,
        [`${field}_display`]: value
      };
    }
    
    setDadosProjeto(prev => ({ ...prev, imoveis_beneficiados: novosImoveis }));
  };

  const handleTipoCalculoChange = (novoTipo) => {
    setTipoCalculo(novoTipo);
    if (novoTipo === 'manual' && dadosProjeto.quantidade_parcelas) {
      const numParcelas = parseInt(dadosProjeto.quantidade_parcelas, 10);
      if (!isNaN(numParcelas) && numParcelas > 0) {
        const novasParcelas = Array(numParcelas).fill(0).map((_, index) => ({
          numero: index + 1,
          valor: 0,
          data_vencimento: ""
        }));
        setParcelasManuals(novasParcelas);
      } else {
        setParcelasManuals([]);
      }
    } else if (novoTipo === 'automatico') {
      setParcelasManuals([]);
    }
  };

  const handlePeriodicidadeManualChange = (novaPeriodicidade) => {
    setPeriodicidadeManual(novaPeriodicidade);
  };

  const handleParcelaManualChange = (index, campo, valor) => {
    setParcelasManuals(prev => {
      const novasParcelas = [...prev];
      if (novasParcelas[index]) {
        novasParcelas[index] = { ...novasParcelas[index], [campo]: valor || (campo === 'valor' ? 0 : '') };
      }
      return novasParcelas;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean imoveis data before submitting
    const imoveisLimpos = dadosProjeto.imoveis_beneficiados.map(imovel => ({
      nome_imovel: imovel.nome_imovel,
      matricula: imovel.matricula,
      area_total_ha: imovel.area_total_ha,
      area_financiada_ha: imovel.area_financiada_ha
    }));

    const dadosProcessados = {
      ...dadosProjeto,
      taxa_juros: dadosProjeto.taxa_juros,
      valor_financiado: dadosProjeto.valor_financiado,
      valor_receber: dadosProjeto.valor_receber,
      quantidade_parcelas: dadosProjeto.quantidade_parcelas ? parseInt(dadosProjeto.quantidade_parcelas, 10) : null,
      carencia_periodos: parseInt(dadosProjeto.carencia_periodos || 0, 10),
      tipo_calculo: tipoCalculo,
      periodicidade_manual: tipoCalculo === 'manual' ? periodicidadeManual : null,
      parcelas_manuais: tipoCalculo === 'manual' ? parcelasManuals : null,
      cronograma_automatico: tipoCalculo === 'automatico' ? cronogramaPreview : null,
      imoveis_beneficiados: imoveisLimpos
    };

    onSubmit(dadosProcessados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome_cliente" className="text-green-800 font-semibold text-sm">
            Nome do Cliente *
          </Label>
          <Input
            id="nome_cliente"
            value={dadosProjeto.nome_cliente}
            onChange={(e) => handleInputChange('nome_cliente', e.target.value)}
            onBlur={(e) => handleNomeBlur('nome_cliente', e.target.value)}
            placeholder="Nome completo do cliente"
            required
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="data_protocolo" className="text-green-800 font-semibold text-sm">
            Data do Protocolo *
          </Label>
          <Input
            id="data_protocolo"
            type="date"
            value={dadosProjeto.data_protocolo}
            onChange={(e) => handleInputChange('data_protocolo', e.target.value)}
            required
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-green-800 font-semibold text-sm">
            Status
          </Label>
          <Select
            value={dadosProjeto.status}
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="banco" className="text-green-800 font-semibold text-sm">
            Banco *
          </Label>
          <Select
            value={dadosProjeto.banco}
            onValueChange={(value) => handleInputChange('banco', value)}
          >
            <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BANCOS.map((banco) => (
                <SelectItem key={banco.value} value={banco.value}>
                  {banco.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="safra" className="text-green-800 font-semibold text-sm">
            Safra
          </Label>
          <Input
            id="safra"
            value={dadosProjeto.safra}
            onChange={(e) => handleInputChange('safra', e.target.value)}
            placeholder="Ex: 2025/2026"
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="numero_contrato" className="text-green-800 font-semibold text-sm">
            Número do Contrato
          </Label>
          <Input
            id="numero_contrato"
            value={dadosProjeto.numero_contrato}
            onChange={(e) => handleInputChange('numero_contrato', e.target.value)}
            placeholder="Nº do contrato no banco"
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="item_financiado" className="text-green-800 font-semibold text-sm">
            Item Financiado *
          </Label>
          <Input
            id="item_financiado"
            value={dadosProjeto.item_financiado}
            onChange={(e) => handleInputChange('item_financiado', e.target.value)}
            placeholder="Ex: Trator, Implementos, Custeio..."
            required
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fonte_recurso" className="text-green-800 font-semibold text-sm">
            Fonte de Recurso
          </Label>
          <Input
            id="fonte_recurso"
            value={dadosProjeto.fonte_recurso}
            onChange={(e) => handleInputChange('fonte_recurso', e.target.value)}
            placeholder="Ex: Pronaf, Pronamp, FCO..."
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxa_juros" className="text-green-800 font-semibold text-sm">
            Taxa de Juros (% ao ano)
          </Label>
          <PercentageInput
            id="taxa_juros"
            value={dadosProjeto.taxa_juros}
            onValueChange={(newValue) => handleInputChange('taxa_juros', newValue)}
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vencimento_final" className="text-green-800 font-semibold text-sm">
            Vencimento Final
          </Label>
          <Input
            id="vencimento_final"
            type="date"
            value={dadosProjeto.vencimento_final}
            onChange={(e) => handleInputChange('vencimento_final', e.target.value)}
            placeholder="Ex: 30/10/2026"
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agencia" className="text-green-800 font-semibold text-sm">
            Agência
          </Label>
          <Input
            id="agencia"
            value={dadosProjeto.agencia}
            onChange={(e) => handleInputChange('agencia', e.target.value)}
            placeholder="Ex: Brasília, São Paulo Centro..."
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor_financiado" className="text-green-800 font-semibold text-sm">
            Valor Financiado (R$) *
          </Label>
          <CurrencyInput
            id="valor_financiado"
            value={dadosProjeto.valor_financiado}
            onValueChange={(newValue) => handleInputChange('valor_financiado', newValue)}
            required
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor_receber" className="text-green-800 font-semibold text-sm">
            Valor a Receber (R$)
          </Label>
          <CurrencyInput
            id="valor_receber"
            value={dadosProjeto.valor_receber}
            onValueChange={(newValue) => handleInputChange('valor_receber', newValue)}
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="data_pagamento_astec" className="text-green-800 font-semibold text-sm">
            Data Pagamento ASTEC
          </Label>
          <Input
            id="data_pagamento_astec"
            type="date"
            value={dadosProjeto.data_pagamento_astec}
            onChange={(e) => handleInputChange('data_pagamento_astec', e.target.value)}
            className="border-green-200 focus:border-green-500 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status_art" className="text-green-800 font-semibold text-sm">
            Status da ART
          </Label>
          <Select
            value={dadosProjeto.status_art}
            onValueChange={(value) => handleInputChange('status_art', value)}
            disabled={dadosProjeto.status === "cancelado"}
          >
            <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
              <SelectValue placeholder="Selecione o status da ART" />
            </SelectTrigger>
            <SelectContent>
              {ART_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Imóveis Beneficiados Section */}
      <div className="pt-4 border-t border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-green-900">Imóveis Beneficiados</h3>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-gray-600">Quantidade:</Label>
            <Select
              value={dadosProjeto.qtd_imoveis_beneficiados?.toString() || "0"}
              onValueChange={(value) => handleInputChange('qtd_imoveis_beneficiados', parseInt(value, 10))}
            >
              <SelectTrigger className="w-24 h-8 border-green-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(11)].map((_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {dadosProjeto.imoveis_beneficiados && dadosProjeto.imoveis_beneficiados.length > 0 && (
          <div className="space-y-3">
            {dadosProjeto.imoveis_beneficiados.map((imovel, index) => (
              <div key={index} className="p-3 bg-green-50/50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">Imóvel Beneficiado</Label>
                    <Input
                      value={imovel.nome_imovel || ''}
                      onChange={(e) => handleImovelChange(index, 'nome_imovel', e.target.value)}
                      onBlur={(e) => handleImovelNomeBlur(index, e.target.value)}
                      placeholder="Nome do imóvel"
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">Matrícula nº</Label>
                    <Input
                      value={imovel.matricula || ''}
                      onChange={(e) => handleImovelChange(index, 'matricula', e.target.value)}
                      placeholder="Ex: 2.563"
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">Área Total (ha)</Label>
                    <Input
                      value={imovel.area_total_ha_display || ''}
                      onChange={(e) => handleImovelChange(index, 'area_total_ha_display', e.target.value)}
                      onBlur={(e) => handleImovelAreaBlur(index, 'area_total_ha', e.target.value)}
                      placeholder="125,36"
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">Área Financiada (ha)</Label>
                    <Input
                      value={imovel.area_financiada_ha_display || ''}
                      onChange={(e) => handleImovelChange(index, 'area_financiada_ha_display', e.target.value)}
                      onBlur={(e) => handleImovelAreaBlur(index, 'area_financiada_ha', e.target.value)}
                      placeholder="100,00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-3">Detalhes do Financiamento</h3>

        <div className="space-y-3 mb-4">
          <Label className="text-green-800 font-semibold text-sm">Tipo de Cálculo das Parcelas</Label>
          <RadioGroup
            value={tipoCalculo}
            onValueChange={handleTipoCalculoChange}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="automatico" id="automatico" />
              <Label htmlFor="automatico" className="flex items-center gap-2 cursor-pointer text-sm">
                <Calculator className="w-4 h-4 mr-1 text-green-600" />
                Cálculo Automático
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer text-sm">
                <Edit className="w-4 h-4 mr-1 text-blue-600" />
                Cálculo Manual
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="quantidade_parcelas" className="text-green-800 font-semibold text-sm">
              Quantidade de Parcelas
            </Label>
            <Input
              id="quantidade_parcelas"
              type="number"
              value={dadosProjeto.quantidade_parcelas}
              onChange={(e) => handleInputChange('quantidade_parcelas', e.target.value)}
              placeholder="Ex: 10"
              className="border-green-200 focus:border-green-500 h-9"
            />
          </div>

          {tipoCalculo === 'automatico' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tipo_pagamento" className="text-green-800 font-semibold text-sm">
                  Frequência
                </Label>
                <Select
                  value={dadosProjeto.tipo_pagamento}
                  onValueChange={(value) => handleInputChange('tipo_pagamento', value)}
                >
                  <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_PAGAMENTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_primeira_parcela" className="text-green-800 font-semibold text-sm">
                  Venc. 1ª Parcela
                </Label>
                <Input
                  id="data_primeira_parcela"
                  type="date"
                  value={dadosProjeto.data_primeira_parcela}
                  onChange={(e) => handleInputChange('data_primeira_parcela', e.target.value)}
                  className="border-green-200 focus:border-green-500 h-9"
                />
              </div>
            </>
          )}

          {tipoCalculo === 'manual' && (
            <div className="space-y-1.5">
              <Label htmlFor="periodicidade_manual" className="text-green-800 font-semibold text-sm">
                Periodicidade do Pagamento
              </Label>
              <Select
                value={periodicidadeManual}
                onValueChange={handlePeriodicidadeManualChange}
              >
                <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_PAGAMENTO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {tipoCalculo === 'automatico' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-md font-semibold text-green-900 mb-3">Configurações Avançadas de Cálculo</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tipo_calculo_auto" className="text-green-800 font-semibold text-sm">
                  Sistema de Amortização *
                </Label>
                <Select
                  value={dadosProjeto.tipo_calculo_auto}
                  onValueChange={(value) => handleInputChange('tipo_calculo_auto', value)}
                  required
                >
                  <SelectTrigger className="border-green-200 focus:border-green-500 h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_CALCULO_AUTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="carencia_periodos" className="text-green-800 font-semibold text-sm">
                  Carência (períodos)
                </Label>
                <Input
                  id="carencia_periodos"
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={dadosProjeto.carencia_periodos || 0}
                  onChange={(e) => handleInputChange('carencia_periodos', e.target.value)}
                  className="border-green-200 focus:border-green-500 h-9"
                />
                <p className="text-xs text-green-600">Períodos sem amortização (0-10)</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pagar_juros_carencia" className="text-green-800 font-semibold text-sm">
                  Pagar Juros na Carência
                </Label>
                <div className="flex items-center space-x-2 h-9">
                  <input
                    type="checkbox"
                    id="pagar_juros_carencia"
                    checked={dadosProjeto.pagar_juros_carencia || false}
                    onChange={(e) => handleInputChange('pagar_juros_carencia', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                  <Label htmlFor="pagar_juros_carencia" className="text-sm text-green-700 cursor-pointer">
                    Ativo
                  </Label>
                </div>
                <p className="text-xs text-green-600">
                  Se desmarcado, juros são capitalizados (saldo cresce)
                </p>
              </div>
            </div>

            {cronogramaPreview.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-semibold text-green-900 mb-2">Preview do Cronograma</h5>
                <div className="max-h-64 overflow-y-auto border border-green-200 rounded-lg bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-green-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-green-800">#</th>
                        <th className="px-3 py-2 text-left text-green-800">Tipo</th>
                        <th className="px-3 py-2 text-left text-green-800">Vencimento</th>
                        <th className="px-3 py-2 text-right text-green-800">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronogramaPreview.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                          <td className="px-3 py-2">{item.numero}</td>
                          <td className="px-3 py-2">{item.tipo}</td>
                          <td className="px-3 py-2">
                            {format(new Date(item.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-200 font-bold">
                        <td colSpan="3" className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2 text-right">
                          R$ {cronogramaPreview.reduce((sum, p) => sum + p.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tipoCalculo === 'manual' && parcelasManuals.length > 0 && (
          <div className="mt-4">
            <Label className="text-green-800 font-semibold mb-3 block text-sm">
              Detalhes das Parcelas (Manual)
            </Label>
            <div className="max-h-96 overflow-y-auto border border-green-200 rounded-lg bg-green-50">
              <div className="grid grid-cols-1 gap-3 p-3">
                {parcelasManuals.map((parcela, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-green-100">
                    <div className="space-y-1">
                      <Label className="text-green-700 font-medium text-sm">
                        Parcela {parcela.numero}
                      </Label>
                      <div className="text-xs text-gray-500">Número da parcela</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-green-700 text-xs">
                        Valor da Parcela
                      </Label>
                      <CurrencyInput
                        value={parcela.valor}
                        onValueChange={(valor) => handleParcelaManualChange(index, 'valor', valor)}
                        className="border-green-300 focus:border-green-500 h-8"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-green-700 text-xs">
                        Data de Vencimento
                      </Label>
                      <Input
                        type="date"
                        value={parcela.data_vencimento}
                        onChange={(e) => handleParcelaManualChange(index, 'data_vencimento', e.target.value)}
                        className="border-green-300 focus:border-green-500 h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes" className="text-green-800 font-semibold text-sm">
          Observações
        </Label>
        <Textarea
          id="observacoes"
          value={dadosProjeto.observacoes}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Ex: Aguardando certidão, pendente documentação..."
          rows={3}
          className="border-green-200 focus:border-green-500 resize-none"
        />
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg focus:outline-none focus:shadow-outline" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar Projeto
          </>
        )}
      </Button>
    </form>
  );
}
