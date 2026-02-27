'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { AuthState, UserProfile } from '@/types/auth';

interface AuthContextType extends AuthState {
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        let unsubscribeUserDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setState({ user: null, loading: false, error: null });
                if (unsubscribeUserDoc) unsubscribeUserDoc();
                return;
            }

            // Listen to the user's document in Firestore to get their physical role/status
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            unsubscribeUserDoc = onSnapshot(
                userDocRef,
                (docSnap) => {
                    if (docSnap.exists()) {
                        setState({
                            user: { ...docSnap.data(), uid: firebaseUser.uid, email: firebaseUser.email } as UserProfile,
                            loading: false,
                            error: null,
                        });
                    } else {
                        // Document doesn't exist yet (might be in the middle of registration)
                        // It will be created by the registration flow.
                        console.log("Waiting for user document creation...");
                    }
                },
                (error) => {
                    console.error("Error fetching user profile:", error);
                    setState({ user: null, loading: false, error });
                }
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ ...state, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
