'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { signOut, user } = useAuth();
    return (
        <AuthGuard allowedRoles={['admin', 'equipe']}>
            <div className="min-h-screen bg-muted flex flex-col md:flex-row w-full overflow-hidden">
                {/* Sidebar */}
                <aside className="w-full md:w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col flex-shrink-0 z-20">
                    <div className="mb-8 px-2 pt-2">
                        <h1 className="text-2xl font-bold tracking-tight text-white">2D Chapéus</h1>
                        <p className="text-sm text-slate-400 capitalize mt-1.5 border-t border-slate-700/80 pt-1.5">
                            {user?.role === 'admin' ? 'Administrador' : user?.role === 'equipe' ? 'Equipe' : user?.role || 'Acessando...'}
                        </p>
                    </div>
                    <nav className="flex-1 space-y-2">
                        <Link href="/admin" className="block py-2 px-3 rounded hover:bg-slate-800 transition-colors">Dashboard</Link>
                        <Link href="/admin/orders" className="block py-2 px-3 rounded hover:bg-slate-800 transition-colors">Pedidos</Link>
                        <Link href="/admin/clients" className="block py-2 px-3 rounded hover:bg-slate-800 transition-colors">Clientes</Link>
                        <Link href="/admin/products" className="block py-2 px-3 rounded hover:bg-slate-800 transition-colors">Produtos</Link>
                        <Link href="/admin/settings" className="block py-2 px-3 rounded hover:bg-slate-800 transition-colors">Configurações</Link>
                    </nav>
                    <div className="mt-auto pt-4 border-t border-slate-800">
                        <button onClick={signOut} className="w-full flex items-center gap-2 py-2 px-3 rounded hover:bg-red-900/50 text-red-200 transition-colors text-left">
                            <LogOut className="w-4 h-4" />
                            Sair da conta
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 min-w-0 h-screen overflow-y-auto">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
