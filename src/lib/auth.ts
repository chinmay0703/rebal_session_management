import { SignJWT, jwtVerify } from 'jose';

const ADMIN_USERNAME = 'vish';
const ADMIN_PASSWORD = 'anvi1712';
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rebalance-admin-secret-key-2024'
);
const TOKEN_EXPIRY = '10d';

export async function createToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function validateCredentials(username: string, password: string) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
