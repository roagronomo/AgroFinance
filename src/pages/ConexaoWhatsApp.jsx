import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, QrCode, LogOut, RotateCcw, Phone, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

export default function ConexaoWhatsApp() {
  const [instancias, setInstancias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [instanciaQR, setInstanciaQR] = useState(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);
  const intervaloRef = useRef(null);

  useEffect(() => {
    carregarStatus();
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, []);

  const carregarStatus = async () => {
    try {
      setCarregando(true);
      const response = await base44.functions.invoke('evolutionStatus', { acao: 'status' });
      if (response.success) {
        setInstancias(response.instancias);
      } else {
        toast.error("Erro ao consultar status");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Falha na comunicação com a Evolution API");
    } finally {
      setCarregando(false);
    }
  };

  const gerarQRCode = async (nomeInstancia) => {
    try {
      setAcaoEmAndamento(nomeInstancia);
      setInstanciaQR(nomeInstancia);
      setQrCode(null);

      const response = await base44.functions.invoke('evolutionStatus', { 
        acao: 'conectar', 
        instancia: nomeInstancia 
      });

      if (response.success && response.qrcode) {
        setQrCode(response.qrcode);
        // Polling a cada 5s para verificar se conectou
        if (intervaloRef.current) clearInterval(intervaloRef.current);
        intervaloRef.current = setInterval(async () => {
          const statusResp = await base44.functions.invoke('evolutionStatus', { acao: 'status' });
          if (statusResp.success) {
            const inst = statusResp.instancias.find(i => i.nome === nomeInstancia);
            if (inst && inst.status === 'open') {
              clearInterval(intervaloRef.current);
              intervaloRef.current = null;
              setQrCode(null);
              setInstanciaQR(null);
              setInstancias(statusResp.instancias);
              toast.success(`${nomeInstancia} conectada`);
            }
          }
        }, 5000);
      } else {
        toast.error("Não foi possível gerar o QR Code");
        setInstanciaQR(null);
      }
    } catch (error) {
      console.error("Erro QR:", error);
      toast.error("Erro ao gerar QR Code");
      setInstanciaQR(null);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const desconectar = async (nomeInstancia) => {
    if (!confirm(`Desconectar ${nomeInstancia}?`)) return;
    try {
      setAcaoEmAndamento(nomeInstancia);
      const response = await base44.functions.invoke('evolutionStatus', { 
        acao: 'desconectar', 
        instancia: nomeInstancia 
      });
      if (response.success) {
        toast.success("Desconectada");
        carregarStatus();
      } else {
        toast.error("Erro ao desconectar");
      }
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const reiniciar = async (nomeInstancia) => {
    try {
      setAcaoEmAndamento(nomeInstancia);
      const response = await base44.functions.invoke('evolutionStatus', { 
        acao: 'reiniciar', 
        instancia: nomeInstancia 
      });
      if (response.success) {
        toast.success("Reiniciada");
        setTimeout(carregarStatus, 2000);
      } else {
        toast.error("Erro ao reiniciar");
      }
    } catch (error) {
      toast.error("Erro ao reiniciar");
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const fecharQR = () => {
    if (intervaloRef.current) { clearInterval(intervaloRef.current); intervaloRef.current = null; }
    setQrCode(null);
    setInstanciaQR(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header discreto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Conexão WhatsApp</h1>
          <p className="text-sm text-gray-500">Status das instâncias da Evolution API</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={carregarStatus} 
          disabled={carregando}
          className="text-gray-500"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards das instâncias */}
      {carregando && instancias.length === 0 ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        instancias.map((inst) => {
          const conectada = inst.status === 'open';
          return (
            <Card key={inst.nome} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {/* Info da instância */}
                  <div className="flex items-start gap-3">
                    {/* Foto de perfil ou ícone */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${conectada ? 'bg-green-50' : 'bg-gray-100'}`}>
                      {conectada ? (
                        <Wifi className="h-5 w-5 text-green-600" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-800">{inst.nome}</span>
                        <Badge 
                          variant={conectada ? "default" : "secondary"}
                          className={`text-xs px-1.5 py-0 ${conectada ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {conectada ? 'Conectada' : 'Desconectada'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{inst.perfil}</p>
                      {inst.numero !== '—' && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{inst.numero}</span>
                        </div>
                      )}
                      {/* Métricas discretas */}
                      {conectada && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageSquare className="h-3 w-3" />
                            {inst.mensagens.toLocaleString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="h-3 w-3" />
                            {inst.contatos.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {/* Motivo da desconexão */}
                      {!conectada && inst.desconexao && (
                        <p className="text-xs text-gray-400 mt-1">
                          Desconectada em {new Date(inst.desconexao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {inst.motivoDesconexao === 401 && ' — dispositivo removido'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {!conectada && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => gerarQRCode(inst.nome)}
                        disabled={acaoEmAndamento === inst.nome}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs h-8 px-2"
                      >
                        <QrCode className="h-3.5 w-3.5 mr-1" />
                        Conectar
                      </Button>
                    )}
                    {conectada && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reiniciar(inst.nome)}
                          disabled={acaoEmAndamento === inst.nome}
                          className="text-gray-400 hover:text-gray-600 text-xs h-8 px-2"
                          title="Reiniciar"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => desconectar(inst.nome)}
                          disabled={acaoEmAndamento === inst.nome}
                          className="text-gray-400 hover:text-red-500 text-xs h-8 px-2"
                          title="Desconectar"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* QR Code inline */}
                {instanciaQR === inst.nome && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {qrCode ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-xs text-gray-500">Escaneie com o WhatsApp no celular</p>
                        <img 
                          src={qrCode} 
                          alt="QR Code" 
                          className="w-56 h-56 border border-gray-200 rounded-lg"
                        />
                        <Button variant="ghost" size="sm" onClick={fecharQR} className="text-xs text-gray-400">
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-center py-6">
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Rodapé discreto */}
      {instancias.length > 0 && (
        <p className="text-xs text-gray-300 text-center pt-2">
          Evolution API v2.3.7 — Railway
        </p>
      )}
    </div>
  );
}
