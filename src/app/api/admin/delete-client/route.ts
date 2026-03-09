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

        const db = getFirestore(getAdminApp());
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const role = userDoc.data()?.role;

        if (role !== 'admin' && role !== 'equipe') {
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem excluir clientes.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { clientId } = body;

        if (!clientId || typeof clientId !== 'string') {
            return NextResponse.json(
                { error: 'ID do cliente é obrigatório.' },
                { status: 400 }
            );
        }

        // Usuários vinculados a este cliente (documento users com clientId igual)
        const usersSnap = await db.collection('users').where('clientId', '==', clientId).get();

        for (const userDocSnap of usersSnap.docs) {
            const uid = userDocSnap.id;
            try {
                await adminAuth.deleteUser(uid);
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'auth/user-not-found') {
                    // Usuário já não existe no Auth, segue
                } else {
                    console.error('Erro ao excluir usuário do Auth:', uid, err);
                }
            }
            await userDocSnap.ref.delete();
        }

        await db.collection('clients').doc(clientId).delete();

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Erro ao excluir cliente:', error);
        return NextResponse.json(
            { error: 'Erro ao excluir o cliente. Tente novamente.' },
            { status: 500 }
        );
    }
}
