'use client';

import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.status !== 'aguardando_aprovacao')) {
            router.replace('/');
        }
    }, [user, loading, router]);

    if (loading || !user) return null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Cadastro em Análise</h2>
                    <p className="text-sm text-muted-foreground">
                        Sua solicitação de cadastro foi recebida e está aguardando aprovação por nossa equipe.
                        Você receberá um contato assim que seu acesso for liberado.
                    </p>
                </div>

                <div className="pt-4">
                    <Button variant="outline" onClick={() => signOut()} className="w-full">
                        Sair
                    </Button>
                </div>
            </div>
        </div>
    );
}
