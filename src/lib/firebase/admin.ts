import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0] as ReturnType<typeof initializeApp>;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin: configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local. ' +
            'Obtenha as credenciais em Firebase Console > Configurações do projeto > Contas de serviço.'
        );
    }

    const credential = cert({
        projectId,
        clientEmail,
        privateKey,
    } as ServiceAccount);

    return initializeApp({ credential });
}

export function getAdminAuth() {
    return getAuth(getAdminApp());
}
