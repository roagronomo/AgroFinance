import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Search, 
  MoreHorizontal
} from "lucide-react";
import { format, parseISO } from "date-fns";

// 1. Cartões de Estatísticas
const EstatisticasDocs = ({ stats, isLoading }) => {
  const cards = [
    { title: "Total de Documentos", value: stats.total, icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
    { title: "Vigentes", value: stats.vigente, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50" },
    { title: "Vencendo (30d)", value: stats.vencendo, icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-50" },
    { title: "Vencidos", value: stats.vencido, icon: XCircle, color: "text-red-600", bgColor: "bg-red-50" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="shadow-sm border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <div className="text-3xl font-bold text-gray-800">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// 2. Tabela de Documentos
const TabelaDocumentos = ({ documentos, isLoading, onAction }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case "Vigente": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Vigente</Badge>;
      case "Vencendo": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Vencendo</Badge>;
      case "Vencido": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vencido</Badge>;
      case "Arquivado": return <Badge variant="outline">Arquivado</Badge>;
      case "Rascunho": return <Badge variant="secondary">Rascunho</Badge>;
      default: return <Badge variant="secondary">{status || "-"}</Badge>;
    }
  };

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle>Documentos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="py-4">
                    <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400"/>
                      <div>
                        <div>{doc.nome_documento}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">{doc.tipo_documento}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{doc.cliente?.nome || "-"}</TableCell>
                  <TableCell>{doc.data_vencimento ? format(parseISO(doc.data_vencimento), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>{getStatusBadge(doc.status_documento)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAction("view", doc)}>Visualizar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("edit", doc)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("archive", doc)} className="text-red-600">Arquivar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function PainelDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [docsData, clientsData] = await Promise.all([
          base44.entities.Documento.list("-created_date"),
          base44.entities.Cliente.list("nome")
        ]);

        const docsComCliente = (docsData || []).map(doc => ({
          ...doc,
          cliente: (clientsData || []).find(c => c.id === doc.cliente_id)
        }));

        setDocumentos(docsComCliente);
        setClientes(clientsData || []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    return documentos.reduce((acc, doc) => {
      acc.total++;
      const status = doc.status_documento;
      if (status === 'Vigente') acc.vigente++;
      if (status === 'Vencido') acc.vencido++;
      if (status === 'Vencendo') acc.vencendo++;
      return acc;
    }, { total: 0, vigente: 0, vencendo: 0, vencido: 0 });
  }, [documentos]);

  const documentosFiltrados = useMemo(() => {
    if (!busca.trim()) return documentos.slice(0, 10);
    const lower = busca.toLowerCase();
    return documentos.filter(doc =>
      doc.nome_documento?.toLowerCase().includes(lower) ||
      doc.tipo_documento?.toLowerCase().includes(lower) ||
      doc.cliente?.nome?.toLowerCase().includes(lower)
    ).slice(0, 10);
  }, [documentos, busca]);

  const handleAction = (action, doc) => {
    console.log(`Ação: ${action}, Documento:`, doc);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Painel de Documentos</h1>
          <p className="text-gray-500 mt-1">Gerencie certidões, contratos e laudos de forma centralizada.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border rounded-md w-full sm:w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" /> Novo Documento
          </Button>
        </div>
      </div>

      <EstatisticasDocs stats={stats} isLoading={isLoading} />
      <TabelaDocumentos documentos={documentosFiltrados} isLoading={isLoading} onAction={handleAction} />
    </div>
  );
}