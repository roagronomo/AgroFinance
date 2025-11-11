
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export default function ConfirmacaoExclusao({ 
  projeto, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading 
}) {
  if (!projeto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription className="text-left">
            <div className="space-y-3 mt-4">
              <p>Tem certeza que deseja excluir este projeto?</p>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {projeto.nome_cliente}
                </h4>
                {projeto.safra && (
                  <p className="text-gray-700 mb-1">
                    <strong>Safra:</strong> {projeto.safra}
                  </p>
                )}
                <p className="text-gray-700 mb-1">
                  <strong>Item:</strong> {projeto.item_financiado}
                </p>
                <p className="text-gray-700 mb-1">
                  <strong>Valor:</strong> R$ {projeto.valor_financiado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
                <p className="text-gray-700">
                  <strong>Status:</strong> {
                    projeto.status === 'em_analise' ? 'Em Análise' :
                    projeto.status === 'parado' ? 'Parado' :
                    projeto.status === 'concluido' ? 'Concluído' :
                    projeto.status === 'cancelado' ? 'Cancelado' : projeto.status
                  }
                </p>
              </div>
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados do projeto serão perdidos permanentemente.
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Projeto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
