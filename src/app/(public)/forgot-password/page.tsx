'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError('Ocorreu um erro ao enviar o e-mail de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-foreground">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Recuperar Senha</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Digite seu e-mail para receber um link de redefinição de senha.
                    </p>
                </div>

                {success ? (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 text-center">
                        E-mail de recuperação enviado! Verifique sua caixa de entrada.
                        <div className="mt-4">
                            <Link href="/login" className="font-medium text-green-700 hover:text-green-600 underline">
                                Voltar para o Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                        </Button>

                        <div className="text-center">
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                Voltar para o Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
