import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmacaoExclusaoServico({ servico, isOpen, onClose, onConfirm, isLoading }) {
  if (!servico) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">Confirmar exclusão</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              Tem certeza que deseja <strong className="text-red-600">excluir</strong> este registro?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
              <p>
                <strong>Nº Notificação:</strong> {servico.numero_notificacao}
              </p>
              <p>
                <strong>Cliente:</strong> {servico.cliente_nome}
              </p>
              {servico.processo_numero && (
                <p>
                  <strong>Processo nº:</strong> {servico.processo_numero}
                </p>
              )}
            </div>
            <p className="text-red-600 font-semibold">
              ⚠️ Esta ação é permanente e removerá também todos os <strong>anexos</strong> associados.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}