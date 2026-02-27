'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectParams = searchParams.get('redirect');
    const errorParams = searchParams.get('error');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Fetch user role to decide redirect
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

            if (!userDoc.exists()) {
                throw new Error('Usuário não encontrado na base de dados.');
            }

            const userData = userDoc.data();

            if (userData.status === 'aguardando_aprovacao') {
                router.push('/pending');
                return;
            }

            if (userData.status === 'inativo') {
                throw new Error('Sua conta está desativada.');
            }

            // If redirect param exists, go there
            if (redirectParams) {
                router.push(redirectParams);
                return;
            }

            // Otherwise default routes based on role
            if (userData.role === 'cliente') {
                router.push('/app');
            } else {
                router.push('/admin');
            }

        } catch (err: any) {
            console.error(err);
            setError('E-mail ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-foreground">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso ao Portal</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {errorParams === 'account_disabled'
                            ? 'Sua conta está desativada. Entre em contato com o suporte.'
                            : 'Entre com seus dados para acessar.'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary">
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Ainda não tem cadastro?{' '}
                        <Link href="/register" className="font-medium text-primary hover:text-primary">
                            Solicite seu acesso
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
