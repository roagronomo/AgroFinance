import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, MapPin, Trash2 } from "lucide-react";

export default function ListaImoveis({ imoveis, clienteSelecionado, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (imoveis.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum imóvel cadastrado</p>
      </div>
    );
  }

  const handleDelete = (imovel) => {
    if (window.confirm(`Excluir "${imovel.nome_imovel}"?\n\nEsta ação não pode ser desfeita.`)) {
      onDelete(imovel);
    }
  };

  const formatArea = (area) => {
    const num = parseFloat(area) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMatricula = (matricula) => {
    if (!matricula) return "";
    const numbers = String(matricula).replace(/\D/g, '');
    if (!numbers) return "";
    const numeroInteiro = parseInt(numbers, 10);
    if (isNaN(numeroInteiro)) return "";
    return new Intl.NumberFormat('pt-BR').format(numeroInteiro);
  };

  return (
    <Card className="border-0 shadow-sm bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {imoveis.map((imovel) => {
            // Determinar tipo de propriedade e badge
            let tipoPropriedade = imovel.tipo_propriedade || "proprio";
            let badgeConfig = {
              text: "Próprio",
              className: "border-green-200 text-green-700 bg-green-50"
            };

            if (tipoPropriedade === "proprio_condominio") {
              badgeConfig = {
                text: "Próprio em condomínio",
                className: "border-blue-200 text-blue-700 bg-blue-50"
              };
            } else if (tipoPropriedade === "terceiros") {
              badgeConfig = {
                text: "Terceiros",
                className: "border-orange-200 text-orange-700 bg-orange-50"
              };
            }

            // Se tem certidão, verificar o tipo real
            if (imovel.dados_analise_certidao && clienteSelecionado) {
              try {
                const dadosCertidao = JSON.parse(imovel.dados_analise_certidao);
                const clienteCpfLimpo = clienteSelecionado.cpf?.replace(/\D/g, '') || '';

                const ehProprietario = dadosCertidao.proprietarios?.some(prop => {
                  const propCpfLimpo = prop.cpf?.replace(/\D/g, '') || '';
                  return propCpfLimpo === clienteCpfLimpo;
                }) || false;

                const ehCondominio = (dadosCertidao.proprietarios?.length || 0) > 1;

                if (ehProprietario) {
                  if (ehCondominio) {
                    badgeConfig = {
                      text: "Próprio em condomínio",
                      className: "border-blue-200 text-blue-700 bg-blue-50"
                    };
                  } else {
                    badgeConfig = {
                      text: "Próprio",
                      className: "border-green-200 text-green-700 bg-green-50"
                    };
                  }
                } else {
                  badgeConfig = {
                    text: "Terceiros",
                    className: "border-orange-200 text-orange-700 bg-orange-50"
                  };
                }
              } catch (error) {
                console.error("Erro ao verificar proprietário:", error);
              }
            }

            return (
              <div 
                key={imovel.id} 
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/80 transition-colors"
              >
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{imovel.nome_imovel}</span>
                    <Badge 
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${badgeConfig.className}`}
                    >
                      {badgeConfig.text}
                    </Badge>
                  </div>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {imovel.municipio}
                  </span>
                  <span>•</span>
                  <span>Mat. {formatMatricula(imovel.matricula_numero)}</span>
                </div>
              </div>

              {/* Áreas */}
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Total</p>
                  <p className="font-semibold text-gray-700">{formatArea(imovel.area_total)} ha</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Agricultável</p>
                  <p className="font-semibold text-green-600">{formatArea(imovel.area_agricultavel)} ha</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => onEdit(imovel)}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-gray-500 hover:text-green-600 hover:bg-green-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(imovel)}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}