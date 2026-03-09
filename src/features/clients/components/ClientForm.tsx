'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { EditableSelect } from '@/features/settings/components/EditableSelect';
import { MaskedInput } from '@/components/ui/masked-input';
import { fetchCnpjInfo } from '@/services/cnpj';
import { Search, MessageCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const clientSchema = z.object({
    razaoSocial: z.string().min(2, 'Razão Social é obrigatória'),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().min(14, 'CNPJ inválido'),
    inscricaoEstadual: z.string().optional(),
    cep: z.string().optional(),
    email: z.string().email('E-mail inválido').or(z.literal('')),
    phone: z.string().min(8, 'Telefone obrigatório'),
    contactName: z.string().min(2, 'Nome do contato é obrigatório'),
    uf: z.string().length(2, 'UF inválida'),
    status: z.enum(['ativo', 'inativo', 'aguardando_aprovacao']),
    priceTableId: z.string().min(1, 'Selecione uma tabela de preço'),
    paymentMethod: z.string().optional(),
    carrier: z.string().optional(),
    creditLimit: z.number().min(0).optional(),
    minimumOrderValue: z.number().min(0).optional(),
    notes: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    deliveryAddress: z.object({
        cep: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        district: z.string().optional(),
        city: z.string().optional(),
        uf: z.string().optional(),
        complement: z.string().optional(),
        reference: z.string().optional(),
    }).optional(),
}).superRefine((data, ctx) => {
    if (data.password && data.password.length < 6) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'A senha deve ter pelo menos 6 caracteres',
        });
    }

    if (data.password && data.password !== data.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['confirmPassword'],
            message: 'A confirmação da senha não confere',
        });
    }
});

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
    initialData?: Partial<ClientFormValues>;
    onSubmit: (data: ClientFormValues) => Promise<void>;
    showAccessFields?: boolean;
    requireAccessFields?: boolean;
    // Mocking settings data injects for the MVP
    settingsData: {
        priceTables: { id: string; label: string }[];
        paymentMethods: { id: string; label: string }[];
        carriers: { id: string; label: string }[];
    }
}

