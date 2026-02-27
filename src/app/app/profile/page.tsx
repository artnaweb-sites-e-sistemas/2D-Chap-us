'use client';

import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
    const { user } = useAuth();

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Minha Conta</h2>
                <p className="text-muted-foreground">Mantenha seus dados atualizados e acesse seu histórico.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Dados de Acesso</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input value={user?.email || ''} readOnly className="bg-muted/50 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label>Nome / Razão Social</Label>
                        <Input value={user?.name || ''} readOnly className="bg-muted/50 text-muted-foreground" />
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <h4 className="font-medium text-foreground mb-4">Alterar Senha</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <Input type="password" />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar Nova Senha</Label>
                            <Input type="password" />
                        </div>
                    </div>
                    <Button className="mt-4">Atualizar Senha</Button>
                </div>
            </div>
        </div>
    );
}
