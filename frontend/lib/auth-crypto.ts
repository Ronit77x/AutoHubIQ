import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [algorithm, saltText, keyText, extra] = storedHash.split("$");

  if (algorithm !== "scrypt" || !saltText || !keyText || extra !== undefined) {
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expectedKey = Buffer.from(keyText, "base64url");

  if (salt.length !== 16 || expectedKey.length !== PASSWORD_KEY_LENGTH) {
    return false;
  }

  const actualKey = await derivePasswordKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

export interface SessionPayload {
  userId: string;
  expiresAt: number;
}

export function createSessionToken(
  userId: string,
  secret: string,
  now = Date.now()
): string {
  if (!/^\d+$/.test(userId)) {
    throw new Error("Session user ID must be a positive integer");
  }

  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now()
): SessionPayload | null {
  const [payload, signature, extra] = token.split(".");
  if (
    !payload ||
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !signature ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
    extra !== undefined
  ) {
    return null;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    decoded === null ||
    typeof decoded !== "object" ||
    !("userId" in decoded) ||
    !("expiresAt" in decoded) ||
    typeof decoded.userId !== "string" ||
    !/^\d+$/.test(decoded.userId) ||
    typeof decoded.expiresAt !== "number" ||
    !Number.isSafeInteger(decoded.expiresAt) ||
    decoded.expiresAt <= Math.floor(now / 1000)
  ) {
    return null;
  }

  return { userId: decoded.userId, expiresAt: decoded.expiresAt };
}