export function ClientForm({
    initialData,
    onSubmit,
    settingsData,
    showAccessFields = false,
    requireAccessFields = false,
}: ClientFormProps) {
    const [loadingCnpj, setLoadingCnpj] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal state for dynamic settings addition
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: string, title: string, mode: 'create' | 'edit', currentOptionId?: string }>({ isOpen: false, type: '', title: '', mode: 'create' });
    const [modalInputValue, setModalInputValue] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            status: 'ativo',
            creditLimit: 0,
            minimumOrderValue: 0,
            deliveryAddress: {
                cep: '',
                street: '',
                number: '',
                district: '',
                city: '',
                uf: '',
                complement: '',
                reference: '',
            },
            ...initialData,
        },
    });

    const cnpjValue = watch('cnpj');
    const phoneValue = watch('phone');
    const passwordValue = watch('password');

    const handleCnpjSearch = async () => {
        if (!cnpjValue || cnpjValue.length < 14) return;

        setLoadingCnpj(true);
        try {
            const data = await fetchCnpjInfo(cnpjValue);
            if (data) {
                setValue('razaoSocial', data.razao_social);
                setValue('nomeFantasia', data.nome_fantasia || '');
                setValue('uf', data.uf);
                // Do not overwrite if they already typed something, or simply overwrite
                if (data.email) setValue('email', data.email);
                if (data.telefone) setValue('phone', data.telefone);
            } else {
                toast.error('CNPJ não encontrado ou serviço indisponível. Preencha manualmente.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao buscar CNPJ. Preencha manualmente.');
        } finally {
            setLoadingCnpj(false);
        }
    };

    const handleSaveNewItem = async () => {
        if (!modalInputValue.trim()) return;

        const fieldName = `${modalConfig.type}s`;

        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            const data = (snap.exists()
                ? snap.data()
                : { priceTables: [], paymentMethods: [], carriers: [] }) as Record<string, unknown>;

            if (!snap.exists()) {
                await setDoc(docRef, { priceTables: [], paymentMethods: [], carriers: [] });
            }

            const currentItems = Array.isArray(data[fieldName])
                ? (data[fieldName] as Array<{ id: string; label: string; active?: boolean }>)
                : [];
            const updatedItems =
                modalConfig.mode === 'edit' && modalConfig.currentOptionId
                    ? currentItems.map((item) =>
                        item.id === modalConfig.currentOptionId
                            ? { ...item, label: modalInputValue.trim() }
                            : item
                    )
                    : [...currentItems, { id: Date.now().toString(), label: modalInputValue.trim(), active: true }];

            await setDoc(docRef, {
                [fieldName]: updatedItems,
            }, { merge: true });

            toast.success('Configuração salva! Recarregue a página para refletir a lista atualizada.');
            setModalConfig({ isOpen: false, type: '', title: '', mode: 'create' });
            setModalInputValue('');

        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar a configuração no banco de dados.");
        }
    };

    const handleFormSubmit = async (data: ClientFormValues) => {
        if (requireAccessFields && (!data.password || !data.confirmPassword)) {
            toast.error('Defina e confirme a senha de acesso do cliente.');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar cliente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-border">

            {/* SEÇÃO 1: DADOS PRINCIPAIS & CNPJ */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Dados da Empresa</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <div className="flex gap-2">
                            <MaskedInput mask="__.___.___/____-__" {...register('cnpj')} placeholder="00.000.000/0000-00" />
                            <Button type="button" variant="outline" onClick={handleCnpjSearch} disabled={loadingCnpj}>
                                {loadingCnpj ? 'Buscando...' : <Search className="w-4 h-4" />}
                            </Button>
                        </div>
                        {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Inscrição Estadual</Label>
                        <Input {...register('inscricaoEstadual')} placeholder="Opcional" />
                    </div>

                    <div className="space-y-2">
                        <Label>CEP</Label>
                        <MaskedInput mask="_____-___" {...register('cep')} placeholder="00000-000" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>Razão Social</Label>
                        <Input {...register('razaoSocial')} />
                        {errors.razaoSocial && <p className="text-xs text-destructive">{errors.razaoSocial.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input {...register('nomeFantasia')} />
                    </div>

                    <div className="space-y-2">
                        <Label>UF</Label>
                        <Select {...register('uf')}>
                            <option value="">Selecione</option>
                            <option value="SP">SP</option>
                            <option value="RJ">RJ</option>
                            <option value="MG">MG</option>
                            <option value="PR">PR</option>
                            <option value="RS">RS</option>
                            <option value="SC">SC</option>
                            {/* Adicionar outros estados */}
                        </Select>
                        {errors.uf && <p className="text-xs text-destructive">{errors.uf.message}</p>}
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: CONTATO */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Contato</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nome do Responsável</Label>
                        <Input {...register('contactName')} />
                        {errors.contactName && <p className="text-xs text-destructive">{errors.contactName.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input {...register('email')} type="email" />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Celular (WhatsApp)</Label>
                        <div className="flex gap-2">
                            <MaskedInput mask="(__) _____-____" {...register('phone')} />
                            {phoneValue && (
                                <Button type="button" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => window.open(`https://wa.me/55${phoneValue.replace(/\D/g, '')}`, '_blank')}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Chamar
                                </Button>
                            )}
                        </div>
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                    </div>
                </div>
            </div>

            {showAccessFields && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Acesso do Cliente</h3>
                    {!requireAccessFields && (
                        <p className="text-sm text-muted-foreground">
                            Preencha para definir uma nova senha. Deixe em branco para manter a atual.
                        </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Senha de Acesso {requireAccessFields ? '*' : ''}</Label>
                            <Input
                                type="password"
                                {...register('password')}
                                placeholder="Mínimo de 6 caracteres"
                            />
                            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Confirmar Senha {requireAccessFields ? '*' : ''}</Label>
                            <Input
                                type="password"
                                {...register('confirmPassword')}
                                placeholder="Repita a senha"
                            />
                            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                            {passwordValue && !errors.confirmPassword && (
                                <p className="text-xs text-muted-foreground">
                                    {requireAccessFields
                                        ? 'Essa senha será usada pelo cliente para entrar na área dele.'
                                        : 'Deixe em branco para manter a senha atual.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO 3: COMERCIAL & CONFIGURAÇÕES */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Configurações Comerciais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Status do Cliente</Label>
                        <Select {...register('status')}>
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                            <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tabela de Preços</Label>
                        <EditableSelect
                            {...register('priceTableId')}
                            options={settingsData.priceTables}
                            onAddNew={() => setModalConfig({ isOpen: true, type: 'priceTable', title: 'Nova Tabela de Preços', mode: 'create' })}
                            onEditSelected={(id, title) => {
                                setModalConfig({ isOpen: true, type: 'priceTable', title: 'Editar Tabela de Preços', mode: 'edit', currentOptionId: id });
                                setModalInputValue(title);
                            }}
                        />
                        {errors.priceTableId && <p className="text-xs text-destructive">{errors.priceTableId.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Forma de Pagamento Padrão</Label>
                        <EditableSelect
                            {...register('paymentMethod')}
                            options={settingsData.paymentMethods}
                            onAddNew={() => setModalConfig({ isOpen: true, type: 'paymentMethod', title: 'Nova Forma de Pagamento', mode: 'create' })}
                            onEditSelected={(id, title) => {
                                setModalConfig({ isOpen: true, type: 'paymentMethod', title: 'Editar Forma de Pagamento', mode: 'edit', currentOptionId: id });
                                setModalInputValue(title);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Transportadora Padrão</Label>
                        <EditableSelect
                            {...register('carrier')}
                            options={settingsData.carriers}
                            onAddNew={() => setModalConfig({ isOpen: true, type: 'carrier', title: 'Nova Transportadora', mode: 'create' })}
                            onEditSelected={(id, title) => {
                                setModalConfig({ isOpen: true, type: 'carrier', title: 'Editar Transportadora', mode: 'edit', currentOptionId: id });
                                setModalInputValue(title);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Limite de Crédito (R$)</Label>
                        <Input type="number" step="0.01" {...register('creditLimit', { valueAsNumber: true })} />
                    </div>

                    <div className="space-y-2">
                        <Label>Pedido Mínimo do Cliente (R$)</Label>
                        <Input type="number" step="0.01" min="0" {...register('minimumOrderValue', { valueAsNumber: true })} />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 4: ENDEREÇO DE ENTREGA */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Endereço de Entrega</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>CEP de Entrega</Label>
                        <MaskedInput mask="_____-___" {...register('deliveryAddress.cep')} placeholder="00000-000" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>Logradouro</Label>
                        <Input {...register('deliveryAddress.street')} placeholder="Rua, avenida, rodovia..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Número</Label>
                        <Input {...register('deliveryAddress.number')} placeholder="Número" />
                    </div>

                    <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input {...register('deliveryAddress.district')} placeholder="Bairro" />
                    </div>

                    <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input {...register('deliveryAddress.city')} placeholder="Cidade" />
                    </div>

                    <div className="space-y-2">
                        <Label>UF</Label>
                        <Input {...register('deliveryAddress.uf')} placeholder="UF" maxLength={2} />
                    </div>

                    <div className="space-y-2">
                        <Label>Complemento</Label>
                        <Input {...register('deliveryAddress.complement')} placeholder="Opcional" />
                    </div>

                    <div className="space-y-2">
                        <Label>Referência</Label>
                        <Input {...register('deliveryAddress.reference')} placeholder="Ponto de referência" />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 5: OBSERVAÇÕES */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Observações Internas (Admin)</Label>
                    <Textarea {...register('notes')} placeholder="Anotações sobre negociação, restrições..." />
                </div>
            </div>

            <div className="flex justify-end pt-4 space-x-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salvar Cliente'}
                </Button>
            </div>

            {/* Custom Modal Setup for Settings */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg border border-border">
                        <h3 className="text-lg font-bold mb-4">{modalConfig.title}</h3>
                        <div className="space-y-4">
                            <div>
                                <Label>Nome</Label>
                                <Input
                                    value={modalInputValue}
                                    onChange={e => setModalInputValue(e.target.value)}
                                    placeholder="Ex: Novo item..."
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => {
                                    setModalConfig({ isOpen: false, type: '', title: '', mode: 'create' });
                                    setModalInputValue('');
                                }}>Cancelar</Button>
                                <Button type="button" onClick={handleSaveNewItem}>
                                    {modalConfig.mode === 'edit' ? 'Salvar Edição' : 'Salvar Opção'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
