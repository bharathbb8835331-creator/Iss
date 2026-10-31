const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { brief } = require('../utils/serialize');

router.use(auth);

// inbox: one row per person, latest message + unread count
router.get('/inbox', async (req, res) => {
  const me = req.user.id;
  const msgs = await Message.find({ $or: [{ from: me }, { to: me }] })
    .sort({ createdAt: -1 }).limit(1000)
    .populate('from', 'username name photo').populate('to', 'username name photo');

  const map = new Map();
  for (const m of msgs) {
    const other = m.from._id.equals(me) ? m.to : m.from;
    const key = String(other._id);
    if (!map.has(key)) map.set(key, { user: brief(other), lastMessage: m.text, lastFromMe: m.from._id.equals(me), lastAt: m.createdAt, unread: 0 });
    if (m.to._id.equals(me) && !m.read) map.get(key).unread++;
  }
  res.json([...map.values()]);
});

// conversation with one person (also marks their messages as read)
router.get('/:username', async (req, res) => {
  const other = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!other) return res.status(404).json({ error: 'User not found' });
  const me = req.user.id;
  await Message.updateMany({ from: other._id, to: me, read: false }, { read: true });
  const msgs = await Message.find({ $or: [{ from: me, to: other._id }, { from: other._id, to: me }] })
    .sort({ createdAt: 1 }).limit(500);
  res.json(msgs.map(m => ({ id: m._id, text: m.text, mine: m.from.equals(me), createdAt: m.createdAt })));
});

// send a message
router.post('/:username', async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Message is empty' });
  const other = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!other) return res.status(404).json({ error: 'User not found' });
  if (other._id.equals(req.user.id)) return res.status(400).json({ error: "You can't message yourself" });
  const m = await Message.create({ from: req.user.id, to: other._id, text });
  res.status(201).json({ id: m._id, text: m.text, mine: true, createdAt: m.createdAt });
});

module.exports = router;
