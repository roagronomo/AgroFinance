
import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Loader2, Calculator, Edit } from "lucide-react";
import CurrencyInput from "./CurrencyInput";
import PercentageInput from "./PercentageInput";
import { format } from "date-fns";
import { formatarNomeProprio } from "../lib/formatters"; // Added import for formatter

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
    data_pagamento_astec: "", // Added new field
    status_art: "nao_se_aplica",
    observacoes: "",
    quantidade_parcelas: "",
    tipo_pagamento: "anual",
    data_primeira_parcela: "",
    // New fields for advanced automatic calculation
    tipo_calculo_auto: "posfixadas",
    carencia_periodos: 0,
    pagar_juros_carencia: false
  });

  // Initialize tipoCalculo and parcelasManuals based on existing project data if available
  const [tipoCalculo, setTipoCalculo] = useState(projeto?.tipo_calculo || "automatico");
  const [periodicidadeManual, setPeriodicidadeManual] = useState(projeto?.periodicidade_manual || "anual"); // Nova state para periodicidade manual
  // Removed dataBaseManual state as it's no longer used
  const [parcelasManuals, setParcelasManuals] = useState(
    (projeto?.tipo_calculo === 'manual' && Array.isArray(projeto.parcelas_manuais))
      ? projeto.parcelas_manuais
      : []
  );
  const [cronogramaPreview, setCronogramaPreview] = useState([]); // New state for automatic schedule preview

  // Moved utility functions inside the component and wrapped in useCallback
  const getMesesPorPeriodo = useCallback((frequencia) => {
    const mapa = {
      "mensal": 1,
      "bimestral": 2,
      "trimestral": 3,
      "quadrimestral": 4,
      "semestral": 6,
      "anual": 12
    };
    return mapa[frequencia] || 12; // Default to 12 months for "anual" or unknown
  }, []);

  const getTaxaPorPeriodo = useCallback((taxaAnual, mesesPorPeriodo) => {
    if (typeof taxaAnual !== 'number' || taxaAnual <= 0) return 0;
    // (1 + taxa_anual_decimal)^(meses_por_periodo / 12) - 1
    return Math.pow(1 + taxaAnual / 100, mesesPorPeriodo / 12) - 1;
  }, []);

  const addMesesData = useCallback((dataStr, meses) => {
    const data = new Date(dataStr + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
    data.setMonth(data.getMonth() + meses);
    return data.toISOString().split('T')[0]; // Return YYYY-MM-DD
  }, []);

  const arredondar = useCallback((valor, casas = 2) => {
    if (typeof valor !== 'number' || isNaN(valor)) return 0;
    return Math.round(valor * Math.pow(10, casas)) / Math.pow(10, casas);
  }, []);

  // Wrapped calcularCronogramaAutomatico in useCallback
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

    // Basic validation for calculation
    if (!valor_financiado || parseFloat(valor_financiado) <= 0 || !quantidade_parcelas || parseInt(quantidade_parcelas, 10) < 1 || !tipo_pagamento || !data_primeira_parcela || !tipo_calculo_auto) {
      return [];
    }

    const PV = parseFloat(valor_financiado);
    const taxaAnual = parseFloat(taxa_juros || 0);
    const n = parseInt(quantidade_parcelas, 10); // Number of amortization periods
    const carencia = parseInt(carencia_periodos || 0, 10); // Number of grace periods
    const mesesPorPeriodo = getMesesPorPeriodo(tipo_pagamento);
    const i = getTaxaPorPeriodo(taxaAnual, mesesPorPeriodo); // Periodic interest rate

    if (n < 1 || PV <= 0) return [];

    const cronograma = [];
    let saldo = PV;

    // Calculate initial date for carencia
    let dataAtual = data_primeira_parcela; // Start with the first payment date
    if (carencia > 0) {
      const dataBase = new Date(data_primeira_parcela + 'T00:00:00');
      dataBase.setMonth(dataBase.getMonth() - (carencia * mesesPorPeriodo));
      dataAtual = dataBase.toISOString().split('T')[0];
    }

    // Process grace period (carência)
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
        saldo = saldo * (1 + i); // Capitalize interest if not paid
      }
      dataAtual = addMesesData(dataAtual, mesesPorPeriodo); // Advance date for next installment
    }

    const saldoCarencia = saldo; // This is the principal to be amortized after grace period

    // Calculate amortization installments
    switch (tipo_calculo_auto) {
      case 'sac': {
        const A = saldoCarencia / n; // Constant amortization value
        let saldoAtual = saldoCarencia; // Separate variable to track saldo for interest calculation

        for (let k = 1; k <= n; k++) {
          const juros = arredondar(saldoAtual * i, 2);
          let parcela = arredondar(A + juros, 2);

          // Adjust last installment to clear any residual principal
          if (k === n) {
            // Compare the remaining saldo with the amortization portion 'A'
            // and adjust the final payment to clear the principal exactly.
            const principalRemainingAfterThisAmort = arredondar(saldoAtual - A, 2);
            if (Math.abs(principalRemainingAfterThisAmort) > 0.01) { // If there's a significant residual
              // The `principalRemainingAfterThisAmort` is what's left if we just subtract `A`.
              // We need to adjust `A` itself so that `saldoAtual - A_adjusted = 0`.
              // So, `A_adjusted = saldoAtual`.
              // The current `parcela` calculation uses the 'A' (constant amortization).
              // We need to ensure `(parcela - juros)` equals `saldoAtual` for the last one.
              // So, `parcela_final = saldoAtual + juros`.
              parcela = arredondar(saldoAtual + juros, 2);
            }
          }

          cronograma.push({
            numero: carencia + k,
            tipo: "Parcela",
            valor: parcela,
            data_vencimento: dataAtual
          });

          saldoAtual = arredondar(saldoAtual - A, 2); // Reduce principal by constant amortization
          dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
        }
        break;
      }

      case 'price': {
        let saldoAtual = saldoCarencia; // Separate variable to track saldo for interest calculation

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

            // Adjust last installment to clear any residual principal
            if (k === n) {
              const principalRemainingAfterThisAmort = arredondar(saldoAtual - amort, 2); // Expected principal remaining
              if (Math.abs(principalRemainingAfterThisAmort) > 0.01) { // If there's a significant residual
                parcela = arredondar(saldoAtual + juros, 2); // Adjust PMT so that (PMT - Juros) == saldoAtual
              }
            }

            cronograma.push({
              numero: carencia + k,
              tipo: "Parcela",
              valor: parcela,
              data_vencimento: dataAtual
            });

            saldoAtual = arredondar(saldoAtual - amort, 2); // Reduce principal by calculated amortization
            dataAtual = addMesesData(dataAtual, mesesPorPeriodo);
          }
        }
        break;
      }

      case 'posfixadas': {
        const pvCarencia = saldoCarencia;

        if (i === 0) {
          // Taxa zero: parcelas iguais
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
          // Parcela inicial calibrada para série geométrica
          // Formula derived from PV = SUM[ P * (1+i)^(k-1) / (1+i)^k ] = SUM[ P / (1+i) ] = n * P / (1+i)
          // Thus, P (the nominal first payment for the geometric series) = PV * (1+i) / n
          const P1 = pvCarencia * (1 + i) / n;

          // Gerar série geométrica de valores de face
          const parcelas = [];
          for (let k = 1; k <= n; k++) {
            const valor = arredondar(P1 * Math.pow(1 + i, k - 1), 2);
            parcelas.push(valor);
          }

          // Calcular o valor presente das parcelas geradas
          const pvCalculado = parcelas.reduce((acc, v, idx) => {
            const t = idx + 1; // periods 1..n
            return acc + v / Math.pow(1 + i, t);
          }, 0);

          // Ajuste por arredondamento na última parcela para igualar o valor presente ao PV inicial
          const residuo = arredondar(pvCarencia - pvCalculado, 2);

          if (n > 0) { // Ensure there is at least one parcel
            parcelas[n - 1] = arredondar(parcelas[n - 1] + residuo, 2);
          }

          // Garantir que nenhuma parcela seja negativa ou zero
          // Se a última ficou inválida, redistribuir o ajuste nas últimas N parcelas (e.g., 3)
          if (n > 0 && parcelas[n - 1] <= 0 && n >= 3) {
            // Restaurar última parcela ao valor original antes do ajuste único
            parcelas[n - 1] = arredondar(P1 * Math.pow(1 + i, n - 1), 2);

            // Distribuir o resíduo proporcionalmente nas últimas 3 parcelas
            const ultimasTresIndices = [n - 3, n - 2, n - 1];
            const valoresParaAjuste = ultimasTresIndices.map(idx => parcelas[idx]);
            const somaValoresParaAjuste = valoresParaAjuste.reduce((s, val) => s + val, 0);

            if (somaValoresParaAjuste > 0) { // Avoid division by zero
                ultimasTresIndices.forEach((idx, i) => {
                    const proporcao = valoresParaAjuste[i] / somaValoresParaAjuste;
                    parcelas[idx] = arredondar(parcelas[idx] + (residuo * proporcao), 2);
                });
            } else {
                // Fallback: if sum is zero, just add residue to the very last parcel.
                // This scenario indicates payments are near zero, but should still clear the principal.
                parcelas[n - 1] = arredondar(parcelas[n - 1] + residuo, 2);
            }
          }

          // Adicionar ao cronograma
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Auto-ajustar Status da ART quando projeto for cancelado
  useEffect(() => {
    if (dadosProjeto.status === "cancelado" && dadosProjeto.status_art !== "nao_se_aplica") {
      setDadosProjeto(prev => ({
        ...prev,
        status_art: "nao_se_aplica"
      }));
    }
  }, [dadosProjeto.status, dadosProjeto.status_art]);

  // Effect to ensure parcelasManuals are correctly initialized when project prop changes,
  // especially if quantidade_parcelas is set but parcelas_manuais was empty or dates need to be generated.
  useEffect(() => {
    if (projeto) {
      setTipoCalculo(projeto.tipo_calculo || "automatico");
      setPeriodicidadeManual(projeto.periodicidade_manual || "anual");
      // dataBaseManual state and related initialization removed

      // Ensure pagar_juros_carencia is always a boolean
      setDadosProjeto(prev => ({
        ...prev,
        tipo_calculo_auto: projeto.tipo_calculo_auto || "posfixadas",
        carencia_periodos: projeto.carencia_periodos || 0,
        pagar_juros_carencia: typeof projeto.pagar_juros_carencia === 'boolean' ? projeto.pagar_juros_carencia : false,
      }));

      if (projeto.tipo_calculo === 'manual' && projeto.quantidade_parcelas) {
        const numParcelas = parseInt(projeto.quantidade_parcelas, 10);
        if (!isNaN(numParcelas) && numParcelas > 0) {
          // If existing manual parcels array is valid and matches quantity, use it.
          // Otherwise, create new ones with empty dates, as dataBaseManual is removed.
          const existingManualParcelas = (projeto.parcelas_manuais && Array.isArray(projeto.parcelas_manuais) && projeto.parcelas_manuais.length === numParcelas)
            ? projeto.parcelas_manuais
            : [];

          const initialManualParcelas = Array(numParcelas).fill(0).map((_, index) => ({
            numero: index + 1,
            valor: existingManualParcelas[index]?.valor || 0, // Preserve existing value if any
            data_vencimento: existingManualParcelas[index]?.data_vencimento || "" // Preserve existing date or set to empty
          }));
          setParcelasManuals(initialManualParcelas);
        } else {
          setParcelasManuals([]);
        }
      } else if (projeto.tipo_calculo === 'automatico') {
        setParcelasManuals([]);
        // The cronograma_automatico will be set by its own useEffect below.
      }
    }
  }, [projeto]); // All setters are stable and do not need to be wrapped in useCallback

  // Effect to recalculate automatic schedule preview whenever relevant inputs change
  useEffect(() => {
    if (tipoCalculo === 'automatico') {
      const novosCronograma = calcularCronogramaAutomatico();
      setCronogramaPreview(novosCronograma);
    } else {
      setCronogramaPreview([]); // Clear preview if not in automatic mode
    }
  }, [
    tipoCalculo,
    calcularCronogramaAutomatico, // This is now a stable reference from useCallback
  ]);


  const handleInputChange = (campo, valor) => {
    setDadosProjeto(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Se mudou a quantidade de parcelas e é cálculo manual, atualizar array de parcelas
    if (campo === 'quantidade_parcelas' && tipoCalculo === 'manual') {
      const numParcelas = parseInt(valor, 10);
      if (!isNaN(numParcelas) && numParcelas > 0) {
        // No longer auto-calculating dates for manual parcels, so initialize with empty string
        const novasParcelas = Array(numParcelas).fill(0).map((_, index) => ({
          numero: index + 1,
          valor: 0, // Initialize with 0
          data_vencimento: "" // Dates are manually entered
        }));
        setParcelasManuals(novasParcelas);
      } else {
        setParcelasManuals([]); // Clear if quantity is invalid or empty
      }
    }
  };

  const handleNomeBlur = (field, value) => {
    const nomeFormatado = formatarNomeProprio(value);
    handleInputChange(field, nomeFormatado);
  };

  const handleTipoCalculoChange = (novoTipo) => {
    setTipoCalculo(novoTipo);
    if (novoTipo === 'manual' && dadosProjeto.quantidade_parcelas) {
      const numParcelas = parseInt(dadosProjeto.quantidade_parcelas, 10);
      if (!isNaN(numParcelas) && numParcelas > 0) {
        // No longer auto-calculating dates for manual parcels, so initialize with empty string
        const novasParcelas = Array(numParcelas).fill(0).map((_, index) => ({
          numero: index + 1,
          valor: 0,
          data_vencimento: "" // Dates are manually entered
        }));
        setParcelasManuals(novasParcelas);
      } else {
        setParcelasManuals([]); // Clear if quantity is invalid or empty
      }
    } else if (novoTipo === 'automatico') {
      setParcelasManuals([]); // Clear manual parcels if switching to automatic
    }
  };

  // Nova função para lidar com mudança da periodicidade manual
  const handlePeriodicidadeManualChange = (novaPeriodicidade) => {
    setPeriodicidadeManual(novaPeriodicidade);
    // Dates for manual parcels are no longer automatically generated based on periodicidade,
    // so no need to update parcelasManuals here. User will input dates manually.
  };

  // Removed handleDataBaseManualChange as dataBaseManual is no longer used

  const handleParcelaManualChange = (index, campo, valor) => {
    setParcelasManuals(prev => {
      const novasParcelas = [...prev];
      if (novasParcelas[index]) { // Ensure the parcel at index exists
        novasParcelas[index] = { ...novasParcelas[index], [campo]: valor || (campo === 'valor' ? 0 : '') };
      }
      return novasParcelas;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dadosProcessados = {
      ...dadosProjeto,
      // taxa_juros is already a number or null from PercentageInput, no need for parseFloat
      taxa_juros: dadosProjeto.taxa_juros,
      valor_financiado: dadosProjeto.valor_financiado, // Já é um número ou null
      valor_receber: dadosProjeto.valor_receber, // Já é um número ou null
      quantidade_parcelas: dadosProjeto.quantidade_parcelas ? parseInt(dadosProjeto.quantidade_parcelas, 10) : null,
      carencia_periodos: parseInt(dadosProjeto.carencia_periodos || 0, 10), // Ensure integer
      tipo_calculo: tipoCalculo, // Add tipo_calculo to submitted data
      periodicidade_manual: tipoCalculo === 'manual' ? periodicidadeManual : null, // Add periodicidade_manual
      // Removed data_base_manual from submitted data
      parcelas_manuais: tipoCalculo === 'manual' ? parcelasManuals : null, // Add manual parcels conditionally
      cronograma_automatico: tipoCalculo === 'automatico' ? cronogramaPreview : null // Add automatic schedule conditionally
    };

    onSubmit(dadosProcessados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nome_cliente" className="text-green-800 font-semibold">
            Nome do Cliente *
          </Label>
          <Input
            id="nome_cliente"
            value={dadosProjeto.nome_cliente}
            onChange={(e) => handleInputChange('nome_cliente', e.target.value)}
            onBlur={(e) => handleNomeBlur('nome_cliente', e.target.value)}
            placeholder="Nome completo do cliente"
            required
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_protocolo" className="text-green-800 font-semibold">
            Data do Protocolo *
          </Label>
          <Input
            id="data_protocolo"
            type="date"
            value={dadosProjeto.data_protocolo}
            onChange={(e) => handleInputChange('data_protocolo', e.target.value)}
            required
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status" className="text-green-800 font-semibold">
            Status
          </Label>
          <Select
            value={dadosProjeto.status}
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger className="border-green-200 focus:border-green-500">
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

        <div className="space-y-2">
          <Label htmlFor="banco" className="text-green-800 font-semibold">
            Banco *
          </Label>
          <Select
            value={dadosProjeto.banco}
            onValueChange={(value) => handleInputChange('banco', value)}
          >
            <SelectTrigger className="border-green-200 focus:border-green-500">
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

        <div className="space-y-2">
          <Label htmlFor="safra" className="text-green-800 font-semibold">
            Safra
          </Label>
          <Input
            id="safra"
            value={dadosProjeto.safra}
            onChange={(e) => handleInputChange('safra', e.target.value)}
            placeholder="Ex: 2025/2026"
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero_contrato" className="text-green-800 font-semibold">
            Número do Contrato
          </Label>
          <Input
            id="numero_contrato"
            value={dadosProjeto.numero_contrato}
            onChange={(e) => handleInputChange('numero_contrato', e.target.value)}
            placeholder="Nº do contrato no banco"
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="item_financiado" className="text-green-800 font-semibold">
            Item Financiado *
          </Label>
          <Input
            id="item_financiado"
            value={dadosProjeto.item_financiado}
            onChange={(e) => handleInputChange('item_financiado', e.target.value)}
            placeholder="Ex: Trator, Implementos, Custeio..."
            required
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fonte_recurso" className="text-green-800 font-semibold">
            Fonte de Recurso
          </Label>
          <Input
            id="fonte_recurso"
            value={dadosProjeto.fonte_recurso}
            onChange={(e) => handleInputChange('fonte_recurso', e.target.value)}
            placeholder="Ex: Pronaf, Pronamp, FCO..."
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxa_juros" className="text-green-800 font-semibold">
            Taxa de Juros (% ao ano)
          </Label>
          <PercentageInput
            id="taxa_juros"
            value={dadosProjeto.taxa_juros}
            onValueChange={(newValue) => handleInputChange('taxa_juros', newValue)}
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vencimento_final" className="text-green-800 font-semibold">
            Vencimento Final
          </Label>
          <Input
            id="vencimento_final"
            type="date"
            value={dadosProjeto.vencimento_final}
            onChange={(e) => handleInputChange('vencimento_final', e.target.value)}
            placeholder="Ex: 30/10/2026"
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agencia" className="text-green-800 font-semibold">
            Agência
          </Label>
          <Input
            id="agencia"
            value={dadosProjeto.agencia}
            onChange={(e) => handleInputChange('agencia', e.target.value)}
            placeholder="Ex: Brasília, São Paulo Centro..."
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_financiado" className="text-green-800 font-semibold">
            Valor Financiado (R$) *
          </Label>
          <CurrencyInput
            id="valor_financiado"
            value={dadosProjeto.valor_financiado}
            onValueChange={(newValue) => handleInputChange('valor_financiado', newValue)}
            required
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_receber" className="text-green-800 font-semibold">
            Valor a Receber (R$)
          </Label>
          <CurrencyInput
            id="valor_receber"
            value={dadosProjeto.valor_receber}
            onValueChange={(newValue) => handleInputChange('valor_receber', newValue)}
            className="border-green-200 focus:border-green-500"
          />
        </div>

        {/* Added new field: Data Pagamento ASTEC */}
        <div className="space-y-2">
          <Label htmlFor="data_pagamento_astec" className="text-green-800 font-semibold">
            Data Pagamento ASTEC
          </Label>
          <Input
            id="data_pagamento_astec"
            type="date"
            value={dadosProjeto.data_pagamento_astec}
            onChange={(e) => handleInputChange('data_pagamento_astec', e.target.value)}
            className="border-green-200 focus:border-green-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status_art" className="text-green-800 font-semibold">
            Status da ART
          </Label>
          <Select
            value={dadosProjeto.status_art}
            onValueChange={(value) => handleInputChange('status_art', value)}
            disabled={dadosProjeto.status === "cancelado"} // Disable if project is cancelled
          >
            <SelectTrigger className="border-green-200 focus:border-green-500">
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

      <div className="pt-6 border-t border-green-200 mt-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Detalhes do Financiamento</h3>

        {/* Tipo de Cálculo */}
        <div className="space-y-4 mb-6">
          <Label className="text-green-800 font-semibold">Tipo de Cálculo das Parcelas</Label>
          <RadioGroup
            value={tipoCalculo}
            onValueChange={handleTipoCalculoChange}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="automatico" id="automatico" />
              <Label htmlFor="automatico" className="flex items-center gap-2 cursor-pointer">
                <Calculator className="w-4 h-4 mr-1 text-green-600" />
                Cálculo Automático
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                <Edit className="w-4 h-4 mr-1 text-blue-600" />
                Cálculo Manual
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="quantidade_parcelas" className="text-green-800 font-semibold">
              Quantidade de Parcelas
            </Label>
            <Input
              id="quantidade_parcelas"
              type="number"
              value={dadosProjeto.quantidade_parcelas}
              onChange={(e) => handleInputChange('quantidade_parcelas', e.target.value)}
              placeholder="Ex: 10"
              className="border-green-200 focus:border-green-500"
            />
          </div>

          {tipoCalculo === 'automatico' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tipo_pagamento" className="text-green-800 font-semibold">
                  Frequência
                </Label>
                <Select
                  value={dadosProjeto.tipo_pagamento}
                  onValueChange={(value) => handleInputChange('tipo_pagamento', value)}
                >
                  <SelectTrigger className="border-green-200 focus:border-green-500">
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
              <div className="space-y-2">
                <Label htmlFor="data_primeira_parcela" className="text-green-800 font-semibold">
                  Venc. 1ª Parcela
                </Label>
                <Input
                  id="data_primeira_parcela"
                  type="date"
                  value={dadosProjeto.data_primeira_parcela}
                  onChange={(e) => handleInputChange('data_primeira_parcela', e.target.value)}
                  className="border-green-200 focus:border-green-500"
                />
              </div>
            </>
          )}

          {tipoCalculo === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="periodicidade_manual" className="text-green-800 font-semibold">
                Periodicidade do Pagamento
              </Label>
              <Select
                value={periodicidadeManual}
                onValueChange={handlePeriodicidadeManualChange}
              >
                <SelectTrigger className="border-green-200 focus:border-green-500">
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
            // Removed the "Data Base (1ª Parcela)" input field here
          )}
        </div>

        {tipoCalculo === 'automatico' && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-md font-semibold text-green-900 mb-4">Configurações Avançadas de Cálculo</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_calculo_auto" className="text-green-800 font-semibold">
                  Sistema de Amortização *
                </Label>
                <Select
                  value={dadosProjeto.tipo_calculo_auto}
                  onValueChange={(value) => handleInputChange('tipo_calculo_auto', value)}
                  required
                >
                  <SelectTrigger className="border-green-200 focus:border-green-500">
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

              <div className="space-y-2">
                <Label htmlFor="carencia_periodos" className="text-green-800 font-semibold">
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
                  className="border-green-200 focus:border-green-500"
                />
                <p className="text-xs text-green-600">Períodos sem amortização (0-10)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagar_juros_carencia" className="text-green-800 font-semibold">
                  Pagar Juros na Carência
                </Label>
                <div className="flex items-center space-x-2 h-10">
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
              <div className="mt-6">
                <h5 className="text-sm font-semibold text-green-900 mb-3">Preview do Cronograma</h5>
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
          <div className="mt-6">
            <Label className="text-green-800 font-semibold mb-4 block">
              Detalhes das Parcelas (Manual)
            </Label>
            <div className="max-h-96 overflow-y-auto border border-green-200 rounded-lg bg-green-50">
              <div className="grid grid-cols-1 gap-4 p-4">
                {parcelasManuals.map((parcela, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-green-100">
                    <div className="space-y-2">
                      <Label className="text-green-700 font-medium">
                        Parcela {parcela.numero}
                      </Label>
                      <div className="text-sm text-gray-500">Número da parcela</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-700 text-sm">
                        Valor da Parcela
                      </Label>
                      <CurrencyInput
                        value={parcela.valor}
                        onValueChange={(valor) => handleParcelaManualChange(index, 'valor', valor)}
                        className="border-green-300 focus:border-green-500"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-700 text-sm">
                        Data de Vencimento
                      </Label>
                      <Input
                        type="date"
                        value={parcela.data_vencimento}
                        onChange={(e) => handleParcelaManualChange(index, 'data_vencimento', e.target.value)}
                        className="border-green-300 focus:border-green-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes" className="text-green-800 font-semibold">
          Observações
        </Label>
        <Textarea
          id="observacoes"
          value={dadosProjeto.observacoes}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Ex: Aguardando certidão, pendente documentação..."
          rows={4}
          className="border-green-200 focus:border-green-500"
        />
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={isLoading}>
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
