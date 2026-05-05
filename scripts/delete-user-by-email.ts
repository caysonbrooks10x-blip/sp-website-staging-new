/**
 * Delete a Firebase Auth user by email + their users/{uid} Firestore doc
 * (and the topUpHistory subcollection, if any) so they can sign up cleanly.
 *
 * Usage:
 *   EMAIL=prakash@example.com npx tsx --env-file=.env.local scripts/delete-user-by-email.ts
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main(): Promise<void> {
  const email = process.env.EMAIL;
  if (!email) throw new Error("Set EMAIL env var");

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
  const db = getFirestore();

  let uid: string;
  try {
    const u = await auth.getUserByEmail(email);
    uid = u.uid;
    console.log("found auth user:", { uid: u.uid, email: u.email, displayName: u.displayName, providers: u.providerData.map((p) => p.providerId) });
  } catch {
    console.log("no auth user with that email — nothing to delete.");
    return;
  }

  // Delete Firestore subcollection: topUpHistory
  const topUps = await db.collection("users").doc(uid).collection("topUpHistory").listDocuments();
  for (const d of topUps) await d.delete();
  if (topUps.length > 0) console.log("deleted topUpHistory entries:", topUps.length);

  // Delete the user doc
  const userRef = db.collection("users").doc(uid);
  if ((await userRef.get()).exists) {
    await userRef.delete();
    console.log("deleted users/" + uid);
  } else {
    console.log("no users/" + uid + " doc to delete");
  }

  // Delete the Firebase Auth account
  await auth.deleteUser(uid);
  console.log("deleted Firebase Auth user:", uid);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
