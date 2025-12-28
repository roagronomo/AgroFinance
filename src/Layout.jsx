import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProjetoFinanciamento } from "@/entities/ProjetoFinanciamento";
import { 
  LayoutDashboard, 
  FileText, 
  Plus,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  Building2,
  RefreshCw,
  Check,
  Trash2, // Added for cache clear functionality
  FileSignature // Added FileSignature icon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"; // Added for dropdown menu
import PwaUpdateNotification from './components/common/PwaUpdateNotification';
import OfflineIndicator from './components/common/OfflineIndicator';
import AppVersion from './components/common/AppVersion';

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Novo Projeto",
    url: createPageUrl("NovoProjeto"),
    icon: Plus,
  },
  {
    title: "Todos Projetos",
    url: createPageUrl("TodosProjetos"), 
    icon: FileText,
  },
  {
    title: "Vencimentos",
    url: createPageUrl("Vencimentos"),
    icon: Calendar,
  },
  {
    title: "Notificações CREA", // Changed title from "ARTs & Notificações" to "Notificações CREA"
    url: createPageUrl("GerenciamentoARTs"),
    icon: ClipboardCheck,
  },
  {
    title: "Elaboração de ARTs", // Added new navigation item
    url: createPageUrl("ElaboracaoARTs"),
    icon: FileSignature,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [stats, setStats] = useState({ totalProjetos: 0, emAnalise: 0 });
  const [swRegistration, setSwRegistration] = useState(null); // State to store service worker registration
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false); // State to indicate if an update check is in progress
  const [updateCheckStatus, setUpdateCheckStatus] = useState(''); // 'checking', 'updated', 'no-update', 'error'

  // Proteção global contra erros fatais - executar uma única vez no boot
  useEffect(() => {
    // Patch para proteger contra erros de removeChild
    if (!window.__pwa_protected) {
      window.__pwa_protected = true;
      
      // Ignorar falhas de removeChild disparadas por desmontes rápidos
      const _removeChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function(node) {
        if (!node || node.parentNode !== this) return node;
        try { 
          return _removeChild.call(this, node); 
        } catch (e) { 
          console.warn('removeChild ignorado:', e.message);
          return node; 
        }
      };

      const _remove = Element.prototype.remove;
      Element.prototype.remove = function() {
        try {
          if (this.parentNode) {
            this.parentNode.removeChild(this);
          }
        } catch (e) {
          console.warn('remove ignorado:', e.message);
        }
      };

      // Handler global para recuperação de chunks e outros erros críticos
      const handleCriticalError = (e) => {
        const error = e.error || e.reason || e;
        const message = String(error?.message || error || '').toLowerCase();
        
        const isCriticalError = 
          message.includes('removechild') ||
          message.includes('loading chunk') ||
          message.includes('chunkloaderror') ||
          message.includes('failed to fetch dynamically imported module') ||
          message.includes('dynamically imported module');

        if (isCriticalError) {
          console.warn('Erro crítico detectado:', message);
          
          // Evitar loop infinito de recarregamento
          const recoverKey = 'pwa_recover_once';
          if (!sessionStorage.getItem(recoverKey)) {
            sessionStorage.setItem(recoverKey, '1');
            
            console.warn('Iniciando auto-recuperação...');
            
            // Limpar Service Workers e caches
            const cleanup = async () => {
              try {
                // Desregistrar Service Workers
                if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker desregistrado');
                  }
                }
                
                // Limpar caches
                if ('caches' in window && caches.keys) {
                  const cacheKeys = await caches.keys();
                  await Promise.all(cacheKeys.map(key => {
                    console.log(`Deletando cache: ${key}`);
                    return caches.delete(key);
                  }));
                }
              } catch (cleanupError) {
                console.error('Erro na limpeza:', cleanupError);
              } finally {
                // Forçar recarregamento
                console.log('Forçando recarregamento da página...');
                window.location.reload(true);
              }
            };
            
            cleanup();
            
            // Prevenir propagação do erro
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
          } else {
            console.error('Loop de recuperação detectado - não recarregando');
          }
        }
      };

      // Registrar handlers de erro globais
      window.addEventListener('error', handleCriticalError, true);
      window.addEventListener('unhandledrejection', handleCriticalError, true);

      // Limpar flag de recuperação depois de um tempo
      setTimeout(() => {
        sessionStorage.removeItem('pwa_recover_once');
      }, 30000); // 30 segundos
    }
  }, []);

  // Lógica de PWA e verificação de atualização
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwRegistration(registration);
      });

      const checkForUpdateOnFocus = () => {
        swRegistration?.update(); // Check for updates when tab gains focus
      };

      // Verifica atualizações quando a aba ganha foco
      window.addEventListener('focus', checkForUpdateOnFocus);

      return () => {
        window.removeEventListener('focus', checkForUpdateOnFocus);
      };
    }
  }, [swRegistration]); // Re-run if swRegistration changes

  useEffect(() => {
    async function fetchStats() {
      try {
        const todosProjetos = await ProjetoFinanciamento.list();
        const total = todosProjetos.length;
        const analise = todosProjetos.filter(p => p.status === 'em_analise').length;
        setStats({ totalProjetos: total, emAnalise: analise });
      } catch (error) {
        console.error("Erro ao buscar estatísticas para o layout:", error);
        setStats({ totalProjetos: 0, emAnalise: 0 });
      }
    }
    fetchStats();
  }, [children]);

  const handleManualUpdateCheck = async () => {
    if (!swRegistration) {
      console.warn("Service Worker not registered, cannot check for updates.");
      setUpdateCheckStatus('no-update');
      setTimeout(() => setUpdateCheckStatus(''), 2000);
      return;
    }

    setUpdateCheckStatus('checking');
    setIsCheckingForUpdate(true);

    try {
      // swRegistration.update() returns a Promise that resolves with a new ServiceWorkerRegistration
      // It will trigger the 'updatefound' event on the registration if a new SW is found.
      const updatedRegistration = await swRegistration.update();
      
      // If a new SW is found and is installing or waiting, the PwaUpdateNotification component
      // will pick this up automatically via the 'updatefound' event or state changes.
      if (updatedRegistration && (updatedRegistration.installing || updatedRegistration.waiting)) {
        console.log("New Service Worker found and is installing/waiting.");
        // The PwaUpdateNotification component will show the prompt. Clear status here.
        setUpdateCheckStatus(''); 
      } else {
        console.log("No new update found or SW already activated.");
        setUpdateCheckStatus('updated'); // User is already on the latest version
        setTimeout(() => setUpdateCheckStatus(''), 2000); // Clear status after a short delay
      }
    } catch (error) {
      console.error("Erro ao verificar atualização:", error);
      setUpdateCheckStatus('error');
      setTimeout(() => setUpdateCheckStatus(''), 2000);
    } finally {
      setIsCheckingForUpdate(false);
    }
  };

  const handleFullCacheClear = async () => {
    if (!window.confirm('⚠️ Isso irá limpar TODO o cache, dados locais e recarregar a página. Continuar?')) {
      return;
    }

    try {
      // 1) Desregistrar todos os Service Workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try { await r.unregister(); } catch(e) { console.warn('Erro ao desregistrar SW:', e); }
        }
      }

      // 2) Apagar todos os Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          try { await caches.delete(k); } catch(e) { console.warn('Erro ao deletar cache:', e); }
        }
      }

      // 3) Limpar localStorage e sessionStorage
      try { localStorage.clear(); } catch(e) { console.warn('Erro ao limpar localStorage:', e); }
      try { sessionStorage.clear(); } catch(e) { console.warn('Erro ao limpar sessionStorage:', e); }

      // 4) Apagar todos os IndexedDBs
      const wipeIDB = async (name) => new Promise(res => {
        try {
          const req = indexedDB.deleteDatabase(name);
          req.onblocked = req.onerror = req.onsuccess = () => res();
        } catch(e) { res(); }
      });

      if (indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs || []) {
          if (db && db.name) await wipeIDB(db.name);
        }
      } else {
        // Fallback para nomes comuns ou para iteração manual se `databases()` não estiver disponível
        // Nota: Esta abordagem é menos precisa, idealmente `databases()` é preferível.
        // Para uma limpeza completa robusta, pode-se tentar `indexedDB.open()` com nomes comuns
        // e então deletar, mas isso é mais complexo.
        for (const guess of ['_pwa', 'app-db', 'app', 'default']) { // Common DB names to try
          await wipeIDB(guess);
        }
      }

      // 5) Recarregar forçando rede
      window.location.reload(true);
    } catch (e) {
      console.error('Falha na limpeza completa de cache:', e);
      alert('Erro ao limpar cache. Recarregando página...');
      window.location.reload(true);
    }
  };


  return (
    <SidebarProvider>
      <TooltipProvider> {/* Wrapped entire return with TooltipProvider */}
        <AppVersion />
        <PwaUpdateNotification />
        <OfflineIndicator />
        <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-emerald-50">
          <Sidebar className="border-r border-green-200">
            <SidebarHeader className="border-b border-green-200 p-6">
              <div className="flex items-center gap-3">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c43a9d96ab992732fde594/c21e63e22_LogoSemente2.png" alt="Logo" className="w-10 h-10" />
                <div>
                  <h2 className="font-bold text-green-900 text-lg">Cerrado Consultoria</h2>
                  <p className="text-sm text-green-600">Financiamentos Agrícolas</p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-3">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-green-700 uppercase tracking-wider px-3 py-2">
                  Navegação
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-green-100 hover:text-green-800 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === item.url ? 'bg-green-100 text-green-800 font-semibold' : 'text-green-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="mt-6">
                <SidebarGroupLabel className="text-xs font-semibold text-green-700 uppercase tracking-wider px-3 py-2">
                  Estatísticas Rápidas
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-green-700">Total Projetos</span>
                      <span className="ml-auto font-bold text-green-800">{stats.totalProjetos}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-green-700">Em Análise</span>
                      <span className="ml-auto font-bold text-emerald-600">{stats.emAnalise}</span>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-green-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                  <span className="text-green-800 font-semibold text-sm">U</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-900 text-sm truncate">Usuário</p>
                  <p className="text-xs text-green-600 truncate">Gestor de Projetos</p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-600 hover:bg-green-100 hover:text-green-800"
                      disabled={isCheckingForUpdate}
                      aria-label="Opções de atualização"
                    >
                      {updateCheckStatus === 'checking' && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {updateCheckStatus === 'updated' && <Check className="w-4 h-4 text-green-600" />}
                      {!updateCheckStatus && <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleManualUpdateCheck} disabled={isCheckingForUpdate}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {updateCheckStatus === 'checking' ? 'Verificando...' : 'Verificar Atualizações'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleFullCacheClear}
                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Cache Completo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            <header className="bg-white/70 backdrop-blur-sm border-b border-green-200 px-6 py-4 md:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-green-100 p-2 rounded-lg transition-colors duration-200" />
                <h1 className="text-xl font-bold text-green-900">Cerrado Consultoria</h1>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}