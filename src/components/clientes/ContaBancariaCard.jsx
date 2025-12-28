import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

export default function ContaBancariaCard({ 
  conta, 
  index, 
  onUpdate, 
  onRemove, 
  showRemoveButton 
}) {
  const handleChange = (field, value) => {
    onUpdate(index, { ...conta, [field]: value });
  };

  const formatAgencia = (value) => {
    if (!value) return "";
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    // Limita a 5 dígitos (4 + 1 dígito verificador)
    const limited = numbers.slice(0, 5);
    // Formata: 0000-0
    if (limited.length <= 4) return limited;
    return `${limited.slice(0, 4)}-${limited.slice(4)}`;
  };

  const formatContaCorrente = (value) => {
    if (!value) return "";
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    // Limita a 13 dígitos (12 + 1 dígito verificador)
    const limited = numbers.slice(0, 13);
    // Formata: 000000-0
    if (limited.length <= 1) return limited;
    return `${limited.slice(0, -1)}-${limited.slice(-1)}`;
  };

  const validateAgencia = (value) => {
    if (!value) return true; // Campo opcional
    const numbers = value.replace(/\D/g, '');
    return numbers.length >= 3 && numbers.length <= 5;
  };

  const validateContaCorrente = (value) => {
    if (!value) return true; // Campo opcional
    const numbers = value.replace(/\D/g, '');
    return numbers.length >= 5 && numbers.length <= 13;
  };

  return (
    <Card className="shadow-md border-green-100 bg-white">
      <CardHeader className="bg-green-50 border-b border-green-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base text-green-800">Conta #{index + 1}</CardTitle>
          {showRemoveButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
              title="Remover conta"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <div>
          <Label htmlFor={`banco_${index}`} className="text-green-700 font-medium">
            Banco *
          </Label>
          <Select 
            value={conta.banco || ""} 
            onValueChange={(value) => handleChange('banco', value)}
            required
          >
            <SelectTrigger id={`banco_${index}`} className="border-green-200">
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
              <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
              <SelectItem value="Bradesco">Bradesco</SelectItem>
              <SelectItem value="Sicoob">Sicoob</SelectItem>
              <SelectItem value="Santander">Santander</SelectItem>
              <SelectItem value="Sicredi">Sicredi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`agencia_${index}`} className="text-green-700 font-medium">
              Agência
            </Label>
            <Input
              id={`agencia_${index}`}
              value={formatAgencia(conta.agencia || "")}
              onChange={(e) => handleChange('agencia', e.target.value)}
              onBlur={(e) => {
                const formatted = formatAgencia(e.target.value);
                if (formatted && !validateAgencia(formatted)) {
                  alert('Agência deve ter entre 3 e 5 dígitos (formato: 0000-0)');
                }
                handleChange('agencia', formatted);
              }}
              className="border-green-200"
              placeholder="0000-0"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: 0000-0 (3 a 5 dígitos)
            </p>
          </div>

          <div>
            <Label htmlFor={`conta_corrente_${index}`} className="text-green-700 font-medium">
              Conta Corrente
            </Label>
            <Input
              id={`conta_corrente_${index}`}
              value={formatContaCorrente(conta.conta_corrente || "")}
              onChange={(e) => handleChange('conta_corrente', e.target.value)}
              onBlur={(e) => {
                const formatted = formatContaCorrente(e.target.value);
                if (formatted && !validateContaCorrente(formatted)) {
                  alert('Conta corrente deve ter entre 4 e 12 dígitos + dígito verificador (formato: 000000-0)');
                }
                handleChange('conta_corrente', formatted);
              }}
              className="border-green-200"
              placeholder="000000-0"
              maxLength={14}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: 000000-0 (4 a 12 dígitos + verificador)
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor={`observacoes_${index}`} className="text-green-700 font-medium">
            Observações Bancárias
          </Label>
          <Textarea
            id={`observacoes_${index}`}
            value={conta.observacoes || ""}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            className="border-green-200"
            rows={2}
            placeholder="Informações adicionais sobre esta conta (opcional)"
          />
        </div>
      </CardContent>
    </Card>
  );
}