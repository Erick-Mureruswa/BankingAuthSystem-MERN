import mongoose from 'mongoose';

const oauthTokenSchema = new mongoose.Schema(
  {
    accessToken: { type: String, required: true, unique: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshToken: { type: String, unique: true, sparse: true },
    refreshTokenExpiresAt: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, required: true },
    scope: [{ type: String }],
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index: automatically remove expired tokens after 1 day
oauthTokenSchema.index({ accessTokenExpiresAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('OAuthToken', oauthTokenSchema);
