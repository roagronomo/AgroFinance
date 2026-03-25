import React from "react";
import { CreditCard, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GerenciarPixDialog({
  open, onClose,
  chavesPix, formChavePix, setFormChavePix, editingChavePix, setEditingChavePix,
  gruposPixExpandidos, setGruposPixExpandidos,
  onSalvar, onExcluir, formatarChavePixPorTipo
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { onClose(); } }}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Gerenciar Chaves PIX
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cadastre suas chaves PIX para usar rapidamente ao criar contas a pagar
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <form onSubmit={onSalvar} className="space-y-3 border rounded-lg p-4 bg-blue-50">
            <div>
              <Label>Descrição *</Label>
              <Input value={formChavePix.descricao} onChange={(e) => setFormChavePix({...formChavePix, descricao: e.target.value})} placeholder="Ex: Banco Itaú - Isabela" required />
            </div>
            <div>
              <Label>Tipo de Chave *</Label>
              <Select value={formChavePix.tipo} onValueChange={(value) => setFormChavePix({...formChavePix, tipo: value, chave: ""})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone/Celular</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chave PIX *</Label>
              <Input
                value={formChavePix.chave}
                onChange={(e) => setFormChavePix({...formChavePix, chave: formatarChavePixPorTipo(e.target.value, formChavePix.tipo)})}
                placeholder={
                  formChavePix.tipo === 'cpf' ? '000.000.000-00' :
                  formChavePix.tipo === 'cnpj' ? '00.000.000/0000-00' :
                  formChavePix.tipo === 'email' ? 'seu@email.com' :
                  formChavePix.tipo === 'telefone' ? '(00) 00000-0000' :
                  'Cole a chave aleatória'
                }
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                {editingChavePix ? "Atualizar" : "Adicionar"}
              </Button>
              {editingChavePix && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setFormChavePix({ descricao: "", chave: "", tipo: "cpf" }); setEditingChavePix(null); }}>
                  Cancelar
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={onClose} className="ml-auto">Fechar</Button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Chaves Cadastradas ({chavesPix.length})</h3>
            {chavesPix.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma chave cadastrada</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const grupos = chavesPix.reduce((acc, chave) => {
                    const nomeGrupo = chave.descricao || "Sem descrição";
                    if (!acc[nomeGrupo]) acc[nomeGrupo] = [];
                    acc[nomeGrupo].push(chave);
                    return acc;
                  }, {});
                  return Object.entries(grupos).map(([nomeGrupo, chavesDoGrupo]) => {
                    const grupoAberto = gruposPixExpandidos[nomeGrupo] || false;
                    return (
                      <div key={nomeGrupo} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => setGruposPixExpandidos(prev => ({ ...prev, [nomeGrupo]: !grupoAberto }))}>
                          <div className="flex items-center gap-2 flex-1">
                            {grupoAberto ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
                            <p className="font-semibold text-gray-900">{nomeGrupo}</p>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                              {chavesDoGrupo.length} {chavesDoGrupo.length === 1 ? 'chave' : 'chaves'}
                            </span>
                          </div>
                        </div>
                        {grupoAberto && (
                          <div className="divide-y bg-white">
                            {chavesDoGrupo.map((chave) => (
                              <div key={chave.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 font-mono">{chave.chave}</p>
                                  <p className="text-xs text-gray-400">Tipo: {chave.tipo || 'CPF'}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingChavePix(chave); setFormChavePix({ descricao: chave.descricao || "", chave: chave.chave, tipo: chave.tipo || "cpf" }); }} className="text-blue-600 hover:text-blue-700 h-8 w-8">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onExcluir(chave.id); }} className="text-red-600 hover:text-red-700 h-8 w-8">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}