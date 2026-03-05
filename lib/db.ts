import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseClient";
import type { User } from "firebase/auth";

export async function createUserDoc(user: User) {
    if (!user || !user.uid) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Only create if the document doesn't already exist to preserve balances and createdAt times
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || user.email?.split('@')[0] || "User",
                email: user.email || "",
                avatar: user.photoURL || "",
                tokenBalance: 0,
                createdAt: Date.now()
            });
        }
    } catch (error) {
        console.warn("Firebase warning: Failed to get or set user document. Client may be offline or blocked.", error);
    }
}
