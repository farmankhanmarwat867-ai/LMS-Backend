const { verifyAccessToken } = require('../utils/generateToken');
const userRepository = require('../repositories/user.repository');
const { unauthorized } = require('../utils/apiResponse');

/**
 * Protect middleware — verifies JWT access token and attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return unauthorized(res, 'No token provided. Access denied.');

    const decoded = verifyAccessToken(token);

    const user = await userRepository.findById(decoded.id);
    if (!user) return unauthorized(res, 'User no longer exists.');
    if (!user.isActive) return unauthorized(res, 'Account is deactivated.');

    req.user = user;
    req.ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    req.userAgent = req.headers['user-agent'] || '';

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Access token expired. Please refresh.');
    if (err.name === 'JsonWebTokenError') return unauthorized(res, 'Invalid token.');
    return unauthorized(res, 'Authentication failed.');
  }
};

module.exports = { protect };
