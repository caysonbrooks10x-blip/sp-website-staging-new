import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  return NextResponse.json({
    pk_start: pk.substring(0, 40),
    pk_length: pk.length,
    has_real_newlines: pk.includes('\n'),
    has_escaped_newlines: pk.includes('\\n'),
    is_wrapped_in_quotes: pk.startsWith('"') && pk.endsWith('"')
  });
}
