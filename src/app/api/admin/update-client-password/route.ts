import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminApp } from '@/lib/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!idToken) {
            return NextResponse.json(
                { error: 'Token de autenticação ausente.' },
                { status: 401 }
            );
        }

        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(idToken);

        // Verificar se o usuário é admin ou equipe
        const db = getFirestore(getAdminApp());
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const userData = userDoc.data();
        const role = userData?.role;

        if (role !== 'admin' && role !== 'equipe') {
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem redefinir senhas.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, newPassword } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'E-mail do cliente é obrigatório.' },
                { status: 400 }
            );
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
                { status: 400 }
            );
        }

        const userRecord = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(userRecord.uid, { password: newPassword });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Erro ao atualizar senha:', error);

        if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as { code: string }).code;
            if (code === 'auth/user-not-found') {
                return NextResponse.json(
                    { error: 'Nenhum usuário encontrado com este e-mail no Firebase Auth.' },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Erro ao atualizar a senha. Tente novamente.' },
            { status: 500 }
        );
    }
}
