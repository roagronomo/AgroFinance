import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import FormularioServico from '../components/arts/FormularioServico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditarServicoART() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const servicoId = searchParams.get('id');
    
    const [servico, setServico] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        console.log("🔍 URL completa:", window.location.href);
        console.log("🔍 Search params:", window.location.search);
        console.log("🔍 ID do serviço:", servicoId);
        
        if (!servicoId) {
            console.error("❌ Nenhum ID fornecido na URL");
            setErro("Nenhum ID de serviço fornecido na URL");
            setIsLoading(false);
            return;
        }
        
        carregarServico();
    }, []);

    const carregarServico = async () => {
        try {
            setIsLoading(true);
            setErro(null);
            
            console.log("📡 Buscando serviço ID:", servicoId);
            
            // Buscar TODOS os serviços e encontrar o específico
            const todosServicos = await base44.entities.ArtsNotificacoes.list("-created_date", 500);
            
            console.log("📊 Total de serviços:", todosServicos?.length || 0);
            
            if (!todosServicos || todosServicos.length === 0) {
                setErro("Nenhum serviço encontrado no sistema");
                setIsLoading(false);
                return;
            }
            
            const servicoEncontrado = todosServicos.find(s => s.id === servicoId);
            
            if (servicoEncontrado) {
                console.log("✅ Serviço encontrado:", servicoEncontrado.numero_notificacao);
                setServico(servicoEncontrado);
            } else {
                console.error("❌ Serviço não encontrado com ID:", servicoId);
                console.log("IDs disponíveis (primeiros 10):", todosServicos.slice(0, 10).map(s => s.id));
                setErro("Serviço não encontrado");
            }
        } catch (error) {
            console.error("❌ Erro ao carregar serviço:", error);
            console.error("Stack:", error?.stack);
            setErro(`Erro ao carregar: ${error?.message || 'Erro desconhecido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (dados) => {
        try {
            console.log("💾 Salvando alterações do serviço:", servicoId);
            await base44.entities.ArtsNotificacoes.update(servicoId, dados);
            console.log("✅ Serviço atualizado com sucesso");
            navigate(createPageUrl('GerenciamentoARTs'));
        } catch (error) {
            console.error("❌ Erro ao atualizar serviço:", error);
            alert("Erro ao salvar as alterações. Tente novamente.");
        }
    };

    const handleVoltar = () => {
        navigate(createPageUrl('GerenciamentoARTs'));
    };

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-600 text-lg">Carregando serviço...</p>
                <p className="text-gray-400 text-sm mt-2">ID: {servicoId}</p>
            </div>
        );
    }
    
    if (erro || !servico) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800">
                        <p className="font-semibold mb-2">Não foi possível carregar o serviço</p>
                        <p className="text-sm">{erro || "Serviço não encontrado"}</p>
                        {servicoId && (
                            <p className="text-xs mt-2 text-red-600">ID buscado: {servicoId}</p>
                        )}
                    </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                    <Button onClick={handleVoltar} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <Button onClick={carregarServico} className="bg-emerald-600 hover:bg-emerald-700">
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleVoltar}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-green-900">Editar Serviço</h1>
                        <p className="text-green-600 mt-1">Nº da Notificação {servico.numero_notificacao || servico.id}</p>
                    </div>
                </div>

                <Card className="shadow-xl border-green-100">
                     <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <Edit className="w-6 h-6" />
                            Detalhes do Serviço
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <FormularioServico servicoInicial={servico} onSubmit={handleSubmit} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}