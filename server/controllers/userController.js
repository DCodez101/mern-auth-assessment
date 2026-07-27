import User from '../models/User.js';

// GET /api/users/me
// Protected route — req.userId is attached by authMiddleware after verifying
// the access token.
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};
