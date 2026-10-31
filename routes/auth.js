const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const me = u => ({ id: u._id, username: u.username, name: u.name, phone: u.phone, bio: u.bio, photo: u.photo });
const fail = (res, code, error) => res.status(code).json({ error });

// Step 1 of register: phone number
router.post('/check-phone', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!/^\d{10}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
  if (await User.exists({ phone })) return fail(res, 409, 'This number is already registered. Log in instead.');
  res.json({ ok: true });
});

// Step 2 of register: name, username, password
router.post('/register', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!/^\d{10}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
  if (!name) return fail(res, 400, 'Enter your name');
  if (!/^[a-z0-9._]{3,20}$/.test(username)) return fail(res, 400, 'Username: 3-20 letters, numbers, . or _');
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  if (await User.exists({ phone })) return fail(res, 409, 'This number is already registered');
  if (await User.exists({ username })) return fail(res, 409, 'Username already taken');

  const user = await User.create({ phone, name, username, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: me(user) });
});

// login with username OR phone
router.post('/login', async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!id || !password) return fail(res, 400, 'Enter your username/phone and password');
  const user = await User.findOne({ $or: [{ username: id }, { phone: id }] });
  if (!user) return fail(res, 404, 'No account found. Create a new account.');
  if (!(await bcrypt.compare(password, user.passwordHash))) return fail(res, 401, 'Incorrect password');
  res.json({ token: sign(user), user: me(user) });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return fail(res, 401, 'Account not found');
  res.json({ user: me(user) });
});

module.exports = router;
