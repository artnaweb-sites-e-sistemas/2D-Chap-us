'use client';

import React, { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    active?: boolean;
}

interface EditableSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: Option[];
    onAddNew: () => void;
    onEditSelected?: (id: string, currentLabel: string) => void;
}

export const EditableSelect = React.forwardRef<HTMLSelectElement, EditableSelectProps>(
    ({ options, onAddNew, onEditSelected, ...props }, ref) => {
        return (
            <div className="flex items-center space-x-2">
                <Select ref={ref} {...props} className="flex-1">
                    <option value="">Selecione...</option>
                    {options.filter(opt => opt.active !== false || opt.id === props.value).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </Select>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onAddNew}
                    title="Adicionar nova opção"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                {props.value && onEditSelected && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            const selected = options.find(o => o.id === props.value);
                            if (selected) onEditSelected(selected.id, selected.label);
                        }}
                        title="Editar opção selecionada"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    }
);
EditableSelect.displayName = 'EditableSelect';
