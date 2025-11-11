import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

const formatPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value) || value === "") {
    return "";
  }
  return `${parseFloat(value).toFixed(2)}%`;
};

const parsePercentage = (value) => {
  if (typeof value !== 'string') {
    return 0;
  }
  // Remove o símbolo de % e outros caracteres não numéricos, exceto ponto e vírgula
  const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const number = parseFloat(cleanValue);
  return isNaN(number) ? 0 : number;
};

export default function PercentageInput({ value, onValueChange, ...props }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value) return formatPercentage(value);
    return "";
  });
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Atualiza o valor exibido se o valor do pai mudar e não estiver focado
    if (!isFocused) {
      setDisplayValue(value ? formatPercentage(value) : "");
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const numericValue = parsePercentage(rawValue);
    
    // Durante a digitação, mostra o valor sem formatação
    if (isFocused) {
      setDisplayValue(rawValue);
    } else {
      setDisplayValue(formatPercentage(numericValue));
    }
    
    // Notifica o componente pai sobre a mudança no valor numérico
    if (onValueChange) {
      onValueChange(numericValue);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    // Remove a formatação durante a edição
    const numericValue = parsePercentage(displayValue);
    setDisplayValue(numericValue.toString());
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Aplica a formatação ao sair do campo
    const numericValue = parsePercentage(displayValue);
    setDisplayValue(formatPercentage(numericValue));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="8,50%"
    />
  );
}