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
import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrencyInput, normalizeSettingOptions, parseCurrencyInput } from '@/lib/commerce';
import { SettingOption } from '@/types/store';

export default function SettingsPage() {
    const [priceTables, setPriceTables] = useState<SettingOption[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<SettingOption[]>([]);
    const [carriers, setCarriers] = useState<SettingOption[]>([]);
    const [minimumOrderValue, setMinimumOrderValue] = useState('R$ 0,00');
    const [loading, setLoading] = useState(true);
    const [savingMinimumOrder, setSavingMinimumOrder] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setPriceTables(normalizeSettingOptions(data.priceTables || []));
                setPaymentMethods(normalizeSettingOptions(data.paymentMethods || []));
                setCarriers(normalizeSettingOptions(data.carriers || []));
                setMinimumOrderValue(
                    formatCurrencyInput(String(Math.round(Number(data.minimumOrderValue || 0) * 100)))
                );
            } else {
                await setDoc(docRef, {
                    priceTables: [],
                    paymentMethods: [],
                    carriers: [],
                    minimumOrderValue: 0,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar configurações');
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

            toast.success('Configuração atualizada com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar configuração');
        }
    };

    const handleSaveMinimumOrder = async () => {
        setSavingMinimumOrder(true);
        try {
            await setDoc(
                doc(db, 'settings', 'global'),
                { minimumOrderValue: parseCurrencyInput(minimumOrderValue) },
                { merge: true }
            );
            toast.success('Pedido mínimo padrão atualizado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar pedido mínimo padrão.');
        } finally {
            setSavingMinimumOrder(false);
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

            <div className="bg-white p-6 rounded-xl shadow-sm border border-border space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Regras Comerciais</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Defina o pedido mínimo padrão usado quando o cliente não tiver uma regra específica.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[260px_auto] md:items-end">
                    <div className="space-y-2">
                        <Label>Pedido mínimo padrão</Label>
                        <Input
                            value={minimumOrderValue}
                            onChange={(event) => setMinimumOrderValue(formatCurrencyInput(event.target.value))}
                            placeholder="R$ 0,00"
                        />
                    </div>
                    <div>
                        <Button onClick={handleSaveMinimumOrder} disabled={savingMinimumOrder}>
                            {savingMinimumOrder ? 'Salvando...' : 'Salvar regra'}
                        </Button>
                    </div>
                </div>
            </div>

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

function SettingSection({
    title,
    options,
    onChange,
}: {
    title: string;
    options: SettingOption[];
    onChange: (opts: SettingOption[]) => void;
}) {
    const [newLabel, setNewLabel] = useState('');
    const [editingId, setEditingId] = useState('');
    const [editingLabel, setEditingLabel] = useState('');

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const newOpt = { id: Date.now().toString(), label: newLabel.trim(), active: true };
        onChange([...options, newOpt]);
        setNewLabel('');
    };

    const toggleStatus = (id: string) => {
        const updated = options.map((opt) =>
            opt.id === id ? { ...opt, active: !opt.active } : opt
        );
        onChange(updated);
    };

    const startEditing = (option: SettingOption) => {
        setEditingId(option.id);
        setEditingLabel(option.label);
    };

    const saveEdit = () => {
        if (!editingId || !editingLabel.trim()) return;
        onChange(
            options.map((option) =>
                option.id === editingId ? { ...option, label: editingLabel.trim() } : option
            )
        );
        setEditingId('');
        setEditingLabel('');
    };

    const handleDelete = (id: string) => {
        onChange(options.filter((option) => option.id !== id));
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">{title}</h3>

            <div className="space-y-2">
                {options.map((option) => (
                    <div key={option.id} className="flex items-center justify-between gap-3 p-2 hover:bg-muted/50 rounded border border-border">
                        <div className="flex-1">
                            {editingId === option.id ? (
                                <Input
                                    value={editingLabel}
                                    onChange={(event) => setEditingLabel(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            saveEdit();
                                        }
                                    }}
                                />
                            ) : (
                                <span className={`text-sm ${!option.active && 'line-through text-muted-foreground'}`}>
                                    {option.label}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {editingId === option.id ? (
                                <Button variant="ghost" size="sm" onClick={saveEdit}>
                                    Salvar
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => startEditing(option)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => toggleStatus(option.id)}>
                                {option.active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(option.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {options.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
            </div>

            <div className="pt-4 flex gap-2">
                <Input
                    placeholder="Novo item..."
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAdd();
                        }
                    }}
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
        } catch (error: unknown) {
            console.error(error);
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'auth/requires-recent-login'
            ) {
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
