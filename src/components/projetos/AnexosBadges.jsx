import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Paperclip, MapPin, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORIAS_CONFIG = {
  contrato: {
    label: "Contrato",
    icon: FileText,
    tab: "contrato",
    tooltip: "Contrato/Cédula"
  },
  art: {
    label: "ART",
    icon: Paperclip,
    tab: "art",
    tooltip: "ART"
  },
  geomapa: {
    label: "GeoMapa",
    icon: MapPin,
    tab: "geomapa",
    tooltip: "GeoMapa"
  }
};

export default function AnexosBadges({ projetoId, resumo }) {
  // Se não tem resumo, exibir estado de carregamento
  if (!resumo) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full" />
        <div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full" />
        <div className="h-6 w-24 bg-gray-200 animate-pulse rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(CATEGORIAS_CONFIG).map(([categoria, config]) => {
        const total = resumo[categoria]?.total || 0;
        const temAnexos = total > 0;
        const Icon = config.icon;
        
        const badgeContent = (
          <Badge
            data-chip-anexo
            data-categoria={categoria}
            className={`
              flex items-center gap-1.5 px-2 py-1 text-xs font-medium cursor-pointer transition-all
              ${temAnexos 
                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-150'
              }
            `}
            variant="outline"
            aria-label={`${config.tooltip}: ${total} arquivo(s)`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
            {temAnexos && (
              <>
                <Check className="w-3 h-3" />
                <span className="font-semibold">{total}</span>
              </>
            )}
          </Badge>
        );

        const tooltipText = temAnexos 
          ? `${config.tooltip}: ${total} arquivo(s)` 
          : `${config.tooltip}: Nenhum arquivo`;

        return (
          <Tooltip key={categoria}>
            <TooltipTrigger asChild>
              <Link 
                to={`${createPageUrl("EditarProjeto")}?id=${projetoId}&tab=${config.tab}`}
                className="inline-block"
              >
                {badgeContent}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}