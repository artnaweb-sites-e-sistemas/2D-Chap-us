'use client';

import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (user.status === 'aguardando_aprovacao') {
      router.replace('/pending');
    } else if (user.status === 'inativo') {
      router.replace('/login?error=account_disabled');
    } else if (user.role === 'cliente') {
      router.replace('/app');
    } else {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
    </div>
  );
}
