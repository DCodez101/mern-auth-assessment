import mongoose from 'mongoose';

// Each document represents one issued refresh token. Storing them server-side
// lets us invalidate a single session (logout), detect reuse of a rotated-out
// token (theft signal), and revoke all sessions for a user if needed.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Set when this token is rotated out for a newer one, or on logout.
    // A non-null revokedAt on a token that is still presented by a client
    // is a strong signal of token theft/reuse.
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// MongoDB TTL index: automatically deletes documents once expiresAt passes,
// so the collection doesn't grow unbounded with dead tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
