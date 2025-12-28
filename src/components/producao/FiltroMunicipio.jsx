import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

export default function FiltroMunicipio({ municipios, onSelect, municipioSelecionado }) {
  return (
    <Card className="shadow-lg border-green-200 bg-white/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <MapPin className="w-5 h-5" />
          Filtrar por Município
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={municipioSelecionado || ""} onValueChange={onSelect}>
          <SelectTrigger className="border-green-200 focus:border-green-500">
            <SelectValue placeholder="Selecione o município das lavouras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Municípios</SelectItem>
            {municipios.map((municipio) => (
              <SelectItem key={municipio} value={municipio}>
                {municipio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}