import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase/config';

export async function createClientAuthUser(email: string, password: string) {
    const tempApp = initializeApp(firebaseConfig, `client-create-${Date.now()}`);
    const tempAuth = getAuth(tempApp);

    try {
        const credential = await createUserWithEmailAndPassword(tempAuth, email, password);
        return credential.user;
    } finally {
        await signOut(tempAuth);
        await deleteApp(tempApp);
    }
}
