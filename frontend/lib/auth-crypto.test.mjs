import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  hashPassword,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
  verifySessionToken,
} from "./auth-crypto.ts";

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("correct horse battery staple");

  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("incorrect password", hash), false);
  assert.equal(await verifyPassword("anything", "DEMO_ACCOUNT_NO_LOGIN"), false);
});

test("signed sessions reject tampering, another secret, and expired tokens", () => {
  const now = 1_800_000_000_000;
  const token = createSessionToken("42", "a".repeat(40), now);

  assert.deepEqual(verifySessionToken(token, "a".repeat(40), now), {
    userId: "42",
    expiresAt: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  assert.equal(verifySessionToken(token, "b".repeat(40), now), null);
  assert.equal(
    verifySessionToken(`${token.slice(0, -1)}x`, "a".repeat(40), now),
    null
  );
  assert.equal(
    verifySessionToken(
      token,
      "a".repeat(40),
      now + SESSION_MAX_AGE_SECONDS * 1000
    ),
    null
  );
});
