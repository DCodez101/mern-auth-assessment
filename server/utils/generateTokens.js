import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Signs a short-lived access token. Carries only the minimal claim needed
// (user id) — never put secrets or passwords in a JWT payload.
export const signAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });
};

// Signs a long-lived refresh token. Kept separate from the access token
// secret so compromising one does not compromise the other.
export const signRefreshToken = (userId) => {
  // jti (JWT ID) is a random unique value per token. Without it, two refresh
  // tokens signed for the same user in the same second would be byte-for-byte
  // identical (payload + iat + exp all match), which collides with the
  // `unique: true` constraint on RefreshToken.token in MongoDB. This can
  // genuinely happen in dev when React StrictMode double-fires an effect,
  // or in prod if a client ever fires two refresh calls back to back.
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  });
};

// Convenience: mirrors the cookie maxAge (ms) so callers don't hardcode it.
export const REFRESH_TOKEN_EXPIRY_MS = Number(
  process.env.REFRESH_TOKEN_EXPIRY_MS || 7 * 24 * 60 * 60 * 1000
);