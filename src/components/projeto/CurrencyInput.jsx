import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
};

const parseCurrency = (value) => {
  if (typeof value !== 'string') {
    return 0;
  }
  const number = parseFloat(value.replace(/[^0-9]/g, '')) / 100;
  return isNaN(number) ? 0 : number;
};

export default function CurrencyInput({ value, onValueChange, ...props }) {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));

  useEffect(() => {
    // Atualiza o valor exibido se o valor do pai mudar
    // mas só se não estiver focado, para não atrapalhar a digitação
    if (document.activeElement !== document.getElementById(props.id)) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, props.id]);

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const numericValue = parseCurrency(rawValue);
    
    // Atualiza o valor formatado para exibição
    setDisplayValue(formatCurrency(numericValue));
    
    // Notifica o componente pai sobre a mudança no valor numérico
    if (onValueChange) {
      onValueChange(numericValue);
    }
  };

  const handleBlur = () => {
    // Garante que o valor está formatado corretamente ao sair do campo
    setDisplayValue(formatCurrency(value));
  };
  
  // Usa o valor formatado para exibição
  const inputValue = displayValue || "";

  return (
    <Input
      {...props}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="R$ 0,00"
    />
  );
}