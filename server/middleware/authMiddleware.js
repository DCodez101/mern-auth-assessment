import jwt from 'jsonwebtoken';

// Verifies the access token sent in the Authorization header as
// "Bearer <token>". On success attaches req.userId for downstream handlers.
// Deliberately returns 401 (not 403) on any failure so the frontend's axios
// interceptor knows to attempt a silent /refresh + retry.
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No access token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = decoded.sub;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Access token invalid or expired' });
  }
};

export default authMiddleware;
