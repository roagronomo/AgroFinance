import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, User, Trash2, MapPin } from "lucide-react";

export default function ListaClientes({ clientes, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return <div className="space-y-4">
      {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>;
  }

  if (clientes.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <User className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">Nenhum cliente cadastrado</h3>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (cliente) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      onDelete(cliente);
    }
  };

  return (
    <div className="space-y-4">
      {clientes.map(cliente => (
        <Card key={cliente.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-green-100 p-3 rounded-full">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 flex-1">
                <p className="font-bold text-lg text-gray-900 sm:col-span-2">{cliente.nome}</p>
                <p className="text-sm text-gray-600">CPF/CNPJ: {cliente.cpf}</p>
                {cliente.cidade && cliente.uf && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {cliente.cidade} - {cliente.uf}
                  </p>
                )}
                {cliente.email && <p className="text-sm text-gray-500 truncate">{cliente.email}</p>}
                {/* Priorizar celular se existir, senão telefone fixo */}
                {(cliente.celular || cliente.telefone_fixo) && (
                  <p className="text-sm text-gray-500">
                    {cliente.celular || cliente.telefone_fixo}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 self-end md:self-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(cliente)}
                className="text-green-700 hover:text-green-800 hover:bg-green-50"
                title="Editar cliente"
              >
                <Edit className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(cliente)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Excluir cliente"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}