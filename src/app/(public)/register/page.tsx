'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';

export default function RegisterPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        cnpj: '',
        phone: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Create the user profile in Firestore
            // Setting status to 'aguardando_aprovacao' by default
            await setDoc(doc(db, 'users', user.uid), {
                name: formData.name,
                email: formData.email,
                role: 'cliente',
                status: 'aguardando_aprovacao',
                cnpj: formData.cnpj, // Will be linked to a client doc later by admin
                phone: formData.phone,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // 3. Keep user logged in but redirect to pending page
            router.push('/pending');

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Ocorreu um erro ao criar a conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-foreground">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Solicitar Acesso</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Preencha seus dados para solicitar o cadastro na plataforma.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome / Razão Social</Label>
                            <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ</Label>
                            <MaskedInput mask="__.___.___/____-__" id="cnpj" name="cnpj" required value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Celular (WhatsApp)</Label>
                            <MaskedInput mask="(__) _____-____" id="phone" name="phone" required value={formData.phone} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Solicitar Cadastro'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Já possui cadastro?{' '}
                        <Link href="/login" className="font-medium text-primary hover:text-primary">
                            Faça login
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
