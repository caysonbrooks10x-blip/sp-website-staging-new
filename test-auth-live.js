const fs = require('fs');
const crypto = require('crypto');

const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[k.trim()] = val;
  }
});

const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";

async function main() {
  console.log("Email:", FIREBASE_CLIENT_EMAIL);
  console.log("PK begins with:", FIREBASE_PRIVATE_KEY.substring(0, 30));
  console.log("PK length:", FIREBASE_PRIVATE_KEY.length);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  
  const unsigned = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  let signature;
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsigned);
    signature = sign.sign(FIREBASE_PRIVATE_KEY, 'base64url');
  } catch (err) {
    console.error("Signing failed:", err.message);
    return;
  }

  const signedJwt = `${unsigned}.${signature}`;
  
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: signedJwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  
  const status = res.status;
  const text = await res.text();
  console.log("Response status:", status);
  console.log("Response body:", text);
}

main().catch(console.error);
