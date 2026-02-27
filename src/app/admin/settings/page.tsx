'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';

export interface SettingOption { id: string; label: string; active: boolean; }

export default function SettingsPage() {
    const [priceTables, setPriceTables] = useState<SettingOption[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<SettingOption[]>([]);
    const [carriers, setCarriers] = useState<SettingOption[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setPriceTables(data.priceTables || []);
                setPaymentMethods(data.paymentMethods || []);
                setCarriers(data.carriers || []);
            } else {
                await setDoc(docRef, { priceTables: [], paymentMethods: [], carriers: [] });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar configurações");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const updateGlobalSettings = async (key: string, newOptions: SettingOption[]) => {
        try {
            await setDoc(doc(db, 'settings', 'global'), { [key]: newOptions }, { merge: true });

            if (key === 'priceTables') setPriceTables(newOptions);
            if (key === 'paymentMethods') setPaymentMethods(newOptions);
            if (key === 'carriers') setCarriers(newOptions);

            toast.success("Configuração atualizada com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar configuração");
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando configurações...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Configurações Gerais</h2>
                <p className="text-muted-foreground">Gerencie suas configurações de perfil e negócio.</p>
            </div>

            <ProfileSettings />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <SettingSection
                    title="Tabelas de Preço"
                    options={priceTables}
                    onChange={(opts) => updateGlobalSettings('priceTables', opts)}
                />
                <SettingSection
                    title="Formas de Pagamento"
                    options={paymentMethods}
                    onChange={(opts) => updateGlobalSettings('paymentMethods', opts)}
                />
                <SettingSection
                    title="Transportadoras"
                    options={carriers}
                    onChange={(opts) => updateGlobalSettings('carriers', opts)}
                />
            </div>
        </div>
    );
}

function SettingSection({ title, options, onChange }: { title: string, options: SettingOption[], onChange: (opts: SettingOption[]) => void }) {
    const [newLabel, setNewLabel] = useState('');

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const newOpt = { id: Date.now().toString(), label: newLabel, active: true };
        onChange([...options, newOpt]);
        setNewLabel('');
    };

    const toggleStatus = (id: string) => {
        const updated = options.map(opt => opt.id === id ? { ...opt, active: !opt.active } : opt);
        onChange(updated);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">{title}</h3>

            <div className="space-y-2">
                {options.map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded border border-border">
                        <span className={`text-sm ${!opt.active && 'line-through text-muted-foreground'}`}>{opt.label}</span>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(opt.id)}>
                            {opt.active ? 'Desativar' : 'Ativar'}
                        </Button>
                    </div>
                ))}
                {options.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
            </div>

            <div className="pt-4 flex gap-2">
                <Input
                    placeholder="Novo item..."
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd}>Adicionar</Button>
            </div>
        </div>
    );
}

function ProfileSettings() {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.name) setName(user.name);
        if (user?.email) setEmail(user.email);
    }, [user]);

    const handleSave = async () => {
        if (!user || !name.trim() || !email.trim()) return;
        setSaving(true);
        try {
            // Update Auth Email if changed
            if (auth.currentUser && email !== user.email) {
                await updateEmail(auth.currentUser, email.trim());
            }

            // Update Firestore Profile
            await updateDoc(doc(db, 'users', user.uid), {
                name: name.trim(),
                email: email.trim()
            });

            toast.success("Perfil atualizado com sucesso!");
        } catch (error: any) {
            console.error(error);
            if (error?.code === 'auth/requires-recent-login') {
                toast.error("Para alterar o e-mail, é necessário fazer logout e login novamente por motivos de segurança.");
            } else {
                toast.error("Erro ao atualizar perfil. Verifique se o e-mail é válido.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Meu Perfil</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Email <span className="text-xs text-muted-foreground">(Login)</span></Label>
                    <Input value={email} type="email" onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Input value={user.role === 'admin' ? 'Administrador' : user.role === 'equipe' ? 'Membro da Equipe' : 'Cliente'} disabled className="bg-muted text-muted-foreground capitalize" />
                </div>
            </div>
            <div className="pt-2">
                <Button onClick={handleSave} disabled={saving || (name === user.name && email === user.email)}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
}
