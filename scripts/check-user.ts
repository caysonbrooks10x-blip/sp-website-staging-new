import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main(): Promise<void> {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }
  const auth = getAuth();
  try {
    const u = await auth.getUserByEmail(process.env.EMAIL!);
    console.log("EXISTS uid=" + u.uid);
    console.log("  created=" + u.metadata.creationTime);
    console.log("  lastSignIn=" + u.metadata.lastSignInTime);
    console.log("  displayName=" + u.displayName);
    const db = getFirestore();
    const snap = await db.collection("users").doc(u.uid).get();
    console.log("  firestore doc exists:", snap.exists);
    if (snap.exists) {
      const d = snap.data() || {};
      console.log("  tokenBalance:", d.tokenBalance);
      console.log("  subscription:", d.subscription ? `${d.subscription.plan_id} ${d.subscription.status}` : "none");
    }
  } catch (e) {
    console.log("NOT EXISTS:", e instanceof Error ? e.message : String(e));
  }
}
main().catch(console.error);
