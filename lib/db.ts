import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseClient";
import type { User } from "firebase/auth";

export const INITIAL_TOKEN_BALANCE = 200;
export const ONBOARDING_FLOW_VERSION = 1;

export interface UserProfileState {
    created: boolean;
    tokenBalance: number;
    onboardingCompleted: boolean;
}

function deriveOnboardingStatus(data: Record<string, any>) {
    const tokenBalance = data.tokenBalance ?? INITIAL_TOKEN_BALANCE;
    const onboardingFlowVersion = data.onboardingFlowVersion ?? 0;
    let onboardingCompleted = data.onboardingCompleted;

    // Older accounts predate the new onboarding flow and should never be sent
    // through onboarding again just because the field was missing or stale.
    if (onboardingFlowVersion < ONBOARDING_FLOW_VERSION) {
        onboardingCompleted = true;
    }

    // Defensive migration for accounts that somehow kept the old false flag
    // after already becoming active.
    if (onboardingCompleted === false && tokenBalance !== INITIAL_TOKEN_BALANCE) {
        onboardingCompleted = true;
    }

    return {
        tokenBalance,
        onboardingCompleted: onboardingCompleted ?? true,
        onboardingFlowVersion,
    };
}

export async function createUserDoc(user: User): Promise<UserProfileState> {
    if (!user || !user.uid) {
        return {
            created: false,
            tokenBalance: INITIAL_TOKEN_BALANCE,
            onboardingCompleted: true,
        };
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || user.email?.split('@')[0] || "User",
                email: user.email || "",
                avatar: user.photoURL || "",
                tokenBalance: INITIAL_TOKEN_BALANCE,
                onboardingCompleted: false,
                onboardingFlowVersion: ONBOARDING_FLOW_VERSION,
                createdAt: Date.now()
            });
            return {
                created: true,
                tokenBalance: INITIAL_TOKEN_BALANCE,
                onboardingCompleted: false,
            };
        }

        const data = userSnap.data() || {};
        const derived = deriveOnboardingStatus(data);

        if (
            data.onboardingCompleted !== derived.onboardingCompleted ||
            (data.onboardingFlowVersion ?? 0) !== Math.max(data.onboardingFlowVersion ?? 0, ONBOARDING_FLOW_VERSION)
        ) {
            await updateDoc(userRef, {
                onboardingCompleted: derived.onboardingCompleted,
                onboardingFlowVersion: Math.max(data.onboardingFlowVersion ?? 0, ONBOARDING_FLOW_VERSION),
                onboardingMigratedAt: Date.now(),
            });
        }

        return {
            created: false,
            tokenBalance: derived.tokenBalance,
            onboardingCompleted: derived.onboardingCompleted,
        };
    } catch (error) {
        console.warn("Firebase warning: Failed to get or set user document. Client may be offline or blocked.", error);
        return {
            created: false,
            tokenBalance: INITIAL_TOKEN_BALANCE,
            onboardingCompleted: true,
        };
    }
}

export async function completeUserOnboarding(userId: string, answers?: Record<string, string | string[]>) {
    if (!userId) return;

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        onboardingCompleted: true,
        onboardingFlowVersion: ONBOARDING_FLOW_VERSION,
        onboardingCompletedAt: Date.now(),
        onboardingAnswers: answers ?? {},
    });
}
