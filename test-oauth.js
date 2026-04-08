const FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@studiox-b8f20.iam.gserviceaccount.com";
const FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCyCftvzMGkeMER\n2hxjlj29tAVac9CBNq8P5zWZW79STuQoa24euZIiiR9nPC5dvCOq0HBNwgS/kHso\nocWU3mL5FjtnZ77EEPBviU+JDPBpN1ckrIrcGutTj32Ng3k+9J1J1lYz/VMqizjs\nWrb7Vlb0exg+2s4NQ9P6BIVSsbw+tJ+tbntrfEh+0YA9ZnzCzUIODevuhYX8tLh/\nXMDpuQ6tCuQjUPyKgI0xckkfwkhv9IaTebdyMNbWoDNxVBOqCiNdtTQU4glBJ8rH\nLW8QtDdw2OPM2AgBxtCoG6w72oCIVEHyVdizvgMezWOKhnD8FmNhyvlt6Ou9Z1mh\ntuDuAC3JAgMBAAECggEAAtXXF44+6a5lFfdjQUZyBAmLH/lVuy83cx0UH+bzruW6\nHuqqwpdtCx/Bc/ce7UuH42uVwLrzzo9XF//KTR54nGs0X5iWImHT6JBa7vsyFAS5\n6GV0lZadFRoMg1vPueIrZAGjXc4hInie+UwCYuqan0obezOKsg3YoSKsX1X/H54I\nuE9qYZZfOjqCgdPEnKwXGHgnmBO50/jVGkYW/gbImuRiC0g9NoulxHzkQ4LTgBSH\nlJ0eQX6M5U9DG/WrxPBEMWjp3DsHh/MHJNWwb15b627pRYw0VOutU7o1jxhIyy1U\noR4URE0ZeGxgB3r9qcb2pdCyxABRvaiUAjh0xmikAQKBgQDnBMWoKytNRs7OJ2RA\nAgfhcTDM4qZ/TQJvVz4ztTnfqk4pTvKE3K6uOjP7PC5Tg9ytVK1x2s9aaY7VD2f+\n1ZJCDaSrddO83VlxA1finyHZLgYqh2xvgUvDasK51F4uqCXgjA9p+RtGD01vsZ0U\nirTTzTBtb7Z0icdaRHe3nkLy4wKBgQDFSpan1d4QgWVOwg3w3xbeSWzNyDBewqqg\nPm49tHBGJZbW/LbzJZvU+GcGi3/SZeWq7VfyAdMWpilEFTPYkTbZDXQb40pbW3rz\nTuAHlJWjGruILW+DGAaTbGeTJBcQbEOPXXW3M6i4FU+wydTHWU2IODxd2+5XGAmN\nBHQWRObAYwKBgEWdjYaYw6q8zLMY8b/MHN3VwzPqlOvFpBczPh5M3UzGQFl4XeKl\nscn05hcuUnN+R/C/lKi7nEKNjqorw1Xqu/FFtTqp/g1q0noY3NIAzC1rDhagyo9r\ncg5ITLe9BEihCRD6g+aWV56sG9StvD0lc0pkCdTgliXWIwnTmhPuEBSrAoGACFIZ\nAIMYloGekC/G/r2p7T4ThKpIv/Zd09xOMfQGOC8lqXOHE8ImTFkdnz0K6wi5IvhX\nmTFSgcYIP4LVaPDW61iR6Qsw+6FkEhblg+xUU0ixWBDyfwjoXhdYVvBSuLKYNteu\nO0fGed0MO1yHyNCPYIteoGbCKpIs9PGXI8lMIhkCgYASDHC+nVM/0Cm3N3XQSvUC\nn3TwELcFnF3lbIyF4s21KWs0coaErriQujnqP9+jZBcDediI2P0vDuoFNpPvxtms\n4s71PvMMUT5aVk1h4srAbwUnAlsiOxnLyqjypGt8nndRW0Aucjpqh0EMQSZlsxeM\n9u1xCxlSGBqHRqZOmKbIdw==\n-----END PRIVATE KEY-----\n";

async function main() {
  const jwt = require('jsonwebtoken'); // Assuming user has this or we mock it
  // I will just use node crypto
  const crypto = require('crypto');
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
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(FIREBASE_PRIVATE_KEY, 'base64url');
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
  
  console.log(res.status, await res.text());
}
main();
