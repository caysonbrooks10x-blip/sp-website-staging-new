"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { createUserDoc } from "@/lib/db";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    credits: number | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<any>;
    signUpWithEmail: (email: string, pass: string, name: string) => Promise<any>;
    setUpRecaptcha: (containerId: string) => void;
    signInWithPhone: (phone: string, appVerifier: RecaptchaVerifier) => Promise<any>;
    verifyOtp: (token: string) => Promise<any>;
    logout: () => Promise<void>;
    updateCredits: (newCredits: number) => void;
    refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    credits: null,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { throw new Error("Not implemented") },
    signUpWithEmail: async () => { throw new Error("Not implemented") },
    setUpRecaptcha: () => { },
    signInWithPhone: async () => { throw new Error("Not implemented") },
    verifyOtp: async () => { throw new Error("Not implemented") },
    logout: async () => { },
    updateCredits: () => { },
    refreshCredits: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState<number | null>(null);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const router = useRouter();

    
    const fetchCredits = async (userId: string) => {
        setCredits(100); 
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await createUserDoc(currentUser);
                fetchCredits(currentUser.uid);
            } else {
                setCredits(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, pass: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;
            await updateProfile(user, { displayName: name });
            return user;
        } catch (error) {
            console.error("Error signing up:", error);
            throw error;
        }
    };

    const setUpRecaptcha = (containerId: string) => {
        if (!(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                size: 'invisible',
            });
        }
    };

    const signInWithPhone = async (phone: string, appVerifier: RecaptchaVerifier) => {
        try {
            const result = await signInWithPhoneNumber(auth, phone, appVerifier);
            setConfirmationResult(result);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const verifyOtp = async (token: string) => {
        if (!confirmationResult) throw new Error("No phone authentication pending.");
        try {
            const result = await confirmationResult.confirm(token);
            return result.user;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setCredits(0);
            setUser(null);
            router.push("/");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const updateCredits = (newCredits: number) => {
        setCredits(newCredits);
    };

    const refreshCredits = async () => {
        if (user) {
            await fetchCredits(user.uid);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            credits,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            setUpRecaptcha,
            signInWithPhone,
            verifyOtp,
            logout,
            updateCredits,
            refreshCredits
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
