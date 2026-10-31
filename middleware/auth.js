const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = { id: jwt.verify(token, process.env.JWT_SECRET).id };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Session expired, log in again' });
  }
};
