'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
    id: string;
    razaoSocial: string;
}

interface ExclusiveClientsSelectorProps {
    clients: Client[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}

export function ExclusiveClientsSelector({
    clients,
    selectedIds,
    onChange,
    disabled = false,
}: ExclusiveClientsSelectorProps) {
    const [search, setSearch] = useState('');

    const filteredClients = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.trim().toLowerCase();
        return clients.filter(
            (c) =>
                c.razaoSocial.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
        );
    }, [clients, search]);

    const selectedClients = useMemo(
        () => clients.filter((c) => selectedIds.includes(c.id)),
        [clients, selectedIds]
    );

    const toggleClient = (clientId: string) => {
        if (selectedIds.includes(clientId)) {
            onChange(selectedIds.filter((id) => id !== clientId));
        } else {
            onChange([...selectedIds, clientId]);
        }
    };

    const removeClient = (clientId: string) => {
        onChange(selectedIds.filter((id) => id !== clientId));
    };

    return (
        <div className="space-y-3">
            <Label>Visibilidade exclusiva</Label>
            <p className="text-sm text-muted-foreground">
                Digite para buscar e selecionar clientes. Apenas os selecionados verão este produto. Deixe vazio para exibir a todos.
            </p>

            {selectedClients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedClients.map((client) => (
                        <span
                            key={client.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                        >
                            {client.razaoSocial}
                            <button
                                type="button"
                                onClick={() => removeClient(client.id)}
                                disabled={disabled}
                                className="rounded-full p-0.5 hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Remover ${client.razaoSocial}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    type="text"
                    placeholder="Buscar cliente por nome ou ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={disabled}
                    className="pl-9"
                />
            </div>

            {search.trim() && (
                <div className="rounded-lg border border-border bg-card overflow-hidden max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            Nenhum cliente encontrado para &quot;{search}&quot;
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {filteredClients.map((client) => {
                                const isSelected = selectedIds.includes(client.id);
                                return (
                                    <li key={client.id}>
                                        <button
                                            type="button"
                                            onClick={() => toggleClient(client.id)}
                                            disabled={disabled}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                                                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                                isSelected && "bg-primary/5"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-input bg-background"
                                                )}
                                            >
                                                {isSelected ? (
                                                    <Check className="h-3 w-3 stroke-[2.5]" />
                                                ) : null}
                                            </span>
                                            <span className="font-medium text-foreground truncate">
                                                {client.razaoSocial}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {selectedIds.length > 0 && !search && (
                <p className="text-xs text-muted-foreground">
                    {selectedIds.length} cliente(s) selecionado(s) — produto visível apenas para eles.
                </p>
            )}
        </div>
    );
}
