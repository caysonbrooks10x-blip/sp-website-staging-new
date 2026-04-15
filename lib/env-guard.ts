/**
 * Server-side production env guard.
 *
 * Imported by server-only modules that absolutely need a real Firebase
 * admin + provider config. Importing this at the top of a route handler
 * module ensures the deploy fails loudly at first request rather than
 * silently 500-ing later with cryptic provider errors.
 */

import { assertRequiredEnv } from "./env"

export const REQUIRED_SERVER_ENV = [
  // Firebase admin — identity + server-side Firestore/auth
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  // Provider keys — required to execute any generation
  "APIMART_API_KEY",
] as const

export const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const

export function assertProdServerEnv(): void {
  assertRequiredEnv(REQUIRED_SERVER_ENV)
}

export function assertProdPublicEnv(): void {
  assertRequiredEnv(REQUIRED_PUBLIC_ENV)
}
