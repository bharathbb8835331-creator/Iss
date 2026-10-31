const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { brief } = require('../utils/serialize');

router.use(auth);
const rx = q => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// search people by username or name
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({ _id: { $ne: req.user.id }, $or: [{ username: rx(q) }, { name: rx(q) }] }).limit(20);
  res.json(users.map(brief));
});

// suggestions: people I don't follow yet
router.get('/suggestions', async (req, res) => {
  const meDoc = await User.findById(req.user.id);
  const users = await User.find({ _id: { $nin: [...meDoc.following, meDoc._id] } }).sort({ createdAt: -1 }).limit(10);
  res.json(users.map(brief));
});

// edit my profile (name, bio, photo)
router.put('/me', upload.single('photo'), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) return res.status(400).json({ error: "Name can't be empty" });
    user.name = String(req.body.name).trim();
  }
  if (req.body.bio !== undefined) user.bio = String(req.body.bio).trim();
  if (req.file) user.photo = '/uploads/' + req.file.filename;
  await user.save();
  res.json({ id: user._id, username: user.username, name: user.name, bio: user.bio, photo: user.photo });
});

// profile page data
router.get('/:username', async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({
    ...brief(u), bio: u.bio,
    postsCount: await Post.countDocuments({ user: u._id }),
    followersCount: u.followers.length,
    followingCount: u.following.length,
    isMe: u._id.equals(req.user.id),
    isFollowing: u.followers.some(i => i.equals(req.user.id))
  });
});

// follow / unfollow (toggle)
router.post('/:username/follow', async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target._id.equals(req.user.id)) return res.status(400).json({ error: "You can't follow yourself" });
  const already = target.followers.some(i => i.equals(req.user.id));
  const op = already ? '$pull' : '$addToSet';
  await User.updateOne({ _id: target._id }, { [op]: { followers: req.user.id } });
  await User.updateOne({ _id: req.user.id }, { [op]: { following: target._id } });
  res.json({ isFollowing: !already, followersCount: target.followers.length + (already ? -1 : 1) });
});

router.get('/:username/followers', async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() }).populate('followers', 'username name photo');
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u.followers.map(brief));
});

router.get('/:username/following', async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() }).populate('following', 'username name photo');
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u.following.map(brief));
});

module.exports = router;
