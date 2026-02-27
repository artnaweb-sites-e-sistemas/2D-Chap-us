export type UserRole = 'admin' | 'equipe' | 'cliente';
export type UserStatus = 'ativo' | 'inativo' | 'aguardando_aprovacao';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    name: string;
    // If role is cliente, they might have a linked client document ID
    clientId?: string;
    // If role is equipe, they might be restricted to an area
    area?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    user: UserProfile | null;
    loading: boolean;
    error: Error | null;
}
