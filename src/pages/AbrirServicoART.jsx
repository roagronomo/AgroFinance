
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtsNotificacoes } from '@/entities/ArtsNotificacoes';
import { User } from '@/entities/User';
import FormularioServico from '../components/arts/FormularioServico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardPlus } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AbrirServicoART() {
    const navigate = useNavigate();

    const handleSubmit = async (dados) => {
        try {
            const user = await User.me();
            const payload = { 
                ...dados, 
                responsavel_email: user.email,
                publishedAt: Date.now() // Timestamp para ordenação
            };
            await ArtsNotificacoes.create(payload);
            navigate(createPageUrl('GerenciamentoARTs'));
        } catch (error) {
            console.error("Erro ao criar serviço:", error);
            alert("Erro ao salvar o serviço. Verifique os dados e tente novamente.");
        }
    };

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
                        <h1 className="text-2xl md:text-3xl font-bold text-green-900">Abrir Novo Serviço</h1>
                        <p className="text-green-600 mt-1">Preencha as informações da notificação/ART</p>
                    </div>
                </div>

                <Card className="shadow-xl border-green-100">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <ClipboardPlus className="w-6 h-6" />
                            Detalhes do Serviço
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <FormularioServico onSubmit={handleSubmit} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
