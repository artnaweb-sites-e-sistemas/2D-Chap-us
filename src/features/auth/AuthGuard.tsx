'use client';

import { useAuth } from './AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        if (user.status === 'aguardando_aprovacao' && !pathname.startsWith('/pending')) {
            router.replace('/pending');
            return;
        }

        if (user.status === 'inativo') {
            // For simplicity, redirecting inactive to login or a blocked page
            router.replace('/login?error=account_disabled');
            return;
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            // Redirect to appropriate dashboard if role is incorrect
            if (user.role === 'cliente') router.replace('/app');
            else router.replace('/admin');
        }
    }, [user, loading, router, pathname, allowedRoles]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    // Prevent flash of content if useEffect is going to redirect
    if (!user || user.status === 'aguardando_aprovacao' || (allowedRoles && !allowedRoles.includes(user.role))) {
        return null;
    }

    return <>{children}</>;
}
