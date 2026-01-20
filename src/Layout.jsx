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
  Trash2,
  FileSignature,
  User,
  Home,
  Sprout,
  FileSearch,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Wallet,
  Bell
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
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import PwaUpdateNotification from './components/common/PwaUpdateNotification';
import OfflineIndicator from './components/common/OfflineIndicator';
import AppVersion from './components/common/AppVersion';

// Navegação organizada em seções
const navigationSections = [
  {
    title: "Cadastro",
    icon: FolderOpen,
    items: [
      {
        title: "Cadastro de Clientes",
        url: createPageUrl("CadastroClientes"),
        icon: User,
      },
      {
        title: "Cadastro de Imóveis",
        url: createPageUrl("CadastroImoveis"),
        icon: Home,
      },
      {
        title: "Produção Agrícola",
        url: createPageUrl("ProducaoAgricola"),
        icon: Sprout,
      },
      {
        title: "Áreas Financiáveis",
        url: createPageUrl("AreasFinanciaveis"),
        icon: TrendingUp,
      },
      {
        title: "Análise de Certidões",
        url: createPageUrl("AnaliseCertidoes"),
        icon: FileSearch,
      },
      {
        title: "Atualização de Documentos",
        url: createPageUrl("AtualizacaoDocumentos"),
        icon: RefreshCw,
      },
      {
        title: "Correção de Vínculos",
        url: createPageUrl("CorrecaoVinculos"),
        icon: RefreshCw,
      },
    ]
  },
  {
    title: "Financiamentos",
    icon: Wallet,
    items: [
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
        title: "Notificações CREA",
        url: createPageUrl("GerenciamentoARTs"),
        icon: ClipboardCheck,
      },
      {
        title: "Elaboração de ARTs",
        url: createPageUrl("ElaboracaoARTs"),
        icon: FileSignature,
      },
      {
        title: "Outros Serviços",
        url: createPageUrl("OutrosServicos"),
        icon: FileText,
      },
      {
        title: "Despesas e Lembretes",
        url: createPageUrl("DespesasLembretes"),
        icon: Bell,
      },
      ]
      }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [stats, setStats] = useState({ totalProjetos: 0, emAnalise: 0 });
  const [swRegistration, setSwRegistration] = useState(null);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState('');
  const [openSections, setOpenSections] = useState({
    "Cadastro": true,
    "Financiamentos": true
  });

  // Proteção global contra erros fatais - executar uma única vez no boot
  useEffect(() => {
    if (!window.__pwa_protected) {
      window.__pwa_protected = true;
      
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
          
          const recoverKey = 'pwa_recover_once';
          if (!sessionStorage.getItem(recoverKey)) {
            sessionStorage.setItem(recoverKey, '1');
            
            console.warn('Iniciando auto-recuperação...');
            
            const cleanup = async () => {
              try {
                if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker desregistrado');
                  }
                }
                
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
                console.log('Forçando recarregamento da página...');
                window.location.reload(true);
              }
            };
            
            cleanup();
            
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
          } else {
            console.error('Loop de recuperação detectado - não recarregando');
          }
        }
      };

      window.addEventListener('error', handleCriticalError, true);
      window.addEventListener('unhandledrejection', handleCriticalError, true);

      setTimeout(() => {
        sessionStorage.removeItem('pwa_recover_once');
      }, 30000);
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwRegistration(registration);
      });

      const checkForUpdateOnFocus = () => {
        swRegistration?.update();
      };

      window.addEventListener('focus', checkForUpdateOnFocus);

      return () => {
        window.removeEventListener('focus', checkForUpdateOnFocus);
      };
    }
  }, [swRegistration]);

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
      const updatedRegistration = await swRegistration.update();
      
      if (updatedRegistration && (updatedRegistration.installing || updatedRegistration.waiting)) {
        console.log("New Service Worker found and is installing/waiting.");
        setUpdateCheckStatus(''); 
      } else {
        console.log("No new update found or SW already activated.");
        setUpdateCheckStatus('updated');
        setTimeout(() => setUpdateCheckStatus(''), 2000);
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
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try { await r.unregister(); } catch(e) { console.warn('Erro ao desregistrar SW:', e); }
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          try { await caches.delete(k); } catch(e) { console.warn('Erro ao deletar cache:', e); }
        }
      }

      try { localStorage.clear(); } catch(e) { console.warn('Erro ao limpar localStorage:', e); }
      try { sessionStorage.clear(); } catch(e) { console.warn('Erro ao limpar sessionStorage:', e); }

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
      }

      window.location.reload(true);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      window.location.reload(true);
    }
  };

  const toggleSection = (sectionTitle) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Verifica se algum item da seção está ativo
  const isSectionActive = (section) => {
    return section.items.some(item => location.pathname === item.url);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <Sidebar className="border-r bg-white">
          <SidebarHeader className="border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
                <Sprout className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-green-800">AgroFinance</h1>
                <p className="text-xs text-gray-500">Sistema Unificado</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2 py-4">
            {navigationSections.map((section) => (
              <SidebarGroup key={section.title} className="mb-2">
                <Collapsible
                  open={openSections[section.title]}
                  onOpenChange={() => toggleSection(section.title)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded-md px-2 py-2 transition-colors">
                      <div className="flex items-center gap-2">
                        <section.icon className={`h-4 w-4 ${isSectionActive(section) ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className={`text-sm font-semibold ${isSectionActive(section) ? 'text-green-700' : 'text-gray-700'}`}>
                          {section.title}
                        </span>
                      </div>
                      {openSections[section.title] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={location.pathname === item.url}
                              className="pl-8"
                            >
                              <Link to={item.url} className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            ))}

            {/* Estatísticas Rápidas */}
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estatísticas Rápidas
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 py-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Projetos</span>
                    <span className="font-semibold text-green-700">{stats.totalProjetos}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Em Análise</span>
                    <span className="font-semibold text-amber-600">{stats.emAnalise}</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <RefreshCw className={`h-4 w-4 ${isCheckingForUpdate ? 'animate-spin' : ''}`} />
                    <span>Atualização</span>
                    {updateCheckStatus === 'updated' && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={handleManualUpdateCheck} disabled={isCheckingForUpdate}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingForUpdate ? 'animate-spin' : ''}`} />
                    {isCheckingForUpdate ? 'Verificando...' : 'Verificar Atualização'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleFullCacheClear} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Cache Completo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AppVersion />
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-white px-4 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800">{currentPageName}</h2>
            </div>
            <OfflineIndicator />
          </div>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      <PwaUpdateNotification />
    </SidebarProvider>
  );
}