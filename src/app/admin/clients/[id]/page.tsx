'use client';

import { Suspense, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { ClientForm } from '@/features/clients/components/ClientForm';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientProfile } from '@/types/store';
import { ClientFormValues } from '@/features/clients/components/ClientForm';

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>}>
            <EditClientContent paramsPromise={params} />
        </Suspense>
    );
}

function EditClientContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();

    const [clientData, setClientData] = useState<Partial<ClientProfile> | null>(null);
    const [settings, setSettings] = useState({
        priceTables: [],
        paymentMethods: [],
        carriers: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Fetch Settings
                const docRef = doc(db, 'settings', 'global');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setSettings({
                        priceTables: data.priceTables || [],
                        paymentMethods: data.paymentMethods || [],
                        carriers: data.carriers || []
                    });
                }

                // Fetch Client
                const clientRef = doc(db, 'clients', params.id);
                const clientSnap = await getDoc(clientRef);

                if (clientSnap.exists()) {
                    setClientData(clientSnap.data());
                } else {
                    toast.error("Cliente não encontrado.");
                    router.push('/admin/clients');
                }
            } catch (error) {
                console.error("Erro ao puxar dados", error);
                toast.error("Erro ao carregar os dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [params.id, router]);

    const handleSave = async (data: ClientFormValues) => {
        try {
            const clientFormData = { ...data };
            const password = clientFormData.password;
            delete clientFormData.password;
            delete clientFormData.confirmPassword;

            // Se o admin informou nova senha, atualizar via API (Firebase Admin)
            if (password && password.length >= 6 && clientData?.email) {
                const token = await auth.currentUser?.getIdToken();
                if (!token) {
                    toast.error("Sessão expirada. Faça login novamente.");
                    return;
                }
                const res = await fetch('/api/admin/update-client-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        email: clientData.email,
                        newPassword: password,
                    }),
                });
                const json = await res.json();
                if (!res.ok) {
                    toast.error(json.error || 'Erro ao atualizar senha.');
                    return;
                }
            }

            await updateDoc(doc(db, 'clients', params.id), {
                ...clientFormData,
                updatedAt: new Date()
            });

            toast.success("Cliente atualizado com sucesso!");
            router.push('/admin/clients');
        } catch (error) {
            console.error("Error updating client:", error);
            toast.error("Ocorreu um erro ao atualizar o cliente.");
        }
    };

    const handleResetPassword = async () => {
        if (!clientData?.email) {
            toast.error("Este cliente não possui um email cadastrado.");
            return;
        }

        if (!confirm(`Deseja enviar um link de redefinição de senha para ${clientData.email}?`)) {
            return;
        }

        try {
            await sendPasswordResetEmail(auth, clientData.email);
            toast.success("Link de redefinição de senha enviado para o e-mail do cliente!");
        } catch (error: unknown) {
            console.error("Error sending reset email:", error);
            toast.error("Erro ao enviar link. Verifique se o e-mail está associado a uma conta ativa no sistema.");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando dados do cliente...</div>;
    }

    if (!clientData) return null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Editar Cliente</h2>
                    <p className="text-muted-foreground">
                        Modifique as informações e configurações do cliente B2B.
                    </p>
                </div>
                {clientData?.email && (
                    <div className="flex flex-col items-end gap-1">
                        <Button variant="outline" className="flex items-center gap-2" onClick={handleResetPassword}>
                            <KeyRound className="w-4 h-4" />
                            Enviar link por e-mail
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Se o link não chegar, use os campos de senha abaixo.
                        </span>
                    </div>
                )}
            </div>

            <ClientForm
                onSubmit={handleSave}
                settingsData={settings}
                initialData={clientData}
                showAccessFields
                requireAccessFields={false}
            />
        </div>
    );
}
