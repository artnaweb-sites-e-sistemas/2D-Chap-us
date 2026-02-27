'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { ShoppingCart, User, LogOut, Package } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { signOut, user } = useAuth();
    return (
        <AuthGuard allowedRoles={['cliente', 'admin']}>
            <div className="min-h-screen bg-muted/50 flex flex-col">
                {/* Topbar */}
                <header className="bg-white border-b border-border h-16 flex items-center px-4 md:px-8 shrink-0">
                    <Link href="/app" className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">2D Chapéus</h1>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                            {user?.role === 'cliente' ? 'Cliente' : user?.role || ''}
                        </span>
                    </Link>
                    <div className="ml-[auto] flex items-center gap-4 text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar">
                        <Link href="/app/orders" className="flex items-center gap-1.5 hover:text-primary transition-colors shrink-0">
                            <Package className="w-4 h-4" />
                            <span className="hidden sm:inline">Meus Pedidos</span>
                        </Link>
                        <Link href="/app/cart" className="flex items-center gap-1.5 hover:text-primary transition-colors shrink-0">
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline">Meu Carrinho</span>
                        </Link>
                        <Link href="/app/profile" className="flex items-center gap-1.5 hover:text-primary transition-colors shrink-0">
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">Minha Conta</span>
                        </Link>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={signOut} className="flex items-center gap-1.5 hover:text-red-600 transition-colors">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 container mx-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
