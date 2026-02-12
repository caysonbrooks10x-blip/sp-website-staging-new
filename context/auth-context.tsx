"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    credits: number | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<any>;
    signUpWithEmail: (email: string, pass: string, name: string) => Promise<any>;
    signInWithPhone: (phone: string) => Promise<any>;
    verifyOtp: (phone: string, token: string) => Promise<any>;
    logout: () => Promise<void>;
    updateCredits: (newCredits: number) => void;
    refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    credits: null,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { throw new Error("Not implemented") },
    signUpWithEmail: async () => { throw new Error("Not implemented") },
    signInWithPhone: async () => { throw new Error("Not implemented") },
    verifyOtp: async () => { throw new Error("Not implemented") },
    logout: async () => { },
    updateCredits: () => { },
    refreshCredits: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState<number | null>(null);
    const router = useRouter();

    // Mock credits for now since backend integration is removed
    const fetchCredits = async (userId: string) => {
        setCredits(100); // Default mock credits
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchCredits(session.user.id);
            }
            setLoading(false);
        }).catch((err) => {
            console.error("Supabase Session Error:", err);
            setLoading(false); // Ensure loading stops even on error
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchCredits(session.user.id);
            } else {
                setCredits(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const redirectUrl = window.location.origin;
            console.log("Initiating Google Sign-In with redirect:", redirectUrl);
            console.log("Supabase URL Check:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Defined" : "Missing");

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                }
            });

            if (error) {
                console.error("Supabase Auth Error:", error);
                if (error.status === 500) {
                    console.error("CRITICAL CONFIG ERROR: A 500 error usually means your Google Client ID/Secret in Supabase is incorrect, OR the Authorized Redirect URI in Google Cloud Console is missing the Supabase callback URL.");
                }
                throw error;
            }
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        if (error) throw error;
        return data;
    };

    const signUpWithEmail = async (email: string, pass: string, name: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: {
                        name: name,
                    }
                }
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error signing up", error);
            throw error;
        }
    };

    const signInWithPhone = async (phone: string) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone,
        });
        if (error) throw error;
        return data;
    };

    const verifyOtp = async (phone: string, token: string) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
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
            await fetchCredits(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            credits,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
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
