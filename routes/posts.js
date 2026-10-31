const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { postOut, POPULATE } = require('../utils/serialize');

router.use(auth);

const list = async (filter, me, limit = 50) =>
  (await Post.find(filter).sort({ createdAt: -1 }).limit(limit).populate(POPULATE)).map(p => postOut(p, me));

// create a post or reel (photo / video upload)
router.post('/', upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please select a photo or video' });
  const post = await Post.create({
    user: req.user.id,
    type: req.body.type === 'reel' ? 'reel' : 'post',
    mediaUrl: '/uploads/' + req.file.filename,
    isVideo: req.file.mimetype.startsWith('video/'),
    caption: String(req.body.caption || '')
  });
  await post.populate(POPULATE);
  res.status(201).json(postOut(post, req.user.id));
});

// home feed: posts from people I follow + mine
router.get('/feed', async (req, res) => {
  const meDoc = await User.findById(req.user.id);
  res.json(await list({ user: { $in: [...meDoc.following, meDoc._id] }, type: 'post' }, req.user.id));
});

router.get('/explore', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { caption: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
  res.json(await list(filter, req.user.id, 60));
});

router.get('/reels', async (req, res) => res.json(await list({ type: 'reel' }, req.user.id)));
router.get('/saved', async (req, res) => res.json(await list({ saves: req.user.id }, req.user.id)));

router.get('/user/:username', async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!u) return res.status(404).json({ error: 'User not found' });
  const filter = { user: u._id };
  if (req.query.type) filter.type = req.query.type;
  res.json(await list(filter, req.user.id, 100));
});

// like / unlike (toggle)
router.post('/:id/like', async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Post not found' });
  const liked = p.likes.some(i => i.equals(req.user.id));
  await Post.updateOne({ _id: p._id }, liked ? { $pull: { likes: req.user.id } } : { $addToSet: { likes: req.user.id } });
  res.json({ liked: !liked, likesCount: p.likes.length + (liked ? -1 : 1) });
});

// save / unsave (toggle)
router.post('/:id/save', async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Post not found' });
  const saved = p.saves.some(i => i.equals(req.user.id));
  await Post.updateOne({ _id: p._id }, saved ? { $pull: { saves: req.user.id } } : { $addToSet: { saves: req.user.id } });
  res.json({ saved: !saved });
});

router.post('/:id/comments', async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Post not found' });
  p.comments.push({ user: req.user.id, text });
  await p.save();
  await p.populate(POPULATE);
  res.status(201).json(postOut(p, req.user.id));
});

router.delete('/:id', async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Post not found' });
  if (!p.user.equals(req.user.id)) return res.status(403).json({ error: 'Not your post' });
  if (p.product) await Product.deleteOne({ _id: p.product });
  await p.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
