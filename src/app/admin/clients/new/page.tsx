'use client';

import { ClientForm } from '@/features/clients/components/ClientForm';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getDoc } from 'firebase/firestore';

function NewClientContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const uid = searchParams.get('uid');
    const cnpj = searchParams.get('cnpj');
    const email = searchParams.get('email');

    const [settings, setSettings] = useState({
        priceTables: [],
        paymentMethods: [],
        carriers: []
    });
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
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
            } catch (error) {
                console.error("Erro ao puxar settings", error);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (data: any) => {
        try {
            // Save new client to Firestore
            const clientData = {
                ...data,
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'clients'), clientData);

            // If we came from an approval flow, link the user and activate them
            if (uid) {
                const userRef = doc(db, 'users', uid);
                await updateDoc(userRef, {
                    status: 'ativo',
                    clientId: docRef.id,
                    updatedAt: serverTimestamp(),
                });
            }

            toast.success("Cliente salvo com sucesso!");
            router.push('/admin/clients');
        } catch (error) {
            console.error("Error creating client:", error);
            toast.error("Ocorreu um erro ao salvar o cliente.");
        }
    };

    const initialData = {
        cnpj: cnpj || '',
        email: email ? decodeURIComponent(email) : '',
        status: 'ativo' as const
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Novo Cliente</h2>
                <p className="text-muted-foreground">
                    {uid ? 'Aprovando cadastro pendente e vinculando empresa.' : 'Crie um novo cliente utilizando busca por CNPJ.'}
                </p>
            </div>

            {loadingSettings ? (
                <div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>
            ) : (
                <ClientForm onSubmit={handleSave} settingsData={settings} initialData={initialData} />
            )}
        </div>
    );
}

export default function NewClientPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>}>
            <NewClientContent />
        </Suspense>
    );
}

