import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export default function PwaUpdateNotification() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [swRegistration, setSwRegistration] = useState(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                setSwRegistration(registration);
                
                // Se já houver uma nova versão esperando
                if (registration.waiting) {
                    setNeedRefresh(true);
                }

                // Ouvir por novas versões
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setNeedRefresh(true);
                            }
                        });
                    }
                });
            }).catch(error => {
                console.error('Erro ao registrar o Service Worker:', error);
            });

            // Recarregar quando o novo SW assume o controle
            const handleControllerChange = () => {
                window.location.reload();
            };
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

            return () => {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            };
        }
    }, []);

    const handleUpdate = () => {
        if (swRegistration && swRegistration.waiting) {
            // Enviar mensagem para o SW ativar imediatamente
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };
    
    if (!needRefresh) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom duration-500">
            <Alert className="bg-white shadow-lg border-green-200">
                <AlertDescription className="flex items-center justify-between gap-4">
                    <span className="text-green-800 font-medium">
                        Nova versão disponível!
                    </span>
                    <Button onClick={handleUpdate} size="sm" className="bg-green-600 hover:bg-green-700">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}