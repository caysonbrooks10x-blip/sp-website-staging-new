import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseClient";
import type { User } from "firebase/auth";

export const INITIAL_TOKEN_BALANCE = 200;

export async function createUserDoc(user: User) {
    if (!user || !user.uid) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || user.email?.split('@')[0] || "User",
                email: user.email || "",
                avatar: user.photoURL || "",
                tokenBalance: INITIAL_TOKEN_BALANCE,
                createdAt: Date.now()
            });
        }
    } catch (error) {
        console.warn("Firebase warning: Failed to get or set user document. Client may be offline or blocked.", error);
    }
}
