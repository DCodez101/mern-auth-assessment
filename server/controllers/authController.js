import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_TOKEN_EXPIRY_MS,
} from '../utils/generateTokens.js';

// Shared cookie options for the refresh token cookie.
// httpOnly -> JS on the frontend can never read it (mitigates XSS token theft)
// secure   -> only sent over HTTPS in production
// sameSite -> 'lax' is enough here since this is a same-site app flow;
//             'none' + secure would be required for cross-site cookie use.
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: '/api/auth', // only sent to auth endpoints that need it
};

// Persists a new refresh token in the DB and sets it as an httpOnly cookie.
const issueRefreshToken = async (res, userId) => {
  const token = signRefreshToken(userId);
  const decoded = jwt.decode(token);
  await RefreshToken.create({
    user: userId,
    token,
    expiresAt: new Date(decoded.exp * 1000),
  });
  res.cookie('refreshToken', token, refreshCookieOptions);
  return token;
};

// POST /api/auth/signup
export const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({ name, email, password });

    const accessToken = signAccessToken(user._id);
    await issueRefreshToken(res, user._id);

    return res.status(201).json({
      message: 'Account created successfully',
      user: user.toSafeObject(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Explicitly select password since the schema hides it by default.
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(user._id);
    await issueRefreshToken(res, user._id);

    return res.status(200).json({
      message: 'Logged in successfully',
      user: user.toSafeObject(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
// Reads the refresh token from the httpOnly cookie, validates it against the
// DB record (not just the JWT signature), rotates it, and issues a fresh
// access token. Rotation + DB lookup lets us detect reuse of an already
// rotated/revoked token, which is a signal of theft — if that happens we
// revoke the entire token family for that user.
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      res.clearCookie('refreshToken', refreshCookieOptions);
      return res.status(401).json({ message: 'Refresh token invalid or expired' });
    }

    const stored = await RefreshToken.findOne({ token });

    if (!stored || stored.revokedAt) {
      // Token not found, or found but already revoked/rotated -> reuse detected.
      // Revoke every outstanding token for this user to kill all sessions.
      await RefreshToken.updateMany(
        { user: decoded.sub, revokedAt: null },
        { revokedAt: new Date() }
      );
      res.clearCookie('refreshToken', refreshCookieOptions);
      return res.status(401).json({ message: 'Session invalid, please log in again' });
    }

    // Rotate: revoke the old token, issue a brand new one.
    stored.revokedAt = new Date();
    await stored.save();

    const accessToken = signAccessToken(decoded.sub);
    await issueRefreshToken(res, decoded.sub);

    return res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await RefreshToken.deleteOne({ token });
    }
    res.clearCookie('refreshToken', refreshCookieOptions);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
