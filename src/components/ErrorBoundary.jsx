import React from "react";
import { AlertTriangle, RefreshCw, Home, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: parseInt(sessionStorage.getItem('error_boundary_attempts') || '0')
    };
  }

  static getDerivedStateFromError(error) {
    console.error('[ErrorBoundary] Erro capturado:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Detalhes do erro:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });

    // Auto-recuperação para erros DOM críticos
    const errorMessage = error?.message || error?.toString() || '';
    const isDOMError = 
      errorMessage.includes('insertBefore') ||
      errorMessage.includes('removeChild') ||
      errorMessage.includes('appendChild') ||
      errorMessage.includes('is not a child of this node');

    const isChunkError = 
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('ChunkLoadError') ||
      errorMessage.includes('Failed to fetch dynamically imported module');

    if ((isDOMError || isChunkError) && this.state.recoveryAttempts < 2) {
      console.log(`[ErrorBoundary] Auto-recuperação ${this.state.recoveryAttempts + 1}/2 para erro crítico...`);
      
      this.setState({ isRecovering: true });
      
      const newAttempts = this.state.recoveryAttempts + 1;
      sessionStorage.setItem('error_boundary_attempts', String(newAttempts));

      // Limpar caches e recarregar
      if ('caches' in window) {
        caches.keys()
          .then(cacheNames => {
            console.log('[ErrorBoundary] Limpando', cacheNames.length, 'caches...');
            return Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          })
          .finally(() => {
            console.log('[ErrorBoundary] Recarregando aplicação...');
            setTimeout(() => {
              window.location.href = window.location.origin + window.location.pathname;
            }, 2000);
          });
      } else {
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname;
        }, 2000);
      }
    } else {
      // Após 2 tentativas ou erro não-crítico, resetar contador
      sessionStorage.setItem('error_boundary_attempts', '0');
    }
  }

  handleReset = () => {
    console.log('[ErrorBoundary] Resetando estado do erro...');
    
    // Limpar estado de recuperação
    sessionStorage.removeItem('error_boundary_attempts');
    sessionStorage.removeItem('recovery_attempt');
    sessionStorage.removeItem('pwa_recovered');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0
    });
  };

  handleManualReload = () => {
    console.log('[ErrorBoundary] Recarregamento manual iniciado...');
    this.setState({ isRecovering: true });
    
    // Limpar TUDO
    sessionStorage.clear();
    localStorage.clear();
    
    if ('caches' in window) {
      caches.keys()
        .then(cacheNames => Promise.all(cacheNames.map(name => caches.delete(name))))
        .finally(() => {
          window.location.href = window.location.origin + window.location.pathname;
        });
    } else {
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  handleClearAllData = () => {
    if (!window.confirm('⚠️ ATENÇÃO: Isso irá limpar TODOS os dados salvos localmente e recarregar a página.\n\nDeseja continuar?')) {
      return;
    }

    console.log('[ErrorBoundary] Limpeza total de dados iniciada...');
    this.setState({ isRecovering: true });

    // Limpar ABSOLUTAMENTE TUDO
    try {
      sessionStorage.clear();
      localStorage.clear();
      console.log('[ErrorBoundary] Storage limpo');
    } catch (e) {
      console.error('[ErrorBoundary] Erro ao limpar storage:', e);
    }

    // Desregistrar service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          console.log(`[ErrorBoundary] Removendo ${registrations.length} service workers...`);
          return Promise.all(registrations.map(r => r.unregister()));
        })
        .then(() => {
          console.log('[ErrorBoundary] Service workers removidos');
          return caches.keys();
        })
        .then(cacheNames => {
          console.log(`[ErrorBoundary] Limpando ${cacheNames.length} caches...`);
          return Promise.all(cacheNames.map(name => caches.delete(name)));
        })
        .finally(() => {
          console.log('[ErrorBoundary] Limpeza completa. Recarregando...');
          setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
          }, 500);
        });
    } else {
      // Sem service worker, apenas limpar caches
      if ('caches' in window) {
        caches.keys()
          .then(cacheNames => Promise.all(cacheNames.map(name => caches.delete(name))))
          .finally(() => {
            window.location.href = window.location.origin + window.location.pathname;
          });
      } else {
        window.location.href = window.location.origin + window.location.pathname;
      }
    }
  };

  handleGoHome = () => {
    console.log('[ErrorBoundary] Navegando para página inicial...');
    sessionStorage.removeItem('error_boundary_attempts');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    });
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.isRecovering) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <RefreshCw className="w-6 h-6 animate-spin" />
                Recuperando Aplicação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-700 font-medium">
                  Aguarde enquanto a aplicação é recuperada...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Limpando cache e recarregando componentes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Erro desconhecido';
      const isDOMError = 
        errorMessage.includes('insertBefore') ||
        errorMessage.includes('removeChild') ||
        errorMessage.includes('is not a child of this node');

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-2xl border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-6 h-6" />
                Erro na Aplicação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Erro Inesperado</h3>
                <p className="text-sm text-red-700 mb-3">
                  A aplicação encontrou um problema durante a execução. Escolha uma das opções abaixo para continuar:
                </p>
                
                {isDOMError && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 mb-3">
                    <p className="text-xs text-yellow-800">
                      <strong>🔧 Problema detectado:</strong> Erro de manipulação DOM relacionado ao PWA.
                      Recomendamos usar a opção "Limpeza Total" para resolver definitivamente.
                    </p>
                  </div>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                    Erro técnico:
                  </summary>
                  <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-32">
                    {errorMessage}
                  </pre>
                </details>
              </div>

              <div className="grid gap-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  ✅ Tentar Continuar (Recomendado)
                </Button>

                <Button
                  onClick={this.handleManualReload}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  🔄 Recarregar Aplicação
                </Button>

                <Button
                  onClick={this.handleClearAllData}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  size="lg"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  🧹 Limpeza Total (Cache + PWA)
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full border-gray-300"
                  size="lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  🏠 Voltar ao Início
                </Button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
                <p className="font-semibold mb-2">💡 Dicas:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Se o problema persistir, tente a opção <strong>"Limpeza Total"</strong></li>
                  <li>Limpe o cache do navegador (Ctrl+Shift+Delete)</li>
                  <li>Use o modo de navegação anônima como alternativa temporária</li>
                  {isDOMError && (
                    <li className="text-yellow-700">
                      <strong>Erro DOM detectado:</strong> Provavelmente causado por conflito de PWA/Service Worker
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;