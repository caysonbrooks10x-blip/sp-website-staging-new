"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    getAdditionalUserInfo,
    deleteUser,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    sendEmailVerification,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { createUserDoc, INITIAL_TOKEN_BALANCE, completeUserOnboarding, ONBOARDING_FLOW_VERSION } from "@/lib/db";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    credits: number | null;
    onboardingCompleted: boolean | null;
    signInWithGoogle: (intent?: "signin" | "signup") => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<any>;
    signUpWithEmail: (email: string, pass: string, name: string) => Promise<any>;
    setUpRecaptcha: (containerId: string) => void;
    signInWithPhone: (phone: string, appVerifier: RecaptchaVerifier, intent?: "signin" | "signup") => Promise<any>;
    verifyOtp: (token: string) => Promise<any>;
    logout: () => Promise<void>;
    updateCredits: (newCredits: number) => void;
    refreshCredits: () => Promise<void>;
    markOnboardingComplete: (answers?: Record<string, string | string[]>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    credits: null,
    onboardingCompleted: null,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { throw new Error("Not implemented") },
    signUpWithEmail: async () => { throw new Error("Not implemented") },
    setUpRecaptcha: () => { },
    signInWithPhone: async () => { throw new Error("Not implemented") },
    verifyOtp: async () => { throw new Error("Not implemented") },
    logout: async () => { },
    updateCredits: () => { },
    refreshCredits: async () => { },
    markOnboardingComplete: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState<number | null>(null);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const router = useRouter();

    
    const fetchCredits = async (userId: string) => {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                setCredits(INITIAL_TOKEN_BALANCE);
                setOnboardingCompleted(false);
                return;
            }
            const data = userSnap.data() || {};
            const tokenBalance = data.tokenBalance ?? INITIAL_TOKEN_BALANCE;
            const onboardingFlowVersion = data.onboardingFlowVersion ?? 0;
            const migratedOnboardingCompleted =
                onboardingFlowVersion < ONBOARDING_FLOW_VERSION
                    ? true
                    : data.onboardingCompleted === false && tokenBalance !== INITIAL_TOKEN_BALANCE
                        ? true
                        : (data.onboardingCompleted ?? true);

            setCredits(tokenBalance);
            setOnboardingCompleted(migratedOnboardingCompleted);
        } catch (error) {
            console.warn("Failed to fetch credits from Firestore, using fallback balance.", error);
            setCredits(INITIAL_TOKEN_BALANCE);
            setOnboardingCompleted(true);
        }
    };

    useEffect(() => {
        // Track the per-user Firestore listener so we can dispose it on
        // sign-out / user switch and avoid a stale subscription leaking
        // another user's balance into UI state.
        let unsubUserDoc: (() => void) | null = null;

        // Register onAuthStateChanged FIRST so we never miss a state change.
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (unsubUserDoc) {
                unsubUserDoc();
                unsubUserDoc = null;
            }
            if (currentUser) {
                const profile = await createUserDoc(currentUser);
                setCredits(profile?.tokenBalance ?? INITIAL_TOKEN_BALANCE);
                setOnboardingCompleted(profile?.onboardingCompleted ?? true);
                fetchCredits(currentUser.uid);
                // Live-subscribe so every consumer of useAuth().credits stays
                // in sync with token deductions/refunds (matches navbar's
                // direct onSnapshot at components/navbar.tsx:40).
                unsubUserDoc = onSnapshot(
                    doc(db, "users", currentUser.uid),
                    (snap) => {
                        const data = snap.data();
                        if (data && typeof data.tokenBalance === "number") {
                            setCredits(data.tokenBalance);
                        }
                    },
                    (err) => console.warn("credits onSnapshot error:", err),
                );
            } else {
                setCredits(null);
                setOnboardingCompleted(null);
            }
            setLoading(false);
        });

        // Handle any pending redirect result (e.g., from a previous signInWithRedirect call).
        // Errors are intentionally ignored here — onAuthStateChanged is already the source of truth.
        getRedirectResult(auth).catch((error) => {
            console.error("Pending redirect sign-in error:", error?.code, error?.message);
        });

        return () => {
            if (unsubUserDoc) unsubUserDoc();
            unsubscribe();
        };
    }, []);

    const signInWithGoogle = async (intent: "signin" | "signup" = "signup") => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        let result;
        try {
            // Popup is preferred — works synchronously, no cross-page storage issues.
            // COOP header (same-origin-allow-popups) is set in next.config.ts to allow this.
            result = await signInWithPopup(auth, provider);
        } catch (popupError: any) {
            const code = popupError?.code;
            // If popup was blocked or closed, fall back to redirect flow.
            if (
                code === "auth/popup-blocked" ||
                code === "auth/popup-closed-by-user" ||
                code === "auth/cancelled-popup-request"
            ) {
                await signInWithRedirect(auth, provider);
                return;
            }
            throw popupError;
        }

        // Intent gate: on the Sign In page, refuse to silently create a new
        // account for an unknown email. Firebase merges sign-in and sign-up
        // for SSO providers — we have to undo the create after the fact.
        if (intent === "signin") {
            const isNewUser = getAdditionalUserInfo(result)?.isNewUser === true;
            if (isNewUser) {
                try {
                    await deleteUser(result.user);
                } catch (delErr) {
                    // Best-effort cleanup — even if delete fails, sign out so
                    // the freshly-created session doesn't persist.
                    console.warn("[auth] failed to delete unintended new user:", delErr);
                }
                try {
                    await signOut(auth);
                } catch {
                    // ignored
                }
                const err: any = new Error(
                    "No account exists for this email. Please use Create Account to sign up.",
                );
                err.code = "auth/no-account-for-email";
                throw err;
            }
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
            await createUserDoc(user);
            await sendEmailVerification(user);
            await signOut(auth);
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

    const markOnboardingComplete = async (answers?: Record<string, string | string[]>) => {
        if (!user) return;
        await completeUserOnboarding(user.uid, answers);
        setOnboardingCompleted(true);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            credits,
            onboardingCompleted,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            setUpRecaptcha,
            signInWithPhone,
            verifyOtp,
            logout,
            updateCredits,
            refreshCredits,
            markOnboardingComplete
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
