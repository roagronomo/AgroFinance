import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function LimparCache() {
  const [isClearing, setIsClearing] = useState(false);

  const executarLimpeza = async () => {
    setIsClearing(true);
    
    try {
      // 1) Desregistrar todos os Service Workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try {
            await r.unregister();
          } catch(e) {
            console.warn('Erro ao desregistrar SW:', e);
          }
        }
      }

      // 2) Apagar todos os Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          try {
            await caches.delete(k);
          } catch(e) {
            console.warn('Erro ao deletar cache:', e);
          }
        }
      }

      // 3) Limpar localStorage e sessionStorage
      try {
        localStorage.clear();
      } catch(e) {
        console.warn('Erro ao limpar localStorage:', e);
      }
      
      try {
        sessionStorage.clear();
      } catch(e) {
        console.warn('Erro ao limpar sessionStorage:', e);
      }

      // 4) Apagar todos os IndexedDBs
      const wipeIDB = async (name) => new Promise(res => {
        try {
          const req = indexedDB.deleteDatabase(name);
          req.onblocked = req.onerror = req.onsuccess = () => res();
        } catch(e) {
          res();
        }
      });

      if (indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs || []) {
          if (db && db.name) await wipeIDB(db.name);
        }
      } else {
        // Tentar nomes comuns de bancos
        for (const guess of ['_pwa', 'app-db', 'app', 'default', 'workbox']) {
          await wipeIDB(guess);
        }
      }

      // 5) Aguardar um pouco e recarregar forçando rede
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (e) {
      console.error('Falha na limpeza:', e);
      // Mesmo com erro, tenta recarregar
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          disabled={isClearing}
        >
          {isClearing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Cache
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-orange-600" />
            Limpar Cache e Dados do App?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p className="font-medium">Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Remover todos os Service Workers</li>
              <li>Apagar todos os caches do navegador</li>
              <li>Limpar dados locais (localStorage/sessionStorage)</li>
              <li>Remover bancos de dados IndexedDB</li>
              <li>Recarregar a aplicação completamente</li>
            </ul>
            <p className="text-orange-600 font-medium mt-3">
              ⚠️ Use esta opção se estiver tendo problemas com o app instalado (PWA) ou atualizações que não aparecem.
            </p>
            <p className="text-sm text-gray-500">
              Você precisará fazer login novamente após a limpeza.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={executarLimpeza}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Limpar e Recarregar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}