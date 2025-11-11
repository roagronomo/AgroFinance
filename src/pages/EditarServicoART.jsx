import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtsNotificacoes } from '@/entities/ArtsNotificacoes';
import FormularioServico from '../components/arts/FormularioServico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EditarServicoART() {
    const navigate = useNavigate();
    const [servico, setServico] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const urlParams = new URLSearchParams(window.location.search);
    const servicoId = urlParams.get('id');

    useEffect(() => {
        if (!servicoId) {
            navigate(createPageUrl('GerenciamentoARTs'));
            return;
        }
        async function fetchServico() {
            try {
                // Buscar apenas serviços da mesma organização (as regras RLS cuidam disso automaticamente)
                const data = await ArtsNotificacoes.filter({ id: servicoId });
                if (data.length > 0) {
                    setServico(data[0]);
                } else {
                    console.error("Serviço não encontrado ou não acessível.");
                    alert("Serviço não encontrado ou você não tem permissão para acessá-lo.");
                    navigate(createPageUrl('GerenciamentoARTs'));
                }
            } catch (error) {
                console.error("Erro ao carregar serviço:", error);
                alert("Erro ao carregar serviço. Tente novamente.");
                navigate(createPageUrl('GerenciamentoARTs'));
            }
            setIsLoading(false);
        }
        fetchServico();
    }, [servicoId, navigate]);

    const handleSubmit = async (dados) => {
        try {
            await ArtsNotificacoes.update(servicoId, dados);
            navigate(createPageUrl('GerenciamentoARTs'));
        } catch (error) {
            console.error("Erro ao atualizar serviço:", error);
            alert("Erro ao salvar as alterações. Verifique suas permissões e tente novamente.");
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-4 text-green-600">Carregando...</p>
            </div>
        );
    }
    
    if (!servico) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-600">Serviço não encontrado ou não acessível.</p>
                <Button 
                    onClick={() => navigate(createPageUrl('GerenciamentoARTs'))} 
                    className="mt-4"
                >
                    Voltar para Gerenciamento
                </Button>
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
                        onClick={() => navigate(createPageUrl("GerenciamentoARTs"))}
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