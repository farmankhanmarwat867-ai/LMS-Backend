const BaseRepository = require('./base.repository');
const RefreshToken = require('../models/RefreshToken');
const SessionLog = require('../models/SessionLog');

class AuthRepository extends BaseRepository {
  constructor() {
    super(RefreshToken);
  }

  // ── Refresh Tokens ──────────────────────────────────────────────

  async createRefreshToken(data) {
    return RefreshToken.create(data);
  }

  async findRefreshToken(token) {
    return RefreshToken.findOne({ token, isRevoked: false });
  }

  async revokeRefreshToken(token) {
    return RefreshToken.findOneAndUpdate({ token }, { isRevoked: true }, { new: true });
  }

  async revokeAllUserTokens(userId) {
    return RefreshToken.updateMany({ userId }, { isRevoked: true });
  }

  // ── Session Logs ────────────────────────────────────────────────

  async createSession(data) {
    return SessionLog.create(data);
  }

  async closeSession(userId) {
    return SessionLog.findOneAndUpdate(
      { userId, isActive: true },
      { logoutAt: new Date(), isActive: false },
      { new: true, sort: { loginAt: -1 } }
    );
  }

  async getActiveSessions(userId) {
    return SessionLog.find({ userId, isActive: true }).sort({ loginAt: -1 });
  }
}

module.exports = new AuthRepository();
